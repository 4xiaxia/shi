import type { Database } from 'sql.js';
import type { AgentRoleKey } from './contracts';

export interface IdentityKey {
  agentRoleKey: AgentRoleKey;
  // modelId is metadata only. Daily memory isolation must stay on agentRoleKey.
  modelId?: string;
}

export interface ThreadMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  channel_hint?: string;
}

export interface LLMExtractedData {
  userInfo?: Record<string, unknown>;
  projectContext?: Record<string, unknown>;
  decisions?: Array<Record<string, unknown>>;
  notes?: Array<Record<string, unknown>>;
}

export function scanActiveIdentities(db: Database): IdentityKey[] {
  try {
    const rows = db.exec('SELECT DISTINCT agent_role_key FROM identity_thread_24h');
    if (!rows.length || !rows[0].values.length) {
      return [];
    }
    return rows[0].values.map((row) => ({
      agentRoleKey: String(row[0] || ''),
      modelId: '',
    }));
  } catch {
    return [];
  }
}

export function readThreadMessages(db: Database, identity: IdentityKey): ThreadMessage[] {
  try {
    const rows = db.exec(
      'SELECT context FROM identity_thread_24h WHERE agent_role_key = ? LIMIT 1',
      [identity.agentRoleKey]
    );
    if (!rows.length || !rows[0].values.length) {
      return [];
    }

    const raw = rows[0].values[0][0] as string;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((message: any) => message.role && message.content)
      .map((message: any) => ({
        role: message.role as 'user' | 'assistant',
        content: String(message.content),
        timestamp: message.timestamp ?? undefined,
        channel_hint: message.channel_hint ?? undefined,
      }));
  } catch {
    return [];
  }
}

function hasNonEmpty(obj: Record<string, unknown>): boolean {
  return Object.values(obj).some((value) => {
    if (value === '' || value === null || value === undefined) {
      return false;
    }
    if (Array.isArray(value) && value.length === 0) {
      return false;
    }
    return true;
  });
}

function stripEmpty(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === '' || value === null || value === undefined) {
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }
    result[key] = value;
  }
  return result;
}

export async function mergeToIdentityMemory(params: {
  db: Database;
  saveDb: () => void;
  identity: IdentityKey;
  extracted: LLMExtractedData;
}): Promise<void> {
  const { identityMemoryManager } = await import('../../../src/main/memory/identityMemoryManager');
  identityMemoryManager.setDatabase(params.db, params.saveDb);

  const existing = await identityMemoryManager.getIdentityMemory(params.identity);
  const updates: Record<string, unknown> = {};
  const existingDecisions = Array.isArray((existing as any).decisions) ? (existing as any).decisions : [];
  const existingNotes = Array.isArray((existing as any).notes) ? (existing as any).notes : [];

  if (params.extracted.userInfo && hasNonEmpty(params.extracted.userInfo)) {
    updates.userInfo = { ...existing.userInfo, ...stripEmpty(params.extracted.userInfo) };
  }

  if (params.extracted.projectContext && hasNonEmpty(params.extracted.projectContext)) {
    updates.projectContext = { ...existing.projectContext, ...stripEmpty(params.extracted.projectContext) };
  }

  const roleLabels: Record<string, string> = {
    organizer: '信息整理助手',
    writer: '文字撰写员',
    designer: '美术编辑师',
    analyst: '数据分析师',
  };
  const roleName = roleLabels[params.identity.agentRoleKey] || params.identity.agentRoleKey;
  const today = new Date().toISOString().slice(0, 10);

  if (params.extracted.decisions?.length) {
    const prefixedDecisions = params.extracted.decisions.map((decision) => ({
      ...decision,
      date: (decision.date as string) || today,
      decision: `[${roleName}] ${String(decision.decision || '')}`,
    }));
    const existingKeys = new Set(existingDecisions.map((item: any) => `${item.date}|${item.decision}`));
    const fresh = prefixedDecisions.filter((decision) => !existingKeys.has(`${decision.date}|${decision.decision}`));
    if (fresh.length) {
      updates.decisions = [...existingDecisions, ...fresh];
    }
  }

  if (params.extracted.notes?.length) {
    const prefixedNotes = params.extracted.notes.map((note) => ({
      ...note,
      topic: `[${roleName}-${today}] ${String(note.topic || '')}`,
    }));
    const existingKeys = new Set(existingNotes.map((item: any) => `${item.topic}|${item.content}`));
    const fresh = prefixedNotes.filter((note) => !existingKeys.has(`${note.topic}|${note.content}`));
    if (fresh.length) {
      updates.notes = [...existingNotes, ...fresh];
    }
  }

  if (Object.keys(updates).length === 0) {
    return;
  }

  await identityMemoryManager.updateIdentityMemory(params.identity, updates as any);
}
