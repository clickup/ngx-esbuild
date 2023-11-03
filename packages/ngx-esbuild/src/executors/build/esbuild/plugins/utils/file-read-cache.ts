import fs from 'node:fs';

/**
 * This helper is used to read a files contents only if it has changed since the last time it was read.
 * This helps speed up incremental rebuild times as reading the file last modified time is much faster than always reading the file contents.
 */
export function createFileReadCache() {
  const fileCache = new Map<string, { contents: string; mTimeMs: number }>();

  async function readFile(path: string): Promise<string> {
    const stats = await fs.promises.stat(path);
    const cachedFile = fileCache.get(path);

    if (!cachedFile || cachedFile.mTimeMs < stats.mtimeMs) {
      const contents = await fs.promises.readFile(path, 'utf8');
      fileCache.set(path, { contents, mTimeMs: stats.mtimeMs });
      return contents;
    }

    return cachedFile.contents;
  }

  return { readFile };
}
