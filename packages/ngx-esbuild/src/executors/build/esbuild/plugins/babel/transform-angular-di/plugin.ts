import { NodePath, PluginObj } from '@babel/core';
import * as t from '@babel/types';
import assert from 'node:assert';

const angularInjectables = [
  'Component',
  'Directive',
  'Pipe',
  'Injectable',
  'NgModule',
];

export function shouldTransformAngularComponentDIPlugin(
  contents: string
): boolean {
  return angularInjectables.some((injectable) => {
    return contents.includes(`@${injectable}`);
  });
}

/**
 * This plugin adds a static `ctorParameters` property to all injectable classes with the DI tokens in it to match the behaviour of the angular CLI in JiT mode
 *
 * Sample input:
 * ```
 * @Injectable()
 * class MyService {
 *  constructor(private foo: Foo) {}
 * }
 * ```
 *
 * Sample output:
 * ```
 * @Injectable()
 * class MyService {
 *   static ctorParameters = () => [{
 *     type: Foo,
 *   }];
 *   constructor(private foo: Foo) {}
 * }
 * ```
 */
export function transformAngularDIPlugin(): PluginObj {
  return {
    name: 'transform-angular-di',
    visitor: {
      ClassDeclaration(classDeclaration) {
        if (!isClassInjectable(classDeclaration)) {
          return;
        }

        const constructor = getClassConstructor(classDeclaration);
        if (!constructor) {
          return;
        }

        const ctorParameters = getConstructorParameterDecorators(constructor);
        if (ctorParameters.length > 0) {
          addCtorParametersStaticProperty(classDeclaration, ctorParameters);
        }
      },
    },
  };
}

/**
 * Checks if the class is decorated with an angular injectable decorator
 * @param classDeclaration
 */
function isClassInjectable(
  classDeclaration: NodePath<t.ClassDeclaration>
): boolean {
  const decorators = classDeclaration.node.decorators;
  return (
    decorators?.some((decorator) => {
      const expression = decorator.expression;
      if (
        expression.type === 'CallExpression' &&
        expression.callee.type === 'Identifier'
      ) {
        const decoratorName = expression.callee.name;
        return angularInjectables.includes(decoratorName);
      }
      return undefined;
    }) ?? false
  );
}

/**
 * Gets the constructor of the class
 * @param classDeclaration
 */
function getClassConstructor(
  classDeclaration: NodePath<t.ClassDeclaration>
): NodePath<t.ClassMethod> | undefined {
  for (const item of classDeclaration.get('body.body') as NodePath<t.Node>[]) {
    if (
      item.node.type === 'ClassMethod' &&
      item.node.key.type === 'Identifier' &&
      item.node.key.name === 'constructor'
    ) {
      return item as NodePath<t.ClassMethod>;
    }
  }
  return undefined;
}

type CtorParameters = Array<{
  type: t.Identifier | t.StringLiteral;
  decorators: Array<{
    type: string;
    args?: t.Expression[];
  }>;
}>;

/**
 * Gets the constructor parameter decorators for an injectable class that will be set on the ctorParameters property
 * @param constructor
 */
function getConstructorParameterDecorators(
  constructor: NodePath<t.ClassMethod>
): CtorParameters {
  return Array.from(constructor.get('params')).map((constructorParam) => {
    const param = getParameterIdentifier(constructorParam);
    // workaround bug with babel printer when using parameter decorators + a default value
    if (
      constructorParam.node.type === 'AssignmentPattern' &&
      constructorParam.node.left.type === 'Identifier'
    ) {
      // TODO - move this mutation out of this method + refactor to use node path babel transformation API
      constructorParam.node.decorators = param.node.decorators;
    }

    const decorators = (
      constructorParam.node.decorators
        ? constructorParam.get('decorators')
        : param.get('decorators')
    ) as NodePath<t.Decorator>[];
    const angularParameterDecorators =
      getAngularParameterDecorators(decorators);
    const hasInjectDecorator = getHasInjectDecorator(
      angularParameterDecorators
    );
    // If there is an @Inject decorator, then we don't need to add the type to the ctorParameters as it will get overridden by the Inject decorators value
    // Otherwise we run into issues where type references can be preserved at runtime which will then cause the app to not compile with esbuild
    const type = hasInjectDecorator
      ? 'undefined'
      : getTypeIdentifierName(param) ??
        getTypePrimitiveName(param) ??
        'undefined';
    const ctorParameterDecorators = getCtorParameterDecorators(
      angularParameterDecorators
    );

    angularParameterDecorators.forEach((node) => {
      node.remove(); // TODO - move this mutation out of this method
    });

    return {
      type: t.identifier(type),
      decorators: ctorParameterDecorators,
    };
  });
}

/**
 * Adds the static ctorParameters property to the class
 * @param classDeclaration
 * @param ctorParameters
 */
