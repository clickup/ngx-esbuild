import { PluginObj } from '@babel/core';
import * as t from '@babel/types';

const templateUrl = 'templateUrl';
const styleUrls = 'styleUrls';

export function shouldTransformInlineAngularComponentResourcesPlugin(
  contents: string
): boolean {
  return contents.includes(templateUrl) || contents.includes(styleUrls);
}

/**
 * Babel plugin to replace angular component templateUrls and styleUrls with inline requires so they can be processed by esbuild
 * Inspired by https://www.npmjs.com/package/angular2-template-loader
 * @param pluginArgs
 * @param options
 */
export function transformInlineAngularComponentResourcesPlugin(
  pluginArgs: object,
  options: { queryString: string }
): PluginObj {
  return {
    name: 'transform-inline-angular-component-resources',
    visitor: {
      ClassDeclaration(path) {
        const componentDecorator = path.node.decorators?.find((decorator) => {
          const expression = decorator.expression;
          if (
            expression.type === 'CallExpression' &&
            expression.callee.type === 'Identifier'
          ) {
            const decoratorName = expression.callee.name;
            return decoratorName === 'Component';
          }
          return undefined;
        });
        if (
          componentDecorator?.expression.type === 'CallExpression' &&
          componentDecorator.expression.arguments[0]?.type ===
            'ObjectExpression'
        ) {
          const props = componentDecorator.expression.arguments[0].properties;
          props.forEach((prop, propIndex) => {
            if (
              prop.type === 'ObjectProperty' &&
              prop.key.type === 'Identifier'
            ) {
              if (prop.key.name === templateUrl) {
                // replace `templateUrl: './foo.component.html'` with `template: require('./foo.component.html')`
                prop.key.name = 'template';
                const normalizedTemplateUrl = normalizeComponentResourceUrl(
                  getStringValue(prop.value)
                );
                prop.value = t.callExpression(t.identifier('require'), [
                  t.stringLiteral(
                    `${normalizedTemplateUrl}${options.queryString}`
                  ),
                ]);
              } else if (
                prop.value.type === 'ArrayExpression' &&
                prop.key.name === styleUrls
              ) {
                // replace `styleUrls: ['./foo.component.scss']` with `styles: [require('./foo.component.scss').default]`

                const existingStylesArray = getExistingStylesArray(props);

                prop.value.elements.forEach((element, index) => {
                  if (element && prop.value.type === 'ArrayExpression') {
                    const styleUrl = normalizeComponentResourceUrl(
                      getStringValue(element)
                    );
                    const style = t.memberExpression(
                      t.callExpression(t.identifier('require'), [
                        t.stringLiteral(`${styleUrl}${options.queryString}`),
                      ]),
                      t.identifier('default')
                    );
                    if (existingStylesArray) {
                      existingStylesArray.elements.unshift(style);
                    } else {
                      prop.value.elements[index] = style;
                    }
                  }
                });

                if (existingStylesArray) {
                  // remove styleUrls property as styles already exists
                  props.splice(propIndex, 1);
                } else {
                  // rename styleUrls to styles
                  prop.key.name = 'styles';
                }
              }
            }
          });
        }
      },
    },
  };
}

function getStringValue(
  node: t.Expression | t.PatternLike | t.SpreadElement
): string {
  if (node.type === 'StringLiteral') {
    return node.value;
  } else if (
    node.type === 'TemplateLiteral' &&
    node.quasis.length === 1 &&
    node.quasis[0].type === 'TemplateElement'
  ) {
    return node.quasis[0].value.raw;
  }
  throw new Error(`Could not get string value for node type ${node.type}`);
}

function getExistingStylesArray(
  props: Array<t.ObjectProperty | t.ObjectMethod | t.SpreadElement>
): t.ArrayExpression | undefined {
  const stylesProp = props.find(
    (prop) =>
      prop.type === 'ObjectProperty' &&
      prop.key.type === 'Identifier' &&
      prop.key.name === 'styles'
  );
  if (
    stylesProp &&
    stylesProp.type === 'ObjectProperty' &&
    stylesProp.value.type === 'ArrayExpression'
  ) {
    return stylesProp.value;
  }
  return undefined;
}

function normalizeComponentResourceUrl(url: string): string {
  return !url.startsWith('.') ? './' + url : url;
}
