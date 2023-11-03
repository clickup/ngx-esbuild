import {
  DEV_SERVER_RECONNECT_POLL_INTERVAL,
  DEV_SERVER_WEBSOCKET_PATH,
} from './shared-constants';

const { protocol, host } = new URL(window.location.href);
const webSocketUrl = `ws${
  protocol === 'https:' ? 's' : ''
}://${host}${DEV_SERVER_WEBSOCKET_PATH}`;
const webSocket = new WebSocket(webSocketUrl);

webSocket.addEventListener('message', (event) => {
  try {
    const payload = JSON.parse(event.data) as unknown;
    if (
      payload &&
      typeof payload === 'object' &&
      'action' in payload &&
      payload.action === 'reload'
    ) {
      window.location.reload();
    }
  } catch (error: unknown) {
    console.error('[Dev Server] Error while handling websocket message.');
    console.error(error);
  }
});

// Approach taken from https://stackoverflow.com/questions/22431751/websocket-how-to-automatically-reconnect-after-it-dies
webSocket.addEventListener('close', () => {
  pollForReconnect(webSocket.url);
});

function pollForReconnect(url: string): void {
  const newWs = new WebSocket(url);

  newWs.addEventListener('open', () => {
    console.log(
      'Dev server live reload connection is re-established, reloading page with latest changes'
    );
    window.location.reload();
  });

  newWs.addEventListener('close', () => {
    console.log(
      `Dev server live reload connection is closed. Reconnect will be attempted in ${DEV_SERVER_RECONNECT_POLL_INTERVAL}ms.`
    );
    setTimeout(() => {
      pollForReconnect(url);
    }, DEV_SERVER_RECONNECT_POLL_INTERVAL);
  });

  newWs.addEventListener('error', () => {
    newWs.close();
  });
}
