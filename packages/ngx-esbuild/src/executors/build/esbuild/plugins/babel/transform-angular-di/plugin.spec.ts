import { pluginTester } from 'babel-plugin-tester';

import { transformAngularDIPlugin } from './plugin';

pluginTester({
  plugin: transformAngularDIPlugin,
  pluginName: 'transform-angular-di',
  babelOptions: {
    plugins: [
      '@babel/plugin-syntax-typescript',
      ['@babel/plugin-syntax-decorators', { legacy: true }],
    ],
  },
  tests: {
    'should add annotation for non TS parameters': {
      code: `import { Component } from '@angular/core';
    import { Foo } from './foo';

    @Component({
      selector: 'abc',
      templateUrl: './foo.html',
    })
    class TestComponent {
      constructor(foo: Foo) {}
    }`,
      output: `import { Component } from '@angular/core';
import { Foo } from './foo';
@Component({
  selector: 'abc',
  templateUrl: './foo.html',
})
class TestComponent {
  static ctorParameters = () => [
    {
      type: Foo,
    },
  ];
  constructor(foo: Foo) {}
}`,
    },

    'should add the annotation for TS parameters': {
      code: `import { Component } from '@angular/core';
    import { Foo } from './foo';

    @Component({
      selector: 'abc',
      templateUrl: './foo.html',
    })
    class TestComponent {
      constructor(private foo: Foo) {}
    }`,
      output: `import { Component } from '@angular/core';
import { Foo } from './foo';
@Component({
  selector: 'abc',
  templateUrl: './foo.html',
})
class TestComponent {
  static ctorParameters = () => [
    {
      type: Foo,
    },
  ];
  constructor(private foo: Foo) {}
}`,
    },

    'should transform non TS params using Inject': {
      code: `
        import { Component, Inject } from '@angular/core';
        import { Foo, FOO } from './foo';
        @Component({
          selector: 'abc',
          templateUrl: './foo.html',
        })
        class TestComponent {
          constructor(
            @Inject(FOO)
            foo: Foo
          ) {}
        }
      `,
      output: `
        import { Component, Inject } from '@angular/core';
        import { Foo, FOO } from './foo';
        @Component({
          selector: 'abc',
          templateUrl: './foo.html',
        })
        class TestComponent {
          static ctorParameters = () => [
            {
              type: FOO,
            },
          ];
          constructor(foo: Foo) {}
        }
      `,
    },

    'should transform TS params using Inject': {
      code: `
        import { Component, Inject } from '@angular/core';
        import { Foo, FOO } from './foo';
        @Component({
          selector: 'abc',
          templateUrl: './foo.html',
        })
        class TestComponent {
          constructor(
            @Inject(FOO)
            private foo: Foo
          ) {}
        }
      `,
      output: `
        import { Component, Inject } from '@angular/core';
        import { Foo, FOO } from './foo';
        @Component({
          selector: 'abc',
          templateUrl: './foo.html',
        })
        class TestComponent {
          static ctorParameters = () => [
            {
              type: FOO,
            },
          ];
          constructor(private foo: Foo) {}
        }
      `,
    },

    'should not do anything for non decorated classes': `
      import { Component } from '@angular/core';
      import { Foo } from './foo';
      class TestComponent {
        constructor(foo: Foo) {}
      }
    `,

    'should not do anything for non injectable classes': `
      import { FooBar } from 'decorator-lib';
      import { Foo } from './foo';
      @FooBar({
        selector: 'abc',
        templateUrl: './foo.html',
      })
      class TestComponent {
        constructor(foo: Foo) {}
      }
    `,

    'should handle injectable params with primitive types': {
      code: `
      import { Component, Inject } from '@angular/core';
      import { Foo, FOO } from './foo';
      @Component({
        selector: 'abc',
        templateUrl: './foo.html',
      })
      class TestComponent {
        constructor(
          @Inject(FOO)
          foo: string
        ) {}
      }
    `,
      output: `
        import { Component, Inject } from '@angular/core';
        import { Foo, FOO } from './foo';
        @Component({
          selector: 'abc',
          templateUrl: './foo.html',
        })
        class TestComponent {
          static ctorParameters = () => [
            {
              type: FOO,
            },
          ];
          constructor(foo: string) {}
        }
      `,
    },

    'should handle injectable params with default values': {
      code: `import { Component, Optional } from '@angular/core';
    import { Foo, FOO } from './foo';
    @Component({
      selector: 'abc',
      templateUrl: './foo.html',
    })
    class TestComponent {
      constructor(@KeepThis() @Inject(AUTOMATION_FEATURE_STRATEGIES) featureStrategies: AutomationStrategy[] | AutomationStrategy[][] = []) {}
    }`,
      output: `import { Component, Optional } from '@angular/core';
import { Foo, FOO } from './foo';
@Component({
  selector: 'abc',
  templateUrl: './foo.html',
})
class TestComponent {
  static ctorParameters = () => [
    {
      type: AUTOMATION_FEATURE_STRATEGIES,
    },
  ];
  constructor(
    @KeepThis()
    featureStrategies: AutomationStrategy[] | AutomationStrategy[][] = []
  ) {}
}`,
    },

    'should handle generics': {
      code: `import { Component } from '@angular/core';
    import { Foo } from './foo';

    @Component({
      selector: 'abc',
      templateUrl: './foo.html',
    })
    class TestComponent {
      constructor(foo: Foo<Actions>) {}
    }`,
      output: `import { Component } from '@angular/core';
import { Foo } from './foo';
@Component({
  selector: 'abc',
  templateUrl: './foo.html',
})
class TestComponent {
  static ctorParameters = () => [
    {
      type: Foo,
    },
  ];
  constructor(foo: Foo<Actions>) {}
}`,
    },

    'should handle DI class property initializers': {
      code: `import { Component, Optional } from '@angular/core';
    import { Foo } from './foo';

    @Component({
      selector: 'abc',
      templateUrl: './foo.html',
    })
    class TestComponent {
      constructor(
        @SkipSelf()
        @Optional()
        @Inject(TAG_PICKER_AVAILABLE_TAGS)
        readonly tagPickerAvailableTags$: Observable<DocumentTag[]> = of([])
      ) {}
    }`,
      output: `import { Component, Optional } from '@angular/core';
import { Foo } from './foo';
@Component({
  selector: 'abc',
  templateUrl: './foo.html',
})
class TestComponent {
  static ctorParameters = () => [
    {
      type: TAG_PICKER_AVAILABLE_TAGS,
      decorators: [
        {
          type: SkipSelf,
        },
        {
          type: Optional,
        },
      ],
    },
  ];
  constructor(
    readonly tagPickerAvailableTags$: Observable<DocumentTag[]> = of([])
  ) {}
}`,
    },

    'should add Inject decorator for exported classes': {
      code: `import { Component } from '@angular/core';
    import { Foo } from './foo';

    @Component({
      selector: 'abc',
      templateUrl: './foo.html',
    })
    export class TestComponent {
      constructor(foo: Foo) {}
    }`,
      output: `import { Component } from '@angular/core';
import { Foo } from './foo';
@Component({
  selector: 'abc',
  templateUrl: './foo.html',
})
export class TestComponent {
  static ctorParameters = () => [
    {
      type: Foo,
    },
  ];
  constructor(foo: Foo) {}
}`,
    },

    'should handle string tokens': {
      code: `import { Component, Inject } from '@angular/core';
    import { Foo } from './foo';

    @Component({
      selector: 'abc',
      templateUrl: './foo.html',
    })
    class TestComponent {
      constructor(@Inject('FOO') foo: Foo) {}
    }`,
      output: `import { Component, Inject } from '@angular/core';
import { Foo } from './foo';
@Component({
  selector: 'abc',
  templateUrl: './foo.html',
})
class TestComponent {
  static ctorParameters = () => [
    {
      type: 'FOO',
    },
  ];
  constructor(foo: Foo) {}
}`,
    },

    'should handle injection flag decorators': {
      code: `import { Component, Optional } from '@angular/core';
    import { Foo } from './foo';

    @Component({
      selector: 'abc',
      templateUrl: './foo.html',
    })
    class TestComponent {
      constructor(
        @SkipSelf()
        @Optional()
        foo: Foo
      ) {}
    }`,
      output: `import { Component, Optional } from '@angular/core';
import { Foo } from './foo';
@Component({
  selector: 'abc',
  templateUrl: './foo.html',
})
class TestComponent {
  static ctorParameters = () => [
    {
      type: Foo,
      decorators: [
        {
          type: SkipSelf,
        },
        {
          type: Optional,
        },
      ],
    },
  ];
  constructor(foo: Foo) {}
}`,
    },
  },
});
