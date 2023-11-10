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
    args?: t.Literal[];
  }>;
}>;

/**
 * Gets the constructor parameter decorators for an injectable class that will be set on the ctorParameters property
 * @param constructor
 */
function getConstructorParameterDecorators(
  constructor: NodePath<t.ClassMethod>
) {
  const ctorParameters: CtorParameters = [];

  for (const constructorParam of constructor.get('params')) {
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

    const injectDecorator = getInjectDecorator(decorators);
    const injectFlagDecorators = getInjectFlagDecorators(decorators);

    if (injectDecorator) {
      // uses @Inject() decorator
      assert(injectDecorator.node.expression.type === 'CallExpression');
      const type = injectDecorator.node.expression.arguments[0].type;
      assert(type === 'Identifier' || type === 'StringLiteral');
      ctorParameters.push({
        type: injectDecorator.node.expression.arguments[0],
        decorators: injectFlagDecorators,
      });
      injectDecorator.remove(); // TODO - move this mutation out of this method
    } else if (
      // Uses type annotation for DI
      param.node.typeAnnotation?.type === 'TSTypeAnnotation' &&
      param.node.typeAnnotation.typeAnnotation.type === 'TSTypeReference' &&
      param.node.typeAnnotation.typeAnnotation.typeName.type === 'Identifier'
    ) {
      const type = param.node.typeAnnotation.typeAnnotation.typeName.name;
      ctorParameters.push({
        type: t.identifier(type),
        decorators: injectFlagDecorators,
      });
    } else if (
      isAttributeDecorator(decorators) &&
      // Typing of Attribute decorator only accepts a single string as its arguments
      decorators[0].node?.expression?.type === 'CallExpression' &&
      decorators[0].node.expression.arguments.length === 1 &&
      decorators[0].node.expression.arguments[0].type === 'StringLiteral'
    ) {
      ctorParameters.push({
        type: t.identifier('String'), // Attribute decorator only accepts a single string as its first argument
        decorators: [
          {
            type: 'Attribute',
            args: [decorators[0].node.expression.arguments[0]],
          },
        ],
      });
      decorators[0].remove(); // TODO - move this mutation out of this method
    } else {
      throw new Error(
        `Could not get type from constructor param: ${param.node.name}`
      );
    }
  }

  return ctorParameters;
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
 * Gets the @Inject decorator from a list of constructor decorators
 * @param decorators
 */
function getInjectDecorator(
  decorators: NodePath<t.Decorator>[] | undefined | null
): NodePath<t.Decorator> | undefined {
  return decorators?.find((decorator) => {
    return (
      decorator.node?.expression?.type === 'CallExpression' &&
      decorator.node.expression.callee.type === 'Identifier' &&
      decorator.node.expression.callee.name === 'Inject'
    );
  });
}

/**
 * Gets the @SkipSelf, @Host and @Optional decorators from a list of constructor decorators
 * @param decorators
 */
function getInjectFlagDecorators(
  decorators: NodePath<t.Decorator>[]
): Array<{ type: string }> {
  const result: ReturnType<typeof getInjectFlagDecorators> = [];
  for (const decorator of Array.from(decorators)) {
    if (
      decorator.node?.expression?.type === 'CallExpression' &&
      decorator.node.expression.callee.type === 'Identifier' &&
      ['SkipSelf', 'Host', 'Optional'].includes(
        decorator.node.expression.callee.name
      )
    ) {
      result.push({ type: decorator.node.expression.callee.name });
      decorator.remove(); // TODO - move this mutation out of this method
    }
  }
  return result;
}

/**
 * Returns true
 * @param decorators
 */
function isAttributeDecorator(decorators: NodePath<t.Decorator>[]): boolean {
  return (
    decorators.length === 1 &&
    decorators[0].node?.expression?.type === 'CallExpression' &&
    decorators[0].node.expression.callee.type === 'Identifier' &&
    decorators[0].node.expression.callee.name === 'Attribute'
  );
}
