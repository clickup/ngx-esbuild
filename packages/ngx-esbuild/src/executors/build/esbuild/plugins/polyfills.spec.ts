import { compileFixture, getFixtureCwd } from './__fixtures__/compile-fixture';
import { polyfillsPlugin } from './polyfills';

describe('polyfillsPlugin', () => {
  test('should add polyfills', async () => {
    const fixtureName = 'polyfills';
    const result = await compileFixture(fixtureName, [
      polyfillsPlugin(['polyfills.ts'], true, getFixtureCwd(fixtureName)),
    ]);

    expect(result['polyfills.js']).toContain('CompilerFacadeImpl');
    expect(result['polyfills.js']).toContain(
      'Object.defineProperty(location, "origin", {'
    );
  });
});
