import { getEsbuildOptions } from './get-esbuild-options';

jest.mock('node:fs', () => {
  return {
    promises: {
      readFile: jest.fn().mockReturnValue('<html></html>'),
    },
  };
});

describe('getEsbuildOptions', () => {
  it('should get all options', async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { plugins, ...options } = await getEsbuildOptions(
      {
        main: 'main.ts',
        polyfills: ['polyfills.ts'],
        tsConfig: 'tsconfig.json',
        index: 'index.html',
        outputPath: 'dist',
      },
      {
        browserTarget: 'build:browser',
      },
      {
        serve: false,
        esbuildTarget: 'es2022',
      },
      'client',
      process.cwd()
    );

    expect(options).toMatchInlineSnapshot(`
      {
        "bundle": true,
        "entryNames": "[name].[hash]",
        "entryPoints": [
          "main.ts",
        ],
        "format": "esm",
        "metafile": true,
        "outdir": "dist",
        "sourcemap": true,
        "splitting": true,
        "supported": {
          "async-await": false,
          "async-generator": false,
          "class-field": false,
          "class-static-field": false,
          "for-await": false,
        },
        "target": "es2022",
        "tsconfig": "tsconfig.json",
      }
    `);
  });
});
