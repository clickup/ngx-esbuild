import { pluginTester } from 'babel-plugin-tester';

import { transformNewWorkerUrlPlugin } from './plugin';

pluginTester({
  plugin: transformNewWorkerUrlPlugin,
  pluginName: 'transform-new-worker-url',
  babelOptions: {
    plugins: ['@babel/plugin-syntax-typescript'],
  },
  pluginOptions: { queryString: '?worker-url' },
  tests: {
    'Should transform new url paths': {
      code: `
        const worker = new SharedWorker(new URL('./shared-worker.worker', import.meta.url));
      `,
      output: `
        const worker = new SharedWorker(require('./shared-worker.worker?worker-url'));
      `,
    },
    'Should preserve url paths without import.meta.url as the second argument':
      {
        code: `
          const worker = new SharedWorker(new URL('./shared-worker.worker'));
        `,
        output: `
          const worker = new SharedWorker(new URL('./shared-worker.worker'));
        `,
      },
    'Should preserve url paths not wrapped in a shared worker call': {
      code: `
          const url = new URL('./shared-worker.worker', import.meta.url);
        `,
      output: `
          const url = new URL('./shared-worker.worker', import.meta.url);
        `,
    },
  },
});
