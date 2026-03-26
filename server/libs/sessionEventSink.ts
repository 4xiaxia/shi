import type { CoworkMessage } from '../../src/main/coworkStore';
import {
  batchedBroadcastMessageUpdate,
  broadcastToAll,
  broadcastToRoom,
  flushPendingMessageUpdates,
} from '../websocket';

export function emitSessionMessage(sessionId: string, message: CoworkMessage): void {
  broadcastToRoom('cowork', sessionId, {
    type: 'cowork:stream:message',
    data: { sessionId, message },
  });
}

export function emitSessionMessageUpdate(sessionId: string, messageId: string, content: string): void {
  batchedBroadcastMessageUpdate(sessionId, messageId, content);
}

export function emitSessionComplete(sessionId: string, claudeSessionId: string | null = null): void {
  flushPendingMessageUpdates(sessionId);
  broadcastToRoom('cowork', sessionId, {
    type: 'cowork:stream:complete',
    data: { sessionId, claudeSessionId },
  });
}

export function emitSessionError(sessionId: string, error: string): void {
  flushPendingMessageUpdates(sessionId);
  broadcastToRoom('cowork', sessionId, {
    type: 'cowork:stream:error',
    data: { sessionId, error },
  });
}

export function emitSessionsChanged(sessionId: string, reason: string): void {
  broadcastToAll({
    type: 'cowork:sessions:changed',
    data: { sessionId, reason },
  });
}
