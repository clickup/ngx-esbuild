import esbuild from 'esbuild';
import { escapeRegExp } from 'lodash';
import assert from 'node:assert';

const pluginName = 'worker';

/**
 * Handles bundling of web workers by:
 * 1. Intercepting the import of the worker file with the `transformNewWorkerUrlPlugin` babel plugin
 * 2. Bundling the worker with esbuild as its own compilation unit
 * 3. Replacing the new URL reference with the path to the bundled worker file using esbuilds file loader
 *
 * This is purely a stopgap until it's implemented natively by esbuild: https://github.com/evanw/esbuild/pull/2508
 * @param options
 */
export function workerPlugin(options: {
  queryString: string;
  tsconfig?: string;
}): esbuild.Plugin {
  return {
    name: pluginName,
    setup(build) {
      if (!options.tsconfig) {
        // match angular-cli behaviour and do nothing if no `webWorkerTsConfig` option is provided
        return;
      }

      const workerQueryStringRegexp = new RegExp(
        escapeRegExp(options.queryString) + '$'
      );

      build.onResolve(
        {
          filter: workerQueryStringRegexp,
        },
        async (args) => {
          const fullyResolvedPath = await build.resolve(
            args.path.replace(workerQueryStringRegexp, ''),
            {
              kind: args.kind,
              resolveDir: args.resolveDir,
            }
          );

          return {
            // esbuild's plugin API doesn't allow you to rename output files
            // So we use this hack where we resolve the file to a .js extension to force the worker file extension to be .js instead of .ts
            path: fullyResolvedPath.path.replace(/\.ts$/, '.js'),
            namespace: pluginName,
            pluginData: {
              realPath: fullyResolvedPath.path,
            },
          };
        }
      );

      build.onLoad({ filter: /.+/, namespace: pluginName }, async (args) => {
        const bundledWorker = await esbuild.build({
          entryPoints: [args.pluginData.realPath],
          bundle: true,
          target: build.initialOptions.target,
          metafile: true,
          tsconfig: options.tsconfig,
          write: false,
        });

        assert(
          bundledWorker.outputFiles?.length === 1,
          'Expected only one output file'
        );

        return {
          contents: bundledWorker.outputFiles[0].text,
          loader: 'file',
          watchFiles: Object.keys(bundledWorker.metafile?.inputs ?? {}),
        };
      });
    },
  };
}
