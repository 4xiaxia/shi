import type { IdentityThreadContext, IdentityThreadMessage } from './contracts';

type SqlDatabase = {
  exec(sql: string, params?: Array<string | number | null>): Array<{
    values: unknown[][];
  }>;
  run(sql: string, params?: Array<string | number | null>): void;
};

const KEEP_RECENT = 120;
const CONTEXT_CHAR_LIMIT = 300;
const SUMMARY_CHAR_LIMIT = 18;
const LEADING_FILLER_RE = /^(?:[啊呀哇呢啦嘛哦喔欸诶唉咦哈哼嗯呃][啊呀哇呢啦嘛哦喔欸诶唉咦哈哼嗯呃,.，。!！?？~、\s]*)+/u;
const TRAILING_FILLER_RE = /(?:[啊呀哇呢啦嘛哦喔欸诶唉咦哈哼嗯呃][啊呀哇呢啦嘛哦喔欸诶唉咦哈哼嗯呃,.，。!！?？~、\s]*)+$/u;
const PURE_FILLER_RE = /^(?:[啊呀哇呢啦嘛哦喔欸诶唉咦哈哼嗯呃,.，。!！?？~、\s]|哈哈|呵呵|嘿嘿)+$/u;
const REPEATED_WORD_RE = /\b([A-Za-z]+)(?:\s+\1\b)+/gi;
const USER_PREFIX_RE = /^(?:(?:请(?:帮我)?|帮我|帮忙|麻烦|想问(?:一下)?|问一下|我想|我要|我需要|我希望|希望|需要|能不能|可不可以|请你|拜托)\s*)+/u;
const ASSISTANT_PREFIX_RE = /^(?:(?:好的?|收到|明白|可以|我来|我会|我先|我现在|我继续|结论是|结论|建议是|建议|我看到|我检查到|我确认了|先说结论|先给结论)\s*[,:：，。!！?？~、 ]*)+/u;
const GENERIC_ACK_RE = /^(?:收到|好的?|明白|可以|处理中|继续|稍等|稍后|已收到|看到了|收到啦|ok|okay)$/iu;
const LOW_SIGNAL_RE = /^(?:go+|ok(?:ay)?|收到|继续|求助|救助|测试|哈哈|呵呵|嘿嘿|嗯+|啊+|哦+|哼+|呀+|好+|1+|2+|3+|6+|复活|锵锵)$/iu;

const CHANNEL_LABELS: Record<string, string> = {
  feishu: '飞书',
  dingtalk: '钉钉',
  web: '网页',
  desktop: '桌面',
  qq: 'QQ',
  telegram: 'Telegram',
};

function formatTime(timestamp: unknown): string {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) {
    return '--:--';
  }
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function normalizeChannel(channelHint?: string): string {
  const key = String(channelHint || '').trim().toLowerCase();
  return CHANNEL_LABELS[key] || key || '未知';
}

