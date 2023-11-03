import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'path';
import stripComments from 'strip-comments';

export function getFixtureCwd(fixtureName: string): string {
  return path.join(__dirname, fixtureName);
}

/**
 * Test harness to compile a given fixture in this directory with esbuild
 * Returns an object mapping of the output files and their contents
 * @param fixtureName - the fixture name to compile. Must exist in the __fixtures__ directory
 * @param plugins - the esbuild plugins to use
 * @param options - override the entry points and tsconfig (relative to fixture root directory). Defaults to `{entryPoints: ['entry.ts'], tsconfig: 'tsconfig.json'}`
 */
export async function compileFixture(
  fixtureName: string,
  plugins: esbuild.Plugin[],
  options: {
    entryPoints?: string[];
    tsconfig?: string;
    stripComments?: boolean;
  } = {}
) {
  const cwd = getFixtureCwd(fixtureName);
  await fs.promises.access(cwd); // check fixture exists

  const result = await esbuild.build({
    entryPoints: (options.entryPoints ?? ['entry.ts']).map((entry) =>
      path.join(cwd, entry)
    ),
    tsconfig: path.join(cwd, options.tsconfig ?? 'tsconfig.json'),
    bundle: true,
    plugins,
    write: false,
    outdir: cwd,
    entryNames: '[name]',
    assetNames: '[name]',
    chunkNames: '[name]',
    format: 'esm',
    target: 'es2022',
  });

  return result.outputFiles.reduce((map: Record<string, string>, file) => {
    const text =
      options.stripComments !== false ? stripComments(file.text) : file.text;

    return {
      ...map,
      [file.path.replace(cwd + path.sep, '')]: text.replaceAll(cwd, '.'),
    };
  }, {});
}
