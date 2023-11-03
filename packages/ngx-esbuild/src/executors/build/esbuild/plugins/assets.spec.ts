import { assetsPlugin } from './assets';

jest.mock('esbuild-plugin-copy');

describe('assetsPlugin', () => {
  test('directory', () => {
    assetsPlugin({
      assets: ['apps/embedded-html/src/assets'],
      outputPath: 'dist/apps/embedded-html',
      watch: false,
    });

    expect(jest.requireMock('esbuild-plugin-copy').copy).toHaveBeenCalledWith({
      resolveFrom: 'cwd',
      assets: [
        {
          from: ['apps/embedded-html/src/assets/**/*'],
          to: ['dist/apps/embedded-html/assets'],
          watch: false,
        },
      ],
      watch: false,
      once: true,
    });
  });

  test('single file', () => {
    assetsPlugin({
      assets: ['apps/embedded-html/src/robots.txt'],
      outputPath: 'dist/apps/embedded-html',
      watch: false,
    });

    expect(jest.requireMock('esbuild-plugin-copy').copy).toHaveBeenCalledWith({
      resolveFrom: 'cwd',
      assets: [
        {
          from: ['apps/embedded-html/src/robots.txt'],
          to: ['dist/apps/embedded-html'],
          watch: false,
        },
      ],
      watch: false,
      once: true,
    });
  });

  test('object asset', () => {
    assetsPlugin({
      assets: [
        {
          glob: '**/!(sprite)/**/*',
          input: 'libs/assets',
          output: 'assets/',
        },
      ],
      outputPath: 'dist/apps/embedded-html',
      watch: false,
    });

    expect(jest.requireMock('esbuild-plugin-copy').copy).toHaveBeenCalledWith({
      resolveFrom: 'cwd',
      assets: [
        {
          from: ['apps/embedded-html/src/assets/**/*'],
          to: ['dist/apps/embedded-html/assets'],
          watch: false,
        },
      ],
      watch: false,
      once: true,
    });
  });
});
