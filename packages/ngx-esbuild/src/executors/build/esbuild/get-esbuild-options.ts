import { Schema as BuildSchema } from '@angular-devkit/build-angular/src/builders/browser/schema';
import { Schema as ServeSchema } from '@angular-devkit/build-angular/src/builders/dev-server/schema';
import { htmlPlugin } from '@craftamap/esbuild-plugin-html';
import { BuildOptions } from 'esbuild';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import postcss, { AcceptedPlugin } from 'postcss';
import postcssImport from 'postcss-import';
import postcssUrl from 'postcss-url';


import { BuildExecutorSchema } from '../schema';
import { angularComponentResourcesPlugin } from './plugins/angular-component-resources';
import { assetsPlugin } from './plugins/assets';
import { babelPlugin } from './plugins/babel';
import { deleteOutputDirectoryPlugin } from './plugins/delete-output-directory';
import { devServerPlugin } from './plugins/dev-server';
import {
  globalScriptsPlugin,
  globalScriptsPluginEntryPoints,
} from './plugins/global-scripts';
import {
  globalStylesPlugin,
  globalStylesPluginEntryPoints,
} from './plugins/global-styles';
import { logBuildStatePlugin } from './plugins/log-build-state';
import {
  polyfillsPlugin,
  polyfillsPluginEntryPoints,
} from './plugins/polyfills';
import { getFileReplacements } from './plugins/utils/get-file-replacements';
import { workerPlugin } from './plugins/worker';
import {MemoryCache} from "./plugins/utils/memory-cache";

export async function getEsbuildOptions(
  angularBuildTarget: BuildSchema,
  angularServeTarget: ServeSchema,
  buildExecutorOptions: Omit<
    BuildExecutorSchema,
    'buildTarget' | 'serveTarget'
  >,
  projectName: string,
  cwd: string
): Promise<BuildOptions> {
  const entryPoints: string[] = [angularBuildTarget.main];

  assert(
    typeof angularBuildTarget.index === 'string',
    'index must be a string, object form is not yet supported'
  );

  const indexHtml = 'index.html';

  const styleIncludePaths = [
    ...(angularBuildTarget.stylePreprocessorOptions?.includePaths ?? []),
    cwd,
  ];

  const angularComponentResourceQueryString = '?ng-template';
  const workerUrlQueryString = '?worker-url';

  const loadBuildStatePluginInstance = logBuildStatePlugin({
    watch: buildExecutorOptions.serve,
  });

  return {
    entryPoints,
    // Output in flat directory structure
    entryNames: '[name].[hash]',
    bundle: true,
    splitting: true,
    outdir: angularBuildTarget.outputPath,
    target: buildExecutorOptions.esbuildTarget,
    // Required for @craftamap/esbuild-plugin-html
    metafile: true,
    // TODO - see if this makes a noticeable difference to speed
    // treeShaking: false,
    sourcemap: true,
    // Match output of the angular CLI. Also required for code splitting with dynamic imports
    format: 'esm',
    tsconfig: angularBuildTarget.tsConfig,
    supported: {
      // Native async/await, async generators and for await are not supported with Zone.js.
      // Disabling support here will cause esbuild to downlevel async/await to a Zone.js supported form.
      'async-await': false,
      'async-generator': false,
      'for-await': false,
      // Disable support for native class fields and static class fields and downlevel to a supported form.
      'class-field': false,
      'class-static-field': false,
    },
    plugins: [
      loadBuildStatePluginInstance.start,
      deleteOutputDirectoryPlugin(),
      globalStylesPlugin(
        angularBuildTarget.styles ?? [],
        {
          loadPaths: styleIncludePaths,
        },
        cwd
      ),
      globalScriptsPlugin(angularBuildTarget.scripts ?? [], cwd),
      polyfillsPlugin(
        angularBuildTarget.polyfills ?? [],
        true,
        cwd
      ),
      babelPlugin({
        cache: new MemoryCache(),
        angularComponentResourceQueryString,
        workerUrlQueryString: angularBuildTarget.webWorkerTsConfig
          ? workerUrlQueryString
          : undefined,
        fileReplacements: getFileReplacements(
          angularBuildTarget.fileReplacements ?? [],
          cwd
        ),
      }),
      angularComponentResourcesPlugin({
        angularComponentResourceQueryString,
        sassPluginOptions: {
          loadPaths: styleIncludePaths,
          async transform(source, resolveDir, filePath) {
            const postCssPlugins: AcceptedPlugin[] = [];

            // This allows us to do css imports to .css files in node_modules
            // e.g. @import '@time-loop/gantt/codebase/dhtmlxgantt.css';
            // We improve perf by only transforming if the file contains a .css import
            if (source.includes(".css';")) {
              postCssPlugins.push(postcssImport());
            }

            if (source.includes('url(')) {
              postCssPlugins.push(
                postcssUrl({
                  url: 'inline',
                })
              );
            }

            if (postCssPlugins.length === 0) {
              return source;
            }

            const { css } = await postcss(postCssPlugins).process(source, {
              from: filePath,
            });
            return css;
          },
          // Restore angular-cli compatibility by automatically resolving non partial extensionless imports to .scss files
          // e.g. replaces `@import './foo.component';` with `@import './foo.component.scss';`
          precompile(source) {
            if (source.includes('@import') || source.includes('@use')) {
              const imports = Array.from(
                source.matchAll(/@(import|use) '\.(.+)'/g)
              );
              imports.forEach((match) => {
                const [fullImport, importOrUseKeyword, importPath] = match;
                if (
                  !importPath.endsWith('.scss') &&
                  !importPath.endsWith('.css')
                ) {
                  source = source.replace(
                    fullImport,
                    `@${importOrUseKeyword} '.${importPath}.scss'`
                  );
                }
              });
            }
            return source;
          },
        },
      }),
      workerPlugin({
        queryString: workerUrlQueryString,
        tsconfig: angularBuildTarget.webWorkerTsConfig,
      }),
      // Create index.html with the <script> and <link> tags for generated bundles
      htmlPlugin({
        files: [
          {
            entryPoints: [
              polyfillsPluginEntryPoints.htmlPlugin,
              globalScriptsPluginEntryPoints.htmlPlugin,
              globalStylesPluginEntryPoints.htmlPlugin,
              ...entryPoints,
            ],
            filename: indexHtml,
            scriptLoading: 'module',
            htmlTemplate: await fs.promises.readFile(
              path.join(cwd, angularBuildTarget.index),
              'utf-8'
            ),
          },
        ],
      }),
      assetsPlugin({
        assets: angularBuildTarget.assets,
        watch: buildExecutorOptions.serve,
        outputPath: angularBuildTarget.outputPath,
      }),
      devServerPlugin({
        enabled: buildExecutorOptions.serve,
        rootDir: angularBuildTarget.outputPath,
        hostname: angularServeTarget.host ?? 'localhost',
        port: angularServeTarget.port ?? 4200,
        open: angularServeTarget.open ?? false,
        liveReload: angularServeTarget.liveReload ?? true,
        cwd,
      }),
      loadBuildStatePluginInstance.end,
    ],
  };
}
