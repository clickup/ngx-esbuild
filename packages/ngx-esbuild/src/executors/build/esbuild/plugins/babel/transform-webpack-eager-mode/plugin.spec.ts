import { pluginTester } from 'babel-plugin-tester';

import { transformWebpackEagerModePlugin } from './plugin';

pluginTester({
  plugin: transformWebpackEagerModePlugin,
  pluginName: 'transform-webpack-eager-mode',
  babelOptions: {
    plugins: ['@babel/plugin-syntax-typescript'],
  },
  tests: {
    'Should transform string paths': {
      code: `const foo = import(/* webpackMode: 'eager' */ 'zone.js/dist/zone');`,
      output: `
        const foo = Promise.resolve(
          require(/* webpackMode: 'eager' */ 'zone.js/dist/zone')
        );
      `,
    },
    'Should transform template literal': {
      code: `const foo = import(/* webpackMode: 'eager' */ \`zone.js/dist/zone\`);`,
      output: `
        const foo = Promise.resolve(
          require(/* webpackMode: 'eager' */ \`zone.js/dist/zone\`)
        );
      `,
    },
    'Should not do anything when there is no webpack eager mode comment': {
      code: `const foo = import('zone.js/dist/zone');`,
      output: `const foo = import('zone.js/dist/zone');`,
    },
  },
});
