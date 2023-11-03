import { ScriptElement } from '@angular-devkit/build-angular/src/builders/browser/schema';
import { Plugin } from 'esbuild';
import { escapeRegExp } from 'lodash';

const pluginName = 'global-scripts';

const outputFilename = 'scripts.js';

export const globalScriptsPluginEntryPoints = {
  esbuild: outputFilename,
  htmlPlugin: `${pluginName}:${outputFilename}`,
};

/**
 * Plugin to concatenate all global scripts into a single file
 * Implements scripts option from angular cli
 * @param scripts
 * @param cwd
 */
export function globalScriptsPlugin(
  scripts: ScriptElement[],
  cwd: string
): Plugin {
  return {
    name: pluginName,
    setup(build) {
      if (Array.isArray(build.initialOptions.entryPoints)) {
        (build.initialOptions.entryPoints as string[]).unshift(
          globalScriptsPluginEntryPoints.esbuild
        );
      }

      // Intercept request to scripts.js file as this will only exist virtually
      // Associate the request with this plugin
      build.onResolve(
        { filter: new RegExp(`^${escapeRegExp(outputFilename)}$`) },
        (args) => ({
          path: args.path,
          namespace: pluginName,
        })
      );

      // Now create a virtual file that imports everything in the apps project.json scripts entry
      build.onLoad({ filter: /.*/, namespace: pluginName }, () => {
        const mappedScripts = scripts
          .map((script) => {
            if (typeof script === 'string') {
              return script;
            } else if (typeof script === 'object' && script.input) {
              return script.input;
            }
            throw new Error(
              'Cannot handle global script: ' + JSON.stringify(script)
            );
          })
          .filter(Boolean);
        return {
          contents: mappedScripts
            .map((script) => {
              return `import './${script}';`;
            })
            .join('\n'),
          loader: 'js',
          resolveDir: cwd,
          watchFiles: mappedScripts,
        };
      });
    },
  };
}
