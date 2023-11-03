import { compileFixture, getFixtureCwd } from './__fixtures__/compile-fixture';
import { globalScriptsPlugin } from './global-scripts';

describe('globalScriptsPlugin', () => {
  test('should add global scripts', async () => {
    const fixtureName = 'global-scripts';
    const result = await compileFixture(fixtureName, [
      globalScriptsPlugin(
        [
          {
            input: 'scripts/1.js',
          },
          'scripts/2.js',
        ],
        getFixtureCwd(fixtureName)
      ),
    ]);

    expect(result['scripts.js']).toMatchInlineSnapshot(`
      "
      console.log(1);


      console.log(2);
      "
    `);
  });
});
