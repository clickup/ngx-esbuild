import { pluginTester } from 'babel-plugin-tester';

import { transformInlineAngularComponentResourcesPlugin } from './plugin';

pluginTester({
  plugin: transformInlineAngularComponentResourcesPlugin,
  pluginName: 'transform-inline-angular-component-resources',
  pluginOptions: { queryString: '?ng-template' },
  babelOptions: {
    plugins: [
      '@babel/plugin-syntax-typescript',
      ['@babel/plugin-syntax-decorators', { legacy: true }],
    ],
  },
  tests: {
    'should convert template urls': {
      code: `import { Component } from '@angular/core';
    import { Foo } from './foo';

    @Component({
      selector: 'abc',
      templateUrl: './foo.html'
    })
    class TestComponent {
      constructor(foo: Foo) {}
    }`,
      output: `import { Component } from '@angular/core';
import { Foo } from './foo';
@Component({
  selector: 'abc',
  template: require('./foo.html?ng-template'),
})
class TestComponent {
  constructor(foo: Foo) {}
}`,
    },

    'should convert style urls': {
      code: `import { Component } from '@angular/core';
    import { Foo } from './foo';

    @Component({
      selector: 'abc',
      styleUrls: ['./foo.scss']
    })
    class TestComponent {
      constructor(foo: Foo) {}
    }`,
      output: `import { Component } from '@angular/core';
import { Foo } from './foo';
@Component({
  selector: 'abc',
  styles: [require('./foo.scss?ng-template').default],
})
class TestComponent {
  constructor(foo: Foo) {}
}`,
    },

    'should normalize template urls': {
      code: `import { Component } from '@angular/core';
    import { Foo } from './foo';

    @Component({
      selector: 'abc',
      templateUrl: 'foo.html'
    })
    class TestComponent {
      constructor(foo: Foo) {}
    }`,
      output: `import { Component } from '@angular/core';
import { Foo } from './foo';
@Component({
  selector: 'abc',
  template: require('./foo.html?ng-template'),
})
class TestComponent {
  constructor(foo: Foo) {}
}`,
    },

    'should handle template literal strings': {
      code: `import { Component } from '@angular/core';
    import { Foo } from './foo';

    @Component({
      selector: 'abc',
      templateUrl: \`./foo.html\`
    })
    class TestComponent {
      constructor(foo: Foo) {}
    }`,
      output: `import { Component } from '@angular/core';
import { Foo } from './foo';
@Component({
  selector: 'abc',
  template: require('./foo.html?ng-template'),
})
class TestComponent {
  constructor(foo: Foo) {}
}`,
    },

    'should append to existing style urls': {
      code: `import { Component } from '@angular/core';
    import { Foo } from './foo';

    @Component({
      selector: 'abc',
      styles: [\`.foo {
        color: red;
      }\`],
      styleUrls: ['./foo.scss']
    })
    class TestComponent {
      constructor(foo: Foo) {}
    }`,
      output: `import { Component } from '@angular/core';
import { Foo } from './foo';
@Component({
  selector: 'abc',
  styles: [
    require('./foo.scss?ng-template').default,
    \`
      .foo {
        color: red;
      }
    \`,
  ],
})
class TestComponent {
  constructor(foo: Foo) {}
}`,
    },
  },
});