function addCtorParametersStaticProperty(
  classDeclaration: NodePath<t.ClassDeclaration>,
  ctorParameters: CtorParameters
) {
  classDeclaration.get('body').unshiftContainer(
    'body',
    t.classProperty(
      t.identifier('ctorParameters'),
      t.arrowFunctionExpression(
        [],
        t.arrayExpression(
          ctorParameters.map((param) => {
            return t.objectExpression([
              t.objectProperty(t.identifier('type'), param.type),
              ...(param.decorators.length > 0
                ? [
                    t.objectProperty(
                      t.identifier('decorators'),
                      t.arrayExpression(
                        param.decorators.map((d) => {
                          return t.objectExpression([
                            t.objectProperty(
                              t.identifier('type'),
                              t.identifier(d.type)
                            ),
                            ...(d.args
                              ? [
                                  t.objectProperty(
                                    t.identifier('args'),
                                    t.arrayExpression(d.args)
                                  ),
                                ]
                              : []),
                          ]);
                        })
                      )
                    ),
                  ]
                : []),
            ]);
          })
        )
      ),
      undefined,
      undefined,
      false,
      true
    )
  );
}

/**
 * Gets the identifier from a constructor parameter
 * @param param
 */
function getParameterIdentifier(
  param: NodePath<t.ClassMethod['params'][0]>
): NodePath<t.Identifier> {
  const innerParam =
    param.node.type === 'TSParameterProperty' // has typescript private, protected, public modifier
      ? (param.get('parameter') as NodePath<t.TSParameterProperty['parameter']>)
      : param;
  if (innerParam.isIdentifier()) {
    return innerParam;
  } else if (
    // is an assignment pattern like `constructor(foo = 'bar') {`
    innerParam.node.type === 'AssignmentPattern' &&
    innerParam.node.left.type === 'Identifier'
  ) {
    return innerParam.get('left') as NodePath<t.Identifier>;
  }
  throw new Error(`Could not get parameter from node type: ${param.type}`);
}

/**
 * Returns all the angular parameter decorator nodes from a list of constructor decorators
 * e.g. returns the nodes for @Inject(), @SkipSelf() etc
 * @param decorators
 */
function getAngularParameterDecorators(
  decorators: NodePath<t.Decorator>[]
): NodePath<t.Decorator>[] {
  return Array.from(decorators).filter((decorator) => {
    return (
      decorator.node?.expression?.type === 'CallExpression' &&
      decorator.node.expression.callee.type === 'Identifier' &&
      ['Attribute', 'Host', 'Inject', 'Optional', 'Self', 'SkipSelf'].includes(
        decorator.node.expression.callee.name
      )
    );
  });
}

/**
 * Returns true if the constructor parameter has an @Inject decorator
 * @param decorators
 */
function getHasInjectDecorator(decorators: NodePath<t.Decorator>[]): boolean {
  return decorators.some((decorator) => {
    assert(decorator.node?.expression?.type === 'CallExpression');
    assert(decorator.node.expression.callee.type === 'Identifier');
    return decorator.node.expression.callee.name === 'Inject';
  });
}

/**
 * Extracts the decorator type and args from a list of constructor decorators
 * @param decorators
 */
function getCtorParameterDecorators(
  decorators: NodePath<t.Decorator>[]
): CtorParameters[0]['decorators'] {
  return decorators.map((decorator) => {
    assert(decorator.node?.expression?.type === 'CallExpression');
    assert(decorator.node.expression.callee.type === 'Identifier');
    return {
      type: decorator.node.expression.callee.name,
      args:
        decorator.node.expression.arguments.length > 0
          ? (decorator.node.expression.arguments as t.Expression[])
          : undefined,
    };
  });
}

/**
 * Gets the type identifier name from an identifer
 * e.g. returns `Foo` from `foo: Foo`
 * @param identifier
 */
function getTypeIdentifierName(
  identifier: NodePath<t.Identifier>
): string | undefined {
  if (
    identifier.node.typeAnnotation?.type === 'TSTypeAnnotation' &&
    identifier.node.typeAnnotation.typeAnnotation.type === 'TSTypeReference' &&
    identifier.node.typeAnnotation.typeAnnotation.typeName.type === 'Identifier'
  ) {
    return identifier.node.typeAnnotation.typeAnnotation.typeName.name;
  }
  return undefined;
}

/**
 * Gets the type primitive name from an identifer
 * e.g. returns `String` from `foo: string`
 * @param identifier
 */
function getTypePrimitiveName(
  identifier: NodePath<t.Identifier>
): string | undefined {
  const typeMapping = {
    TSStringKeyword: 'String',
    TSNumberKeyword: 'Number',
    TSBooleanKeyword: 'Boolean',
    TSObjectKeyword: 'Object',
    TSSymbolKeyword: 'Symbol',
  };
  if (
    identifier.node.typeAnnotation?.type === 'TSTypeAnnotation' &&
    identifier.node.typeAnnotation.typeAnnotation.type in typeMapping
  ) {
    return typeMapping[
      identifier.node.typeAnnotation.typeAnnotation
        .type as keyof typeof typeMapping
    ];
  }
  return undefined;
}
