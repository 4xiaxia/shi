import type {
  AgentRoleKey,
  ChannelPlatform,
  ChannelSessionBindingRecord,
  KvStore,
  SessionRecord,
  SessionStore,
} from './contracts';

const CHANNEL_SESSION_BINDING_PREFIX = 'channel_session_binding:';

export function buildChannelBindingKey(
  platform: ChannelPlatform,
  scopeKey: string,
  agentRoleKey: AgentRoleKey
): string {
  return `${CHANNEL_SESSION_BINDING_PREFIX}${platform}:${scopeKey}:${agentRoleKey}`;
}

export function getBoundChannelSession(
  store: KvStore,
  sessionStore: SessionStore,
  bindingKey: string
): SessionRecord | null {
  const record = store.get<ChannelSessionBindingRecord>(bindingKey);
  if (!record?.sessionId) {
    return null;
  }

  const session = sessionStore.getSession(record.sessionId);
  if (session) {
    return session;
  }

  store.delete(bindingKey);
  return null;
}

export function bindChannelSession(
  store: KvStore,
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
  sessionStore: SessionStore,
  options: {
    agentRoleKey: AgentRoleKey;
    scopeKeys: string[];
  }
): SessionRecord | null {
  // {标记} P0-IDENTITY-BOUNDARY: 渠道会话复用只认 agentRoleKey + scopeKey；modelId 只是运行时元信息，不能参与切桶。
  const scopeKeys = Array.from(new Set(options.scopeKeys.filter(Boolean)));
  if (scopeKeys.length === 0) {
    return null;
  }

  const placeholders = scopeKeys.map(() => '?').join(', ');
  const result = sessionStore.getDatabase().exec(
    `
      SELECT id
      FROM cowork_sessions
      WHERE agent_role_key = ?
        AND system_prompt IN (${placeholders})
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    [options.agentRoleKey, ...scopeKeys]
  );

  const sessionId = result[0]?.values?.[0]?.[0];
  if (typeof sessionId !== 'string' || !sessionId) {
    return null;
  }

  return sessionStore.getSession(sessionId);
}
