import { Polyfills } from '@angular-devkit/build-angular/src/builders/browser/schema';
import { Plugin } from 'esbuild';
import { escapeRegExp } from 'lodash';

const pluginName = 'polyfills';

const outputFilename = 'polyfills.js';

export const polyfillsPluginEntryPoints = {
  esbuild: outputFilename,
  htmlPlugin: `${pluginName}:${outputFilename}`,
};

/**
 * Plugin to concatenate all polyfills into a single file
 * Implements polyfills option from angular cli
 * @param polyfills
 * @param jitMode
 * @param cwd
 */
export function polyfillsPlugin(
  polyfills: Polyfills,
  jitMode: boolean,
  cwd: string
): Plugin {
  return {
    name: pluginName,
    setup(build) {
      if (Array.isArray(build.initialOptions.entryPoints)) {
        (build.initialOptions.entryPoints as string[]).unshift(
          polyfillsPluginEntryPoints.esbuild
        );
      }

      // Intercept request to polyfills.js file as this will only exist virtually
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
        const polyfillsArray = Array.isArray(polyfills)
          ? polyfills
          : [polyfills];
        return {
          contents: [
            jitMode ? '@angular/compiler' : undefined, // needed for jit mode + code splitting to work
            ...polyfillsArray.map((polyfill) => {
              if (polyfill.endsWith('.ts')) {
                return `./${polyfill}`;
              }
              return polyfill;
            }),
          ]
            .filter(Boolean)
            .map((script) => {
              return `import '${script}';`;
            })
            .join('\n'),
          loader: 'ts',
          resolveDir: cwd,
          watchFiles: polyfillsArray,
        };
      });
    },
  };
}
