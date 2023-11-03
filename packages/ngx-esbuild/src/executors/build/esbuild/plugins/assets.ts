import { Schema as BuildSchema } from '@angular-devkit/build-angular/src/builders/browser/schema';
import { copy } from 'esbuild-plugin-copy';
import path from 'node:path';

export function assetsPlugin({
  assets,
  watch,
  outputPath,
}: {
  assets: BuildSchema['assets'];
  watch: boolean;
  outputPath: string;
}) {
  return copy({
    resolveFrom: 'cwd',
    assets: assets?.map((asset) => {
      if (typeof asset === 'string') {
        if (!path.extname(asset)) {
          // is a directory
          return {
            from: [asset + '/**/*'],
            to: [path.join(outputPath, path.basename(asset))],
            watch,
          };
        } else {
          return {
            from: [asset],
            to: [outputPath],
            watch,
          };
        }
      } else {
        // Matches `**/!(sprite)/**/*` - glob syntax not supported by the copy plugin
        const glob = /\*\*\/!\(\w+\)\/\*\*/.test(asset.glob)
          ? '**/*'
          : asset.glob;
        return {
          from: [path.join(asset.input, glob)],
          to: [path.join(outputPath, asset.output).replace(/\/$/, '')],
          watch,
        };
      }
    }),
    watch,
    once: true,
  });
}
