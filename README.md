# ngx-esbuild

[![Build Status](https://github.com/clickup/ngx-esbuild/actions/workflows/ci.yml/badge.svg)](https://github.com/clickup/ngx-esbuild/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/@clickup%2Fngx-esbuild.svg)](http://badge.fury.io/js/@clickup%2Fngx-esbuild)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> [ClickUp](https://clickup.com/)'s esbuild powered local dev server, open sourced so you can speed up developing your own Angular applications!

<div align="center">

<a href="https://clickup.com/careers/senior-frontend-engineer" target="_blank"><img src="https://i.imgur.com/0RWYhEB.jpg"></a>

</div>

## About

This is an alternative local development environment for large Angular applications, powered by [esbuild](https://esbuild.github.io/).

It makes a different set of trade-offs than the [official Angular CLI esbuild solution](https://angular.io/guide/esbuild) to achieve faster build times and use less memory, namely:

- It does not typecheck your code
- As it does not typecheck, it cannot AoT compile your code either
- It is designed for local development only, and does not support building for production

It mainly works by implementing a version of these 2 ideas:

- https://github.com/angular/angular/issues/43131
- https://github.com/angular/angular/issues/43165

Hopefully one day, the Angular CLI will support some of this out of the box, but until then, this is a great alternative.

## Why would I use this?

- You have a large Angular application
- Local dev rebuilds are slow or use too much memory
- You are not using buildable libraries or module federation
- AOT / Typechecking is not essential
- You've already tried the [Angular CLI's esbuild solution](https://angular.io/guide/esbuild) and it's not fast enough for you

## Getting Started

> [!IMPORTANT]  
> Currently this only works with Nx workspaces, but we're planning on making it work with regular Angular CLI projects as well. See https://github.com/clickup/ngx-esbuild/issues/3 for more info.

Install with your favorite package manager:

```bash
npm install -D @clickup/ngx-esbuild
```

Add a new target to your apps `project.json` (assuming you have a `build` target using the `@angular-devkit/build-angular:browser` or `@angular-devkit/build-angular:browser-esbuild` executors):

```json
"targets": {
  ... other targets ...
  "serve-esbuild": {
    "executor": "@clickup/ngx-esbuild:build",
    "options": {
      "serve": true
    }
  }
}
```

Run with `nx serve-esbuild <project-name>` to start the dev server powered by esbuild!

### Typechecking

The builder is fast as it makes a different set of trade-offs than the Angular CLI esbuild solution. Namely, it doesn't do any typechecking.

While showing type errors in your IDE works to some extent, you probably want to still be able to typecheck your entire project.

So to enable typechecking, you can add another target like this:

```json
"type-check": {
  "executor": "nx:run-commands",
  "options": {
    "command": "npx tsc -p apps/your-app/tsconfig.app.json --noEmit --watch --incremental --pretty"
  }
}
```

Then run with `nx type-check <project-name>`

If you want to type-check component templates, you can run the same command but replace `tsc` with `ngc` instead (this will use a much larger amount of memory though and may be more likely to cause performance problems):

```
"command": "npx ngc -p apps/your-app/tsconfig.app.json --noEmit --watch --incremental --pretty"
```

You can even run the dev server + typechecking side by side using [stmux](https://www.npmjs.com/package/stmux):

```bash
stmux -e '' -- [ "nx serve-esbuild demo" .. "nx type-check demo" ]
```

## Supported angular devkit options

These options will be read from the existing `build` target that uses the angular devkit builder.

### Supported

Many of these options only support a subset of different ways that they can be configured by the Angular CLI. If something doesn't work in your project, please file an issue and we can probably add support!

- `assets` (partially supported)
- `main`
- `polyfills`
- `tsConfig`
- `scripts` (partially supported)
- `styles` (partially supported)
- `stylePreprocessorOptions` (only scss is supported currently)
- `fileReplacements` (partially supported)
- `outputPath`
- `sourceMap` (partially supported)
- `index` (partially supported)
- `webWorkerTsConfig`

### Unsupported (none of these options will have any effect)

This solution is intended to only ever work for local development, and will never support building for production. So, any options related to production builds will never be supported, for everything else it may be possible to add support in the future.

- `inlineStyleLanguage`
- `optimization`
- `resourcesOutputPath`
- `aot`
- `vendorChunk`
- `commonChunk`
- `baseHref`
- `deployUrl`
- `verbose`
- `progress`
- `i18nMissingTranslation`
- `i18nDuplicateTranslation`
- `localize`
- `watch`
- `outputHashing`
- `poll`
- `deleteOutputPath`
- `preserveSymlinks`
- `extractLicenses`
- `buildOptimizer`
- `namedChunks`
- `subresourceIntegrity`
- `serviceWorker`
- `ngswConfigPath`
- `statsJson`
- `budgets`
- `crossOrigin`
- `allowedCommonJsDependencies`

## Local development

- Ensure you have Node 18 or higher installed
- Install pnpm: `corepack enable`
- Install local dev dependencies: `pnpm install`

### Running tests

```bash
pnpm nx affected:test
```

### Linting

```bash
pnpm nx affected:lint
```

### Running the demo app

```bash
pnpm demo
```
