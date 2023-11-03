import { StyleElement } from '@angular-devkit/build-angular/src/builders/browser/schema';
import { Plugin } from 'esbuild';
import { sassPlugin, SassPluginOptions } from 'esbuild-sass-plugin';
import { escapeRegExp } from 'lodash';
import path from 'node:path';

const pluginName = 'global-styles';

const outputFilename = 'styles.js';

export const globalStylesPluginEntryPoints = {
  esbuild: `${outputFilename}`,
  htmlPlugin: `${pluginName}:${outputFilename}`,
};

/**
 * Plugin to concatenate all global styles into a single file
 * Implements styles option from angular cli
 * @param styles
 * @param sassOptions
 * @param cwd
 */
export function globalStylesPlugin(
  styles: StyleElement[],
  sassOptions: SassPluginOptions,
  cwd: string
): Plugin {
  const namespace = 'angular:global-styles';

  return {
    name: pluginName,
    setup(build) {
      if (Array.isArray(build.initialOptions.entryPoints)) {
        (build.initialOptions.entryPoints as string[]).unshift(
          globalStylesPluginEntryPoints.esbuild
        );
      }

      // Intercept request to `outputFilename` as this will only exist virtually
      // Associate the request with this plugin
      build.onResolve(
        { filter: new RegExp(`^${escapeRegExp(outputFilename)}$`) },
        (args) => ({
          path: args.path,
          namespace: pluginName,
        })
      );

      // Now create a virtual file that imports everything in the apps project.json styles entry
      build.onLoad({ filter: /.*/, namespace: pluginName }, () => {
        const mappedStyles = styles
          .map((style) => {
            if (typeof style === 'string') {
              return style;
            }
            throw new Error(
              'Cannot handle global style: ' + JSON.stringify(style)
            );
          })
          .filter(Boolean);
        return {
          contents: mappedStyles
            .map((style) => {
              return `import '${namespace}:./${style}';`;
            })
            .join('\n'),
          loader: 'js',
          resolveDir: cwd,
          watchFiles: mappedStyles,
        };
      });

      // Above we will prefix all global styles in the virtual entry point with angular:global-styles: to indicate that they should be processed by this plugin
      // This part will intercept those requests and resolve them to the actual file path but under the namespace angular:global-styles
      build.onResolve({ filter: /^angular:global-styles:/ }, (args) => {
        return {
          path: path.join(
            args.resolveDir,
            args.path.replace(namespace + ':', '')
          ),
          namespace,
        };
      });

      // Next, we will intercept requests for global styles, process them with the sass plugin and return the stringified css
      const sassPluginInstance = sassPlugin({
        ...sassOptions,
      });
      sassPluginInstance.setup({
        ...build,
        onLoad(_, sassPluginOnLoad) {
          build.onLoad(
            // The sass plugin doesn't support passing in a namespace
            // Which is why we curry it here to add the functionality we need
            { filter: /.*/, namespace },
            sassPluginOnLoad
          );
        },
      });
    },
  };
}
