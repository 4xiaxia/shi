import type { AgentRoleKey, SessionRecord, SessionStore } from './contracts';
import type { RequestTrace } from './requestTrace';

export interface IngressStartInput {
  title: string;
  cwd: string;
  prompt: string;
  systemPrompt?: string;
  skillIds?: string[];
  agentRoleKey: AgentRoleKey;
  modelId?: string;
  metadata?: Record<string, unknown>;
}

export interface IngressContinueInput {
  sessionId: string;
  prompt: string;
  metadata?: Record<string, unknown>;
}

export interface IngressPreparationResult {
  session: SessionRecord;
  userMessageId?: string;
  traceLog: string[];
}

function inferSessionSourceFromTrace(trace: RequestTrace): 'desktop' | 'external' {
  // {标记} P1-SESSION-SOURCE-TRUTH: 会话来源由入口 trace 固化，不再只靠 title/systemPrompt 推断。
  return trace.platform === 'web' ? 'desktop' : 'external';
}

export function prepareNewSession(
  sessionStore: SessionStore,
  trace: RequestTrace,
  input: IngressStartInput
): IngressPreparationResult {
  const session = sessionStore.createSession(
    input.title,
    input.cwd,
    input.systemPrompt || '',
    'local',
    input.skillIds || [],
    {
      agentRoleKey: input.agentRoleKey,
      modelId: input.modelId,
      sourceType: inferSessionSourceFromTrace(trace),
    }
  );

  sessionStore.updateSession(session.id, {
    status: 'running',
    agentRoleKey: input.agentRoleKey,
    modelId: input.modelId,
    sourceType: inferSessionSourceFromTrace(trace),
  });
  const userMessage = sessionStore.addMessage(session.id, {
    type: 'user',
    content: input.prompt,
    metadata: input.metadata,
  });

  return {
    session: sessionStore.getSession(session.id) || session,
    userMessageId: userMessage.id,
    traceLog: [
      `[trace:${trace.traceId}] create-session session=${session.id}`,
      `[trace:${trace.traceId}] add-user-message session=${session.id} message=${userMessage.id}`,
      `[trace:${trace.traceId}] mark-running session=${session.id}`,
      '[rule] 不在入口层预写 shared-thread，避免孤立 user 脏数据',
    ],
  };
}

export function prepareContinueSession(
  sessionStore: SessionStore,
  trace: RequestTrace,
  input: IngressContinueInput
): IngressPreparationResult {
  const session = sessionStore.getSession(input.sessionId);
  if (!session) {
    throw new Error(`Session not found: ${input.sessionId}`);
  }

  const userMessage = sessionStore.addMessage(input.sessionId, {
    type: 'user',
    content: input.prompt,
    metadata: input.metadata,
  });
  sessionStore.updateSession(input.sessionId, {
    status: 'running',
    sourceType: inferSessionSourceFromTrace(trace),
  });

  return {
    session: sessionStore.getSession(input.sessionId) || session,
    userMessageId: userMessage.id,
    traceLog: [
      `[trace:${trace.traceId}] continue-session session=${input.sessionId}`,
      `[trace:${trace.traceId}] add-user-message session=${input.sessionId} message=${userMessage.id}`,
      `[trace:${trace.traceId}] mark-running session=${input.sessionId}`,
      '[rule] 用户消息先入 session/message，shared-thread 统一在完成态收尾',
    ],
  };
}
