import { Plugin } from 'esbuild';
import fs from 'node:fs';

/**
 * Deletes the output directory before building to match angular CLI behavior
 */
export function deleteOutputDirectoryPlugin(): Plugin {
  return {
    name: 'delete-output-directory',
    async setup(build) {
      if (build.initialOptions.outdir) {
        await fs.promises.rm(build.initialOptions.outdir, {
          recursive: true,
          force: true,
        });
      }
    },
  };
}
