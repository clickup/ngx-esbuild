import path from 'node:path';

import { compileFixture, getFixtureCwd } from './__fixtures__/compile-fixture';
import { babelPlugin } from './babel';
import { MemoryCache } from './utils/memory-cache';
import { workerPlugin } from './worker';

const workerUrlQueryString = '?worker-url';

describe('workerPlugin', () => {
  test('should bundle shared worker as separate entry points', async () => {
    const fixtureName = 'shared-worker';
    const cwd = getFixtureCwd(fixtureName);
    const result = await compileFixture(fixtureName, [
      babelPlugin({
        angularComponentResourceQueryString: '?ng-template',
        workerUrlQueryString,
        fileReplacements: {},
        cache: new MemoryCache(),
      }),
      workerPlugin({
        queryString: workerUrlQueryString,
        tsconfig: path.join(cwd, 'tsconfig.json'),
      }),
    ]);

    expect(result['entry.js']).toMatchInlineSnapshot(`
      "var __getOwnPropNames = Object.getOwnPropertyNames;
      var __commonJS = (cb, mod) => function __require() {
        return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
      };


      var require_shared_worker_worker = __commonJS({
        "worker:./shared-worker.worker.js"(exports, module) {
          module.exports = "./shared-worker.worker.js";
        }
      });


      var worker = new SharedWorker(require_shared_worker_worker());
      export {
        worker
      };
      "
    `);

    expect(result['shared-worker.worker.js']).toMatchInlineSnapshot(`
      "(() => {
        
        console.log("I am a shared worker!");
      })();
      "
    `);
  });

  test('should not bundle the webworker when no webworker tsconfig is provided', async () => {
    const fixtureName = 'shared-worker';
    const result = await compileFixture(fixtureName, [
      babelPlugin({
        angularComponentResourceQueryString: '?ng-template',
        workerUrlQueryString: undefined,
        fileReplacements: {},
        cache: new MemoryCache(),
      }),
      workerPlugin({
        queryString: workerUrlQueryString,
      }),
    ]);

    expect(result['entry.js']).toMatchInlineSnapshot(`
      "
      var worker = new SharedWorker(
        new URL("./shared-worker.worker", import.meta.url)
      );
      export {
        worker
      };
      "
    `);
    expect(result['shared-worker.worker.js']).toBeUndefined();
  });
});
