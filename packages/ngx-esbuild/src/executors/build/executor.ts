import { ExecutorContext } from '@nx/devkit';
import { createAsyncIterable } from '@nx/devkit/src/utils/async-iterable';
import esbuild from 'esbuild';
import assert from 'node:assert';

import { getEsbuildOptions } from './esbuild/get-esbuild-options';
import { BuildExecutorSchema } from './schema';
import {
  getBuildTargetConfig,
  getServeTargetConfig,
} from './target-config/get-target-config';

export default async function* runExecutor(
  options: BuildExecutorSchema,
  context: ExecutorContext
) {
  const buildTargetConfig = getBuildTargetConfig(
    options.buildTarget,
    options.configurationName,
    context
  );
  const serveTargetConfig = getServeTargetConfig(
    options.serveTarget,
    options.configurationName,
    context
  );

  const projectName = context.projectName ?? context.workspace?.defaultProject;

  assert(projectName, 'Could not find project name');

  const esbuildOptions = await getEsbuildOptions(
    buildTargetConfig,
    serveTargetConfig,
    options,
    projectName,
    context.cwd
  );

  if (options.serve) {
    return yield* createAsyncIterable<{ success: boolean }>(
      async ({ next, done }) => {
        const ctx = await esbuild.context({
          ...esbuildOptions,
          plugins: [
            ...(esbuildOptions.plugins ?? []),
            {
              name: 'nx-watch-plugin',
              setup(build) {
                build.onEnd((result) => {
                  next({
                    success: result.errors.length === 0,
                  });
                });
              },
            },
          ],
        });

        await ctx.watch();

        registerCleanupCallback(() => {
          ctx.dispose();
          done(); // return from async iterable
        });
      }
    );
  } else {
    await esbuild.build(esbuildOptions);
    return {
      success: true,
    };
  }
}

// Stolen from the official nx esbuild plugin: https://github.com/nrwl/nx/blob/master/packages/esbuild/src/executors/esbuild/esbuild.impl.ts#L237-L248
function registerCleanupCallback(callback: () => void) {
  const wrapped = () => {
    callback();
    process.off('SIGINT', wrapped);
    process.off('SIGTERM', wrapped);
    process.off('exit', wrapped);
  };

  process.on('SIGINT', wrapped);
  process.on('SIGTERM', wrapped);
  process.on('exit', wrapped);
}
