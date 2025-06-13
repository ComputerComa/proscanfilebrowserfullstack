// src/server/fileWatcher.ts
import path from 'path';
import chokidar from 'chokidar';

const recordingsDir = path.resolve('Files/Recordings');

// Watch for changes in the recordings directory
const watcher = chokidar.watch(recordingsDir, { ignoreInitial: true, persistent: true });

watcher.on('add', () => {
  // notifyClients('refresh');
});
watcher.on('unlink', () => {
  // notifyClients('refresh');
});
watcher.on('addDir', () => {
  // notifyClients('refresh');
});
watcher.on('unlinkDir', () => {
  // notifyClients('refresh');
});

console.log('File watcher started for', recordingsDir);
