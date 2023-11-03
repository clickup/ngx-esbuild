import { Loader } from 'esbuild';
import fs from 'node:fs';

import { PluginCache } from './types/plugin-cache';

/**
 * This function is used to cache the results in memory of an esbuild plugin's onLoad handler.
 * Based on this guide: https://esbuild.github.io/plugins/#caching-your-plugin
 *
 * @param path
 * @param cache
 * @param handler
 */
export async function cacheablePluginOnLoadHandler(
  path: string,
  cache: PluginCache<CacheablePluginValue>,
  handler: (
    contents: string,
    path: string
  ) => Promise<CacheablePluginValue['output']>
) {
  const stats = await fs.promises.stat(path);

  const key = path;
  let value = cache.get(key);

  const input =
    !value || value.mtimeMs < stats.mtimeMs
      ? await fs.promises.readFile(path, 'utf8')
      : value.input;

  if (!value || value.input !== input) {
    const output = await handler(input, path);
    value = { input, output, mtimeMs: stats.mtimeMs };
    cache.set(key, value);
  }

  return value.output;
}

export interface CacheablePluginValue {
  input: string;
  output:
    | {
        contents: string;
        loader: Loader;
      }
    | undefined;
  mtimeMs: number;
}
