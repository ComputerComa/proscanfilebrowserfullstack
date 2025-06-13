// API route: /api/stream/updates
import { NextRequest } from 'next/server';
import path from 'path';
import chokidar from 'chokidar';

// Store client send functions
let clients: Array<(data: string) => void> = [];
let watcherStarted = false;
let batchTimeout: NodeJS.Timeout | null = null;
const BATCH_INTERVAL = 2000; // 2 seconds

function batchedNotify() {
  if (batchTimeout) return;
  batchTimeout = setTimeout(() => {
    clients.forEach(fn => fn('refresh'));
    batchTimeout = null;
  }, BATCH_INTERVAL);
}

function startFileWatcher() {
  if (watcherStarted) return;
  watcherStarted = true;
  const recordingsDir = path.resolve('Files/Recordings');
  const watcher = chokidar.watch(recordingsDir, { ignoreInitial: true, persistent: true });
  watcher.on('all', () => {
    batchedNotify();
  });
  console.log('File watcher started for', recordingsDir);
}

export async function GET(req: NextRequest) {
  startFileWatcher();
  const stream = new ReadableStream({
    start(controller: ReadableStreamDefaultController) {
      const send = (data: string) => {
        controller.enqueue(`data: ${data}\n\n`);
      };
      clients.push(send);
      req.signal?.addEventListener('abort', () => {
        clients = clients.filter(fn => fn !== send);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    }
  });
}
