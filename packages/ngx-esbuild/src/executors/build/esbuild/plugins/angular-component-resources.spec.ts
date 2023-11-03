import { compileFixture } from './__fixtures__/compile-fixture';
import { angularComponentResourcesPlugin } from './angular-component-resources';
import { babelPlugin } from './babel';
import { MemoryCache } from './utils/memory-cache';

describe('angularComponentResourcesPlugin', () => {
  test('should handle component resource urls', async () => {
    const fixtureName = 'angular-component-resources';
    const angularComponentResourceQueryString = '?ng-template';
    const result = await compileFixture(fixtureName, [
      babelPlugin({
        angularComponentResourceQueryString,
        workerUrlQueryString: '?worker-url',
        fileReplacements: {},
        cache: new MemoryCache(),
      }),
      angularComponentResourcesPlugin({ angularComponentResourceQueryString }),
    ]);

    expect(result['entry.js']).toContain('template: require_foo_component(),');
    expect(result['entry.js']).toContain(
      'styles: [(init_foo_component(), __toCommonJS(foo_component_exports)).default],'
    );
  });
});
