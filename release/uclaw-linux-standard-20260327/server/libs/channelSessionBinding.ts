import type { SqliteStore } from '../sqliteStore.web';
import type { CoworkSession, CoworkStore } from '../../src/main/coworkStore';

const CHANNEL_SESSION_BINDING_PREFIX = 'channel_session_binding:';

type ChannelSessionBindingRecord = {
  sessionId: string;
  scopeKey: string;
  updatedAt: number;
};

// 【1.0链路】CHANNEL-BIND-KEY: 渠道 + scopeKey + 角色 -> 唯一会话绑定键。
export function buildChannelBindingKey(
  platform: string,
  scopeKey: string,
  agentRoleKey: string
): string {
  return `${CHANNEL_SESSION_BINDING_PREFIX}${platform}:${scopeKey}:${agentRoleKey}`;
}

export function getBoundChannelSession(
  store: SqliteStore,
  coworkStore: CoworkStore,
  bindingKey: string
): CoworkSession | null {
  const record = store.get<ChannelSessionBindingRecord>(bindingKey);
  if (!record?.sessionId) {
    return null;
  }

  const session = coworkStore.getSession(record.sessionId);
  if (session) {
    return session;
  }

  store.delete(bindingKey);
  return null;
}

// 【1.0链路】CHANNEL-BIND-WRITE: 渠道入站首次命中后，把外部会话作用域写回 kv 真相源。
export function bindChannelSession(
  store: SqliteStore,
  bindingKey: string,
  sessionId: string,
  scopeKey: string
): void {
  store.set<ChannelSessionBindingRecord>(bindingKey, {
    sessionId,
    scopeKey,
    updatedAt: Date.now(),
  });
}

export function findLatestScopedSession(
  coworkStore: CoworkStore,
  options: {
    agentRoleKey: string;
    scopeKeys: string[];
  }
): CoworkSession | null {
  const scopeKeys = Array.from(new Set(options.scopeKeys.filter(Boolean)));
  if (scopeKeys.length === 0) {
    return null;
  }

  const placeholders = scopeKeys.map(() => '?').join(', ');
  const result = coworkStore.getDatabase().exec(`
    SELECT id
    FROM cowork_sessions
    WHERE agent_role_key = ?
      AND system_prompt IN (${placeholders})
    ORDER BY updated_at DESC
    LIMIT 1
  `, [options.agentRoleKey, ...scopeKeys]);

  const sessionId = result[0]?.values?.[0]?.[0];
  if (typeof sessionId !== 'string' || !sessionId) {
    return null;
  }

  return coworkStore.getSession(sessionId);
}
