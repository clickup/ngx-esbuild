import { logger } from '@nx/devkit';
import chalk from 'chalk';
import esbuild, { Plugin } from 'esbuild';

/**
 * Logs the build state (success / error) and the time to the console
 * @param watch - whether we are in watch mode (serving the app for local dev) or not
 */
export function logBuildStatePlugin({ watch }: { watch: boolean }): {
  start: Plugin;
  end: Plugin;
} {
  let time: number;
  return {
    start: {
      name: 'log-build-state-start',
      setup(build) {
        build.onStart(() => {
          time = Date.now();
          if (watch) {
            logger.info(`${chalk.blue('[esbuild] ')}Build started`);
          }
        });
      },
    },
    end: {
      name: 'log-build-state-end',
      setup(build) {
        build.onEnd((result: esbuild.BuildResult) => {
          const success = result.errors.length === 0;
          const timeString = `${chalk.yellow(`${Date.now() - time}ms`)}`;
          const color = success ? chalk.green : chalk.red;
          const suffix = watch ? ', watching for changes...' : '';
          const message = success
            ? `Build succeeded in ${timeString}`
            : `Build finished in ${timeString} with errors (see above)`;

          logger.info(`[${color('esbuild')}] ${message}${suffix}`);
        });
      },
    },
  };
}
