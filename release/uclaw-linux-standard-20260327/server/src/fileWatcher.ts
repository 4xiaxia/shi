import * as chokidar from 'chokidar';
import { broadcastToAll, WSMessage } from '../websocket';

export function startFileWatcher(workspacePath: string) {
  const watcher = chokidar.watch(workspacePath, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
  });

  watcher
    .on('add', path => {
      broadcastToAll({
        type: 'file:changed',
        data: { path, type: 'create', timestamp: Date.now() }
      });
    })
    .on('change', path => {
      broadcastToAll({
        type: 'file:changed',
        data: { path, type: 'modify', timestamp: Date.now() }
      });
    })
    .on('unlink', path => {
      broadcastToAll({
        type: 'file:changed',
        data: { path, type: 'delete', timestamp: Date.now() }
      });
    });

  return watcher;
}
