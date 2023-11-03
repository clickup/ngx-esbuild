import cheerio from 'cheerio';
import esbuild from 'esbuild';
import express from 'express';
import assert from 'node:assert';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import open from 'open';
import { WebSocket, WebSocketServer } from 'ws';

import {
  DEV_SERVER_RECONNECT_POLL_INTERVAL,
  DEV_SERVER_WEBSOCKET_PATH,
} from './shared-constants';

export interface DevServerOptions {
  rootDir: string;
  open: boolean;
  port: number;
  hostname: string;
  liveReload: boolean;
  immutableFiles: Set<string>;
  buildOptions: esbuild.BuildOptions;
  applyServerMiddleware?(app: express.Express): express.Express;
}

export interface DevServer {
  server: http.Server;
  url: string;
  onRebuild(immutableFiles: Set<string>): Promise<void>;
}

const WEBSOCKET_CLIENT_PATH = '/__web-dev-server__websocket-client.js';

export async function createDevServer(
  options: DevServerOptions
): Promise<DevServer> {
  let { immutableFiles } = options;
  let indexHtml = await getIndexHtml(options.rootDir, options.liveReload);
  const websocketClientCode = await getWebsocketClientCode(
    options.buildOptions
  );

  const app = express();
  app.use(
    express.static(options.rootDir, {
      index: false, // serve from the catch all route instead
      setHeaders(res, absoluteFilePath) {
        if (immutableFiles.has(absoluteFilePath)) {
          res.setHeader('Cache-Control', 'public, max-age=3153600, immutable');
        }
      },
    })
  );

  app.get(WEBSOCKET_CLIENT_PATH, (req, res) => {
    res.type('js');
    res.send(websocketClientCode);
  });

  options.applyServerMiddleware?.(app);

  // catch all route that serves the index.html for html5 routing
  app.get('*', (req, res) => {
    res.type('html');
    res.send(indexHtml);
  });

  const url = `http://${options.hostname}:${options.port}`;
  const server = app.listen(options.port, options.hostname);

  const wssConnections = new Set<WebSocket>();

  if (options.liveReload) {
    const wss = new WebSocketServer({
      server,
      path: DEV_SERVER_WEBSOCKET_PATH,
    });
    wss.on('connection', (connection) => {
      wssConnections.add(connection);
      connection.on('close', () => {
        wssConnections.delete(connection);
      });
    });
  }

  if (options.open) {
    // Wait for any previous clients to reconnect
    await setTimeout(DEV_SERVER_RECONNECT_POLL_INTERVAL * 3);
    // Only open the browser if there are no other clients connected, otherwise the previous client pages will be reloaded
    if (wssConnections.size === 0) {
      await open(url);
    }
  }
  return {
    server,
    url,
    async onRebuild(newValue: Set<string>) {
      immutableFiles = newValue;
      indexHtml = await getIndexHtml(options.rootDir, options.liveReload);
      wssConnections.forEach((connection) => {
        connection.send(JSON.stringify({ action: 'reload' }));
      });
    },
  };
}

async function getIndexHtml(
  rootDir: string,
  liveReload: boolean
): Promise<string> {
  const contents = await fs.promises.readFile(
    path.resolve(rootDir, 'index.html'),
    'utf8'
  );
  if (!liveReload) {
    return contents;
  }
  const $ = cheerio.load(contents);
  $('body').append(`<script src="${WEBSOCKET_CLIENT_PATH}"></script>`);
  return $.html();
}

async function getWebsocketClientCode(
  buildOptions: esbuild.BuildOptions
): Promise<string> {
  const bundledWsClient = await esbuild.build({
    entryPoints: [getWebsocketClientEntryPoint()],
    bundle: true,
    target: buildOptions.target,
    metafile: true,
    tsconfig: buildOptions.tsconfig,
    write: false,
  });

  assert(
    bundledWsClient.outputFiles?.length === 1,
    'Expected only one output file'
  );

  return bundledWsClient.outputFiles[0].text;
}

function getWebsocketClientEntryPoint(): string {
  const clientFileName = 'websocket-client';
  try {
    // only works for local development in this repo
    return require.resolve(`./${clientFileName}.ts`);
  } catch {
    // else we are in the compiled package
    return require.resolve(`./${clientFileName}.js`);
  }
}
