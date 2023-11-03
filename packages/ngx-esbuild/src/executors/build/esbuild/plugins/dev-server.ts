import { logger } from '@nx/devkit';
import chalk from 'chalk';
import { Plugin } from 'esbuild';
import path from 'node:path';

import {
  createDevServer,
  DevServer,
  DevServerOptions,
} from './dev-server/create-dev-server';

interface DevServerPluginConfig
  extends Omit<DevServerOptions, 'buildOptions' | 'immutableFiles'> {
  cwd: string;
  enabled: boolean;
}

/**
 * Plugin to start a local http server with live reload for development
 * @param config
 */
export function devServerPlugin(config: DevServerPluginConfig): Plugin {
  return {
    name: 'dev-server',
    setup(build) {
      if (!config.enabled) {
        return;
      }

      let devServer: DevServer | undefined;

      build.onEnd(async (result) => {
        if (result.errors.length > 0) {
          return;
        }
        const immutableFiles = new Set(
          Object.keys(result.metafile?.outputs ?? {}).map((file) =>
            // Convert to absolute path
            path.join(config.cwd, file)
          )
        );

        if (devServer) {
          await devServer.onRebuild(immutableFiles);
        } else {
          // create a new instance of the dev server, only do this once on the first build
          devServer = await createDevServer({
            ...config,
            immutableFiles,
            buildOptions: build.initialOptions,
          });
          logger.info(
            `[${chalk.green('esbuild')}] Started dev server at ${chalk.blue(
              devServer.url
            )}`
          );
        }
      });
    },
  };
}
