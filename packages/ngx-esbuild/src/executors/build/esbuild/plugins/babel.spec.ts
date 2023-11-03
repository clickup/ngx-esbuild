import { compileFixture, getFixtureCwd } from './__fixtures__/compile-fixture';
import { babelPlugin } from './babel';
import { MemoryCache } from './utils/memory-cache';
import { getFileReplacements } from './utils/get-file-replacements';

describe('babelPlugin', () => {
  test('should annotate angular injectables', async () => {
    const fixtureName = 'angular-injectables';
    const result = await compileFixture(fixtureName, [
      babelPlugin({
        angularComponentResourceQueryString: '?ng-template',
        workerUrlQueryString: '?worker-url',
        fileReplacements: {},
        cache: new MemoryCache(),
      }),
    ]);

    expect(result['entry.js']).toContain(
      `__publicField(MyService, "ctorParameters", () => [{
  type: ApplicationRef
}]);`
    );

    expect(result['entry.js']).toContain(
      `__publicField(ReactComponent, "ctorParameters", () => [{
  type: Injector
}]);`
    );
  });

  test('should replace files in the build with other files', async () => {
    const fixtureName = 'file-replacements';
    const result = await compileFixture(fixtureName, [
      babelPlugin({
        angularComponentResourceQueryString: '?ng-template',
        workerUrlQueryString: '?worker-url',
        cache: new MemoryCache(),
        fileReplacements: getFileReplacements(
          [
            {
              replace: 'env/environment.ts',
              with: 'env/environment.dev.ts',
            },
          ],
          getFixtureCwd(fixtureName)
        ),
      }),
    ]);

    expect(result['entry.js']).toContain('var name = "dev";');
  });
});
