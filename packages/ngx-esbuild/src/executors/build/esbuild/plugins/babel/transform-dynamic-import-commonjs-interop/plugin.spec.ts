import { pluginTester } from 'babel-plugin-tester';

import { transformDynamicImportCommonjsInteropPlugin } from './plugin';

pluginTester({
  plugin: transformDynamicImportCommonjsInteropPlugin,
  pluginName: 'transform-dynamic-import-commonjs-interop',
  babelOptions: {
    plugins: [
      '@babel/plugin-syntax-typescript',
      ['@babel/plugin-syntax-decorators', { legacy: true }],
    ],
  },
  tests: {
    'Should handle commonjs interop for node_modules': {
      code: `console.log(import('foo'));`,
      output: `
        console.log(
          import('foo').then((m) => ({
            ...m.default,
            ...m,
          }))
        );`,
    },
    'Should ignore local source paths for regular strings': {
      code: `console.log(import('./foo'));`,
      output: `console.log(import('./foo'));`,
    },
    'Should ignore local source paths for template strings': {
      code: `console.log(import(\`./foo\`));`,
      output: `console.log(import(\`./foo\`));`,
    },
    'Should handle existing then expressions on the dynamic import': {
      code: `console.log(import('foo').then(console.log));`,
      output: `
        console.log(
          import('foo')
            .then((m) => ({
              ...m.default,
              ...m,
            }))
            .then(console.log)
        );`,
    },
  },
});
