import { compileFixture, getFixtureCwd } from './__fixtures__/compile-fixture';
import { globalStylesPlugin } from './global-styles';

describe('globalStylesPlugin', () => {
  test('should add global styles', async () => {
    const fixtureName = 'global-styles';
    const result = await compileFixture(fixtureName, [
      globalStylesPlugin(
        ['styles/1.scss', 'styles/2.css'],
        {},
        getFixtureCwd(fixtureName)
      ),
    ]);

    expect(result['styles.css']).toMatchInlineSnapshot(`
      "h1 {
        color: "red";
      }

      h2 {
        color: hotpink;
      }
      "
    `);
  });
});