function stripMeaninglessFiller(raw: string): string {
  const collapsed = raw
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[`*_#>[\]{}|]/g, ' ')
    .replace(/(?:@[\w.-]+|<at user_id=.*?<\/at>)/gi, ' ')
    .replace(REPEATED_WORD_RE, '$1')
    .trim();

  if (!collapsed || PURE_FILLER_RE.test(collapsed)) {
    return '';
  }

  const withoutLeading = collapsed.replace(LEADING_FILLER_RE, '').trim();
  const withoutTrailing = withoutLeading.replace(TRAILING_FILLER_RE, '').trim();
  const normalized = withoutTrailing.replace(/\s+/g, ' ').trim();
  if (!normalized || PURE_FILLER_RE.test(normalized)) {
    return '';
  }

  return normalized;
}

function isLowSignalSummary(raw: string): boolean {
  const normalized = raw.replace(/\s+/g, '').toLowerCase();
  if (!normalized) {
    return true;
  }
  if (/^[\d._-]+$/.test(normalized)) {
    return true;
  }
  return LOW_SIGNAL_RE.test(normalized);
}

function pickMeaningfulClause(raw: string): string {
  const clauses = raw
    .split(/[。！？!?；;\n]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (clauses.length === 0) {
    return '';
  }

  let selected = clauses[0];
  let clauseIndex = 1;
  while (selected.length < 8 && clauseIndex < clauses.length) {
    selected += clauses[clauseIndex];
    clauseIndex += 1;
  }
  return selected.trim();
}

function normalizeSummary(raw: string): string {
  const cleaned = stripMeaninglessFiller(raw);
  if (!cleaned) {
    return '';
  }

  const withoutUrl = cleaned.replace(/https?:\/\/\S+/gi, ' ').trim();
  const withoutRolePreamble = withoutUrl
    .replace(USER_PREFIX_RE, '')
    .replace(ASSISTANT_PREFIX_RE, '')
    .trim();
  const clause = pickMeaningfulClause(withoutRolePreamble || withoutUrl);
  const normalized = clause
    .replace(/[“”"'`]/g, '')
    .replace(/[,:：，。!！?？~、]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized || GENERIC_ACK_RE.test(normalized) || isLowSignalSummary(normalized)) {
    return '';
  }

  return Array.from(normalized).slice(0, SUMMARY_CHAR_LIMIT).join('');
}

function buildLines(messages: IdentityThreadMessage[]): string[] {
  const recent = messages.slice(-KEEP_RECENT);
  const lines: string[] = [];

  for (let index = 0; index < recent.length; index += 1) {
    const current = recent[index];
    const next = recent[index + 1];
    const currentSummary = normalizeSummary(current.content);
    if (!currentSummary) {
      continue;
    }

    const prefix = `${normalizeChannel(current.channel_hint)}-${formatTime(current.timestamp)}-`;
    if (current.role === 'user' && next?.role === 'assistant') {
      const nextSummary = normalizeSummary(next.content);
      lines.push(nextSummary ? `${prefix}${currentSummary}->${nextSummary}` : `${prefix}${currentSummary}`);
      if (nextSummary) {
        index += 1;
      }
      continue;
    }

    lines.push(current.role === 'assistant' ? `${prefix}已答:${currentSummary}` : `${prefix}${currentSummary}`);
  }

  return lines;
}

function compactLines(lines: string[]): string {
  const kept: string[] = [];
  let totalChars = 0;

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    const nextChars = line.length + (kept.length > 0 ? 1 : 0);
    if (totalChars + nextChars > CONTEXT_CHAR_LIMIT) {
      break;
    }
    kept.unshift(line);
    totalChars += nextChars;
  }

  return kept.join('\n');
}

export function getIdentityThreadContext(db: SqlDatabase, agentRoleKey: string): IdentityThreadContext | null {
  const result = db.exec(
    `
      SELECT context, message_count, expires_at
      FROM identity_thread_24h
      WHERE agent_role_key = ?
      LIMIT 1
    `,
    [agentRoleKey]
  );

  const row = result[0]?.values?.[0];
  if (!row) {
    return null;
  }

  const [contextStr, messageCount, expiresAtRaw] = row as [string, number, number];
  const expiresAtMs = expiresAtRaw < 1e12 ? expiresAtRaw * 1000 : expiresAtRaw;
  if (expiresAtMs && Date.now() >= expiresAtMs) {
    return null;
  }

  let messages: IdentityThreadMessage[] = [];
  try {
    messages = JSON.parse(contextStr);
  } catch {
    return null;
  }

  const compactHistory = compactLines(buildLines(messages));
  if (!compactHistory) {
    return null;
  }

  return {
    historyText: `<sharedWorkThread>\n跨渠道连续性交接摘要：\n${compactHistory}\n</sharedWorkThread>`,
    messageCount,
    expiresInHours: Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 3600000)),
  };
}

