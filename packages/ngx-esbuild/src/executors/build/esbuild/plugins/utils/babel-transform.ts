import { PluginItem, transformAsync, TransformOptions } from '@babel/core';
import { Loader } from 'esbuild';

/**
 * Transforms the given source using babel
 * @param source
 * @param filename
 * @param plugins
 * @param assumptions
 * @param resultLoader
 */
export async function babelTransform(
  source: string,
  filename: string,
  plugins: PluginItem[],
  assumptions: TransformOptions['assumptions'],
  resultLoader: Loader
) {
  const result = await transformAsync(source, {
    babelrc: false,
    sourceMaps: 'inline',
    filename,
    plugins,
    assumptions,
    // Hide this warning: "The code generator has de-optimised the styling of ... as it exceeds the max of 500KB"
    compact: false,
  });

  if (!result?.code) {
    return;
  }

  return {
    contents: result.code,
    loader: resultLoader,
  };
}
