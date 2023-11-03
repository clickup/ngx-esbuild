import { NodePath, PluginObj } from '@babel/core';
import * as t from '@babel/types';
import assert from 'node:assert';

const EAGER_MODE_COMMENT = "webpackMode: 'eager'";

export function shouldTransformWebpackEagerModePlugin(
  contents: string
): boolean {
  return contents.includes(EAGER_MODE_COMMENT);
}

/**
 * Babel plugin to `webpackMode: 'eager'` comments by transforming all dynamic imports to require statements
 */
export function transformWebpackEagerModePlugin(): PluginObj {
  return {
    name: 'transform-webpack-eager-mode',
    visitor: {
      Import(path: NodePath<t.Import>) {
        assert(
          path.parentPath.node.type === 'CallExpression',
          `Expected parent node to be a CallExpression, but got ${path.parentPath.node.type}`
        );

        if (!hasWebpackEagerModeComment(path.parentPath.node)) {
          return;
        }

        path.parentPath.replaceWith(getReplacementNode(path.parentPath.node));
      },
    },
  };
}

/**
 * Returns true if the the dynamic import expression has a leading `webpackMode: 'eager'` comment.
 * e.g. Returns true for `import(/* webpackMode: 'eager' *\/ 'zone.js/dist/zone')`
 * @param importCallExpression
 */
function hasWebpackEagerModeComment(
  importCallExpression: t.CallExpression
): boolean {
  const firstArg = importCallExpression.arguments[0];
  return Boolean(
    (firstArg.type === 'StringLiteral' ||
      firstArg.type === 'TemplateLiteral') &&
      firstArg.leadingComments?.some((comment) =>
        comment.value.includes(EAGER_MODE_COMMENT)
      )
  );
}

/**
 * Replaces a dynamic import expression with a async require statement.
 * e.g. `import('foo')` -> `Promise.resolve(require('foo'))`
 * @param importExpression
 */
function getReplacementNode(
  importExpression: t.CallExpression
): t.CallExpression {
  return t.callExpression(
    t.memberExpression(t.identifier('Promise'), t.identifier('resolve')),
    [t.callExpression(t.identifier('require'), [importExpression.arguments[0]])]
  );
}
