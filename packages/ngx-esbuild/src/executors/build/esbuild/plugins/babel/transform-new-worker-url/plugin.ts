import { NodePath, PluginObj } from '@babel/core';
import * as t from '@babel/types';
import assert from 'node:assert';

export function shouldTransformNewWorkerUrlPlugin(contents: string): boolean {
  return (
    contents.includes('new URL') &&
    contents.includes('import.meta.url') &&
    (contents.includes('new SharedWorker') || contents.includes('new Worker'))
  );
}

/**
 * Babel plugin to replace new URL statements with a require statement
 * Input: `new URL('./shared-worker.worker', import.meta.url)`
 * Output: `require('./shared-worker.worker?worker-url')`
 *
 * This is just a stopgap until esbuild adds support for this natively: https://github.com/evanw/esbuild/pull/2508
 *
 */
export function transformNewWorkerUrlPlugin(
  pluginArgs: object,
  options: { queryString: string }
): PluginObj {
  return {
    name: 'transform-new-worker-url',
    visitor: {
      NewExpression(path: NodePath<t.NewExpression>) {
        if (isImportMetaUrl(path) && parentIsWorker(path)) {
          replaceUrlWithRequire(path, options.queryString);
        }
      },
    },
  };
}

/**
 * Returns true if the path is a new URL statement with import.meta.url as the second argument
 * @param path
 */
function isImportMetaUrl(path: NodePath<t.NewExpression>): boolean {
  return (
    path.node.callee.type === 'Identifier' &&
    path.node.callee.name === 'URL' &&
    path.node.arguments.length === 2 &&
    path.node.arguments[1].type === 'MemberExpression' &&
    path.node.arguments[1].object.type === 'MetaProperty' &&
    path.node.arguments[1].object.meta.type === 'Identifier' &&
    path.node.arguments[1].object.meta.name === 'import' &&
    path.node.arguments[1].object.property.type === 'Identifier' &&
    path.node.arguments[1].object.property.name === 'meta' &&
    path.node.arguments[1].property.type === 'Identifier' &&
    path.node.arguments[1].property.name === 'url'
  );
}

/**
 * Returns true if the new URL statement is passed to a `new Worker` or `new SharedWorker` statement
 * @param path
 */
function parentIsWorker(path: NodePath<t.NewExpression>): boolean {
  return (
    path.parentPath.node.type === 'NewExpression' &&
    path.parentPath.node.callee.type === 'Identifier' &&
    ['Worker', 'SharedWorker'].includes(path.parentPath.node.callee.name)
  );
}

/**
 * Replaces the new URL statement with a require statement that will be picked up by the esbuild worker plugin
 * @param path
 * @param queryString
 */
function replaceUrlWithRequire(
  path: NodePath<t.NewExpression>,
  queryString: string
): NodePath<t.CallExpression> {
  const url = path.node.arguments[0];
  assert(
    url.type === 'StringLiteral',
    'Expected first argument to be a string literal'
  );
  return path.replaceWith(
    t.callExpression(t.identifier('require'), [
      t.stringLiteral(url.value + queryString),
    ])
  )[0];
}
