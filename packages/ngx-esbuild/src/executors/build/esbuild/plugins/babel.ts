import { PluginItem } from '@babel/core';
import { BuildOptions, Loader } from 'esbuild';
import { Plugin } from 'esbuild';

import {
  shouldTransformAngularComponentDIPlugin,
  transformAngularDIPlugin,
} from './babel/transform-angular-di/plugin';
import {
  shouldTransformDynamicImportCommonjsInteropPlugin,
  transformDynamicImportCommonjsInteropPlugin,
} from './babel/transform-dynamic-import-commonjs-interop/plugin';
import {
  shouldTransformInlineAngularComponentResourcesPlugin,
  transformInlineAngularComponentResourcesPlugin,
} from './babel/transform-inline-angular-component-resources/plugin';
import {
  shouldTransformNewWorkerUrlPlugin,
  transformNewWorkerUrlPlugin,
} from './babel/transform-new-worker-url/plugin';
import {
  shouldTransformWebpackEagerModePlugin,
  transformWebpackEagerModePlugin,
} from './babel/transform-webpack-eager-mode/plugin';
import { babelTransform } from './utils/babel-transform';
import { PluginCache } from './utils/types/plugin-cache';
import {
  cacheablePluginOnLoadHandler,
  CacheablePluginValue,
} from './utils/cacheable-plugin-on-load-handler';

interface BabelPluginOptions {
  /**
   * Query string that we append to inline require statements for components so that we can intercept them later
   */
  angularComponentResourceQueryString: string;

  /**
   * Query string that we append to new URL statements that we pass to a new Worker or new SharedWorker statement
   * We then intercept this with the esbuild worker plugin
   */
  workerUrlQueryString: string | undefined;

  /**
   * An object mapping a file path that should be replaced with another
   */
  fileReplacements: Record<string, string>;

  /**
   * The esbuild cache
   */
  cache: PluginCache<CacheablePluginValue>;
}

/**
 * This plugin is responsible for applying a series of custom babel plugins to the source code for the following purposes:
 * - Transforming Angular components so that they can be used with esbuild
 * - Applying workarounds for missing esbuild features that are present in webpack
 */
export function babelPlugin(options: BabelPluginOptions): Plugin {
  return {
    name: 'babel',
    async setup(build) {
      build.onLoad({ filter: /\.tsx?$/ }, async (args) => {
        const path = options.fileReplacements[args.path] ?? args.path;

        const result = await cacheablePluginOnLoadHandler(
          path,
          options.cache,
          (source, filename) =>
            processWithBabel(source, filename, build.initialOptions, options)
        );

        return {
          ...result,
          // Make sure that any fileReplacements are also watched for changes
          watchFiles: options.fileReplacements[args.path] ? [path] : undefined,
        };
      });
    },
  };
}

async function processWithBabel(
  source: string,
  filename: string,
  esbuildOptions: BuildOptions,
  babelPluginOptions: BabelPluginOptions
): Promise<
  | {
      contents: string;
      loader: Loader;
    }
  | undefined
> {
  const customPlugins: PluginItem[] = [];

  // This will transform the DI for Angular components so that they can be used with esbuild
  // This is needed as esbuild doesn't support the emitDecoratorMetadata option
  if (shouldTransformAngularComponentDIPlugin(source)) {
    customPlugins.push(transformAngularDIPlugin);
  }

  // This will transform inline resources for Angular components so that they can be used with esbuild
  // e.g. it converts things like `templateUrl: './my.component.html'` to `template: require('./my.component.html?ng-template')`
  if (shouldTransformInlineAngularComponentResourcesPlugin(source)) {
    customPlugins.push([
      transformInlineAngularComponentResourcesPlugin,
      { queryString: babelPluginOptions.angularComponentResourceQueryString },
    ]);
  }

  // This will transform dynamic imports with a `webpackMode: 'eager'` comment to require statements
  if (shouldTransformWebpackEagerModePlugin(source)) {
    customPlugins.push(transformWebpackEagerModePlugin);
  }

  // Workaround this bug with esbuild when enabling code splitting: https://github.com/evanw/esbuild/issues/3245
  if (
    // Only transform dynamic imports if code splitting is enabled
    // Otherwise this workaround is not needed
    esbuildOptions.splitting &&
    shouldTransformDynamicImportCommonjsInteropPlugin(source)
  ) {
    customPlugins.push(transformDynamicImportCommonjsInteropPlugin);
  }

  if (
    babelPluginOptions.workerUrlQueryString &&
    shouldTransformNewWorkerUrlPlugin(source)
  ) {
    customPlugins.push([
      transformNewWorkerUrlPlugin,
      { queryString: babelPluginOptions.workerUrlQueryString },
    ]);
  }

  const isTSX = filename.endsWith('.tsx');
  const esbuildLoader = isTSX ? 'tsx' : 'ts';

  if (customPlugins.length === 0) {
    // no transform needed, skip processing with babel for faster build times
    return {
      contents: source,
      loader: esbuildLoader,
    };
  }

  return babelTransform(
    source,
    filename,
    [
      ['@babel/plugin-syntax-typescript', { isTSX }],
      ['@babel/plugin-syntax-decorators', { legacy: true }],
      ...customPlugins,
    ],
    {
      setSpreadProperties: true,
    },
    esbuildLoader
  );
}