export function appendToIdentityThread(
  db: SqlDatabase,
  agentRoleKey: string,
  message: { role: 'user' | 'assistant'; content: string },
  channelHint?: string
): void {
  const summarizedContent = normalizeSummary(message.content);
  if (!summarizedContent) {
    return;
  }

  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000;
  const nextMessage: IdentityThreadMessage = {
    role: message.role,
    content: summarizedContent,
    channel_hint: channelHint,
    timestamp: now,
  };

  const existing = db.exec(
    'SELECT id, context FROM identity_thread_24h WHERE agent_role_key = ? LIMIT 1',
    [agentRoleKey]
  );
  const row = existing[0]?.values?.[0];

  if (!row) {
    db.run(
      `
        INSERT INTO identity_thread_24h (
          id, agent_role_key, model_id, context, message_count, channel_hint, created_at, updated_at, expires_at
        ) VALUES (?, ?, '', ?, 1, ?, ?, ?, ?)
      `,
      [
        `thread_${now}`,
        agentRoleKey,
        JSON.stringify([nextMessage]),
        channelHint || null,
        now,
        now,
        expiresAt,
      ]
    );
    return;
  }

  const [threadId, contextStr] = row as [string, string];
  let messages: IdentityThreadMessage[] = [];
  try {
    messages = JSON.parse(contextStr);
  } catch {
    messages = [];
  }

  messages.push(nextMessage);
  messages = messages.slice(-KEEP_RECENT);

  db.run(
    `
      UPDATE identity_thread_24h
      SET context = ?, message_count = ?, updated_at = ?, expires_at = ?, channel_hint = ?
      WHERE id = ?
    `,
    [
      JSON.stringify(messages),
      messages.length,
      now,
      expiresAt,
      channelHint || null,
      threadId,
    ]
  );
}

export function clearIdentityThreadForRole(db: SqlDatabase, agentRoleKey: string): void {
  db.run('DELETE FROM identity_thread_24h WHERE agent_role_key = ?', [agentRoleKey]);
}

export function migrateThreadsDropModelId(db: SqlDatabase): void {
  const all = db.exec(
    'SELECT id, agent_role_key, context, expires_at FROM identity_thread_24h ORDER BY updated_at DESC'
  );
  const rows = all[0]?.values || [];
  if (rows.length === 0) {
    return;
  }

  const byRole = new Map<string, Array<{ id: string; context: string; expiresAt: number }>>();
  for (const row of rows) {
    const roleKey = String(row[1] || '');
    if (!roleKey) {
      continue;
    }
    const list = byRole.get(roleKey) || [];
    list.push({
      id: String(row[0]),
      context: String(row[2] || '[]'),
      expiresAt: Number(row[3] || 0),
    });
    byRole.set(roleKey, list);
  }

  for (const [roleKey, threads] of byRole.entries()) {
    if (threads.length <= 1) {
      db.run('UPDATE identity_thread_24h SET model_id = ? WHERE id = ?', ['', threads[0].id]);
      continue;
    }

    let merged: IdentityThreadMessage[] = [];
    for (const thread of threads) {
      try {
        merged.push(...JSON.parse(thread.context));
      } catch {
        continue;
      }
    }
    merged.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    merged = merged.slice(-KEEP_RECENT);

    const now = Date.now();
    const expiresAt = Math.max(...threads.map((item) => (item.expiresAt < 1e12 ? item.expiresAt * 1000 : item.expiresAt)));
    db.run(
      'UPDATE identity_thread_24h SET context = ?, message_count = ?, model_id = ?, updated_at = ?, expires_at = ? WHERE id = ?',
      [JSON.stringify(merged), merged.length, '', now, expiresAt, threads[0].id]
    );

    for (let index = 1; index < threads.length; index += 1) {
      db.run('DELETE FROM identity_thread_24h WHERE id = ?', [threads[index].id]);
    }
    db.run('UPDATE identity_thread_24h SET model_id = ? WHERE agent_role_key = ?', ['', roleKey]);
  }
}
