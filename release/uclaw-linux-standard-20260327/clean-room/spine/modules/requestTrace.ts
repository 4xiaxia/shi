import type { AgentRoleKey, ChannelPlatform } from './contracts';

export interface InboundTraceInput {
  platform: ChannelPlatform;
  channelId: string;
  externalMessageId?: string;
  sessionId?: string;
  agentRoleKey?: AgentRoleKey;
  modelId?: string;
}

export interface RequestTrace {
  traceId: string;
  platform: ChannelPlatform;
  channelId: string;
  externalMessageId?: string;
  sessionId?: string;
  agentRoleKey?: AgentRoleKey;
  modelId?: string;
  startedAt: number;
}

function sanitize(input: string | undefined): string {
  return (input || '')
    .trim()
    .replace(/[^\w:@.-]+/g, '-')
    .slice(0, 64);
}

export function createRequestTrace(input: InboundTraceInput): RequestTrace {
  const startedAt = Date.now();
  const traceId = [
    sanitize(input.platform),
    sanitize(input.agentRoleKey),
    sanitize(input.channelId),
    sanitize(input.externalMessageId || input.sessionId),
    String(startedAt),
  ]
    .filter(Boolean)
    .join('|');

  return {
    traceId,
    platform: input.platform,
    channelId: input.channelId,
    externalMessageId: input.externalMessageId,
    sessionId: input.sessionId,
    agentRoleKey: input.agentRoleKey,
    modelId: input.modelId,
    startedAt,
  };
}

export function formatTraceLog(trace: RequestTrace, stage: string, extra?: string): string {
  const pieces = [
    `[trace:${trace.traceId}]`,
    `stage=${stage}`,
    `platform=${trace.platform}`,
    `channel=${trace.channelId}`,
  ];

  if (trace.agentRoleKey) {
    pieces.push(`role=${trace.agentRoleKey}`);
  }
  if (trace.sessionId) {
    pieces.push(`session=${trace.sessionId}`);
  }
  if (trace.externalMessageId) {
    pieces.push(`message=${trace.externalMessageId}`);
  }
  if (extra) {
    pieces.push(extra);
  }

  return pieces.join(' ');
}
