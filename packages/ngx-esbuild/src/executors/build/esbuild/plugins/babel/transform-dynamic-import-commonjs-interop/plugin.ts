import { NodePath, PluginObj } from '@babel/core';
import * as t from '@babel/types';
import assert from 'node:assert';

export function shouldTransformDynamicImportCommonjsInteropPlugin(
  contents: string
): boolean {
  return contents.includes('import(');
}

/**
 * Babel plugin to transform all dynamic imports to use commonjs interop.
 * This is to workaround this issue: https://github.com/evanw/esbuild/issues/3245
 */
export function transformDynamicImportCommonjsInteropPlugin(): PluginObj {
  return {
    name: 'transform-dynamic-import-commonjs-interop',
    visitor: {
      Import(path: NodePath<t.Import>) {
        assert(
          path.parentPath.node.type === 'CallExpression',
          `Expected parent node to be a CallExpression, but got ${path.parentPath.node.type}`
        );

        const importPath = getImportPath(path.parentPath.node);
        if (!importPath || isLocalImport(importPath)) {
          return;
        }

        path.parentPath.replaceWith(getReplacementNode(path.parentPath.node));

        path.parentPath.skip(); // prevent traversing the newly inserted node
      },
    },
  };
}

/**
 * Returns true if the import is from the source code and not from a node_module.
 * @param importPath
 */
function isLocalImport(importPath: string): boolean {
  return importPath.startsWith('.');
}

/**
 * Gets the import path from the dynamic import call expression.
 * e.g. import('foo') -> foo
 *
 * @param node
 */
function getImportPath(node: t.CallExpression): string | undefined {
  if (node.arguments[0].type === 'StringLiteral') {
    return node.arguments[0].value;
  } else if (node.arguments[0].type === 'TemplateLiteral') {
    return node.arguments[0].quasis[0].value.raw;
  }
  return undefined;
}

/**
 * Wraps a dynamic import expression to use commonjs interop.
 * e.g. import('foo') -> import('foo').then((m) => ({ ...m.default, ...m }))
 * @param importExpression
 */
function getReplacementNode(
  importExpression: t.CallExpression
): t.CallExpression {
  return t.callExpression(
    t.memberExpression(
      t.cloneNode(importExpression, true),
      t.identifier('then')
    ),
    [
      t.arrowFunctionExpression(
        [t.identifier('m')],
        t.objectExpression([
          t.spreadElement(
            t.memberExpression(t.identifier('m'), t.identifier('default'))
          ),
          t.spreadElement(t.identifier('m')),
        ])
      ),
    ]
  );
}
