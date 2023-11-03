import { Plugin } from 'esbuild';
import { sassPlugin, SassPluginOptions } from 'esbuild-sass-plugin';

import { createFileReadCache } from './utils/file-read-cache';

interface AngularComponentResourcesPluginOptions {
  angularComponentResourceQueryString: string;
  sassPluginOptions?: SassPluginOptions;
}

/**
 * This plugin is inlining component templateUrls and styleUrls so that they can be used with esbuild.
 * @param options
 */
export function angularComponentResourcesPlugin(
  options: AngularComponentResourcesPluginOptions
): Plugin {
  return {
    name: 'angular-component-resources',
    async setup(build) {
      const fileCache = createFileReadCache();

      // Intercept requests for component templateUrls and load the file contents
      build.onLoad({ filter: /\.html$/ }, async (args) => {
        // Only handle component templateUrls
        if (args.suffix === options.angularComponentResourceQueryString) {
          const contents = await fileCache.readFile(args.path);
          return {
            loader: 'text',
            contents,
          };
        }
        // If nothing is returned then we skip this plugin
        return undefined;
      });

      // Intercept requests for component styleUrls, process them with the sass plugin and return the stringified css
      // Angular will then take that css and handle attaching it to the DOM
      const sassPluginInstance = sassPlugin({
        ...options.sassPluginOptions,
        type: 'css-text',
      });
      await sassPluginInstance.setup({
        ...build,
        onLoad(sassOptions, sassPluginOnLoad) {
          build.onLoad(sassOptions, (args) => {
            // Only handle component styleUrls
            if (args.suffix === options.angularComponentResourceQueryString) {
              return sassPluginOnLoad(args);
            }
            // If nothing is returned then we skip this plugin
            return undefined;
          });
        },
      });
    },
  };
}
