export const worker = new SharedWorker(
  new URL('./shared-worker.worker', import.meta.url)
);
