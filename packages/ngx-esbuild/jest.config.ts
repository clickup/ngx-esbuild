/* eslint-disable */
export default {
  displayName: 'ngx-esbuild',
  preset: '../../jest.preset.js',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/ngx-esbuild',
  coveragePathIgnorePatterns: ['/node_modules/', '/__fixtures__/'],
  setupFilesAfterEnv: ['<rootDir>/test-setup.ts'],
  // Required to allow running esbuild within jest: https://github.com/jestjs/jest/issues/4422
  testEnvironment: 'node',
  globals: {
    Uint8Array: Uint8Array,
  },
};
