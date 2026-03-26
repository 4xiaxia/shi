import fs from 'fs';
import path from 'path';

export interface ConversationBackupMessage {
  id: string;
  type: string;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ConversationBackupSession {
  id: string;
  title: string;
  cwd: string;
  status: string;
  agentRoleKey?: string;
  systemPrompt?: string;
  sourceType?: 'desktop' | 'external';
  createdAt: number;
  updatedAt: number;
  messages: ConversationBackupMessage[];
}

export interface ConversationRoleTimelineEntry {
  messageId: string;
  sessionId: string;
  sessionTitle: string;
  type: string;
  content: string;
  timestamp: number;
  channel: string;
}

export interface ConversationRoleTimelineFile {
  role: string;
  generatedAt: string;
  sourceSessionCount: number;
  entryCount: number;
  entries: ConversationRoleTimelineEntry[];
}

export function getBackupDateStamp(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function shouldRunDailyConversationBackup(lastBackupDate: string | null | undefined, now: number = Date.now()): boolean {
  return getBackupDateStamp(now) !== (lastBackupDate ?? '');
}

function sanitizeFileSegment(value: string): string {
  return value.replace(/[<>:"/\\|?*\x00-\x1f]+/g, '-').replace(/\s+/g, ' ').trim() || 'session';
}

function clipUnicode(value: string, maxChars: number): string {
  return Array.from(value).slice(0, Math.max(0, maxChars)).join('');
}

function normalizeRoleSegment(value: string | undefined): string {
  const normalized = sanitizeFileSegment((value || '').trim()).replace(/\s+/g, '_');
  return normalized || 'organizer';
}

function normalizeSummarySegment(value: string): string {
  const compact = value
    .replace(/^\[[^\]]+\]\s*/g, '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const clipped = clipUnicode(compact, 10);
  const sanitized = sanitizeFileSegment(clipped).replace(/\s+/g, '');
  return sanitized || '未命名摘要';
}

function getPrimaryConversationSummary(session: ConversationBackupSession): string {
  const preferredTitle = session.title.trim();
  if (preferredTitle) {
    return normalizeSummarySegment(preferredTitle);
  }

  const latestUserMessage = [...session.messages]
    .reverse()
    .find((message) => message.type === 'user' && message.content.trim());

  if (latestUserMessage) {
    return normalizeSummarySegment(latestUserMessage.content);
  }

  return '未命名摘要';
}

function formatBackupFileTime(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('') + '-' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

function inferChannelFromSession(session: ConversationBackupSession): string {
  // {标记} P1-CHANNEL-HINT-EXPLICIT: 备份时间线优先读显式 sourceType，推断仅作兼容兜底。
  if (session.sourceType === 'desktop') {
    return 'desktop';
  }
  if (session.sourceType === 'external') {
    const scope = session.systemPrompt?.trim() ?? '';
    if (
      scope.startsWith('im:feishu:chat:')
      || scope.startsWith('im:feishu:ws:')
      || scope.startsWith('im:feishu:app:')
    ) {
      return 'feishu';
    }
    if (scope.startsWith('im:dingtalk:chat:')) {
      return 'dingtalk';
    }
    if (scope.startsWith('im:qq:')) {
      return 'qq';
    }
    if (scope.startsWith('im:telegram:')) {
      return 'telegram';
    }
    return 'external';
  }

  const scope = session.systemPrompt?.trim() ?? '';
  if (
    scope.startsWith('im:feishu:chat:')
    || scope.startsWith('im:feishu:ws:')
    || scope.startsWith('im:feishu:app:')
  ) {
    return 'feishu';
  }
  if (scope.startsWith('im:dingtalk:chat:')) {
    return 'dingtalk';
  }

  const title = session.title.trim();
  if (title.endsWith(' - 飞书对话')) {
    return 'feishu';
  }
  if (title.endsWith(' - 钉钉对话')) {
    return 'dingtalk';
  }
  if (title.endsWith(' - QQ对话')) {
    return 'qq';
  }
  if (title.endsWith(' - Telegram对话')) {
    return 'telegram';
  }

  return 'desktop';
}

function buildRoleTimelineFileName(roleKey: string): string {
  return `${normalizeRoleSegment(roleKey)}-timeline.json`;
}

function buildRoleTimelineFiles(
  sessions: ConversationBackupSession[],
  now: number
): Array<{ fileName: string; payload: ConversationRoleTimelineFile }> {
  const grouped = new Map<string, ConversationBackupSession[]>();
  for (const session of sessions) {
    const role = normalizeRoleSegment(session.agentRoleKey);
    const list = grouped.get(role) ?? [];
    list.push(session);
    grouped.set(role, list);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([role, roleSessions]) => {
      const entries = roleSessions.flatMap((session) => {
        const channel = inferChannelFromSession(session);
        return session.messages
          .filter((message) => message.content.trim())
          .map((message) => ({
            messageId: message.id,
            sessionId: session.id,
            sessionTitle: session.title,
            type: message.type,
            content: message.content,
            timestamp: message.timestamp,
            channel,
          }));
      }).sort((a, b) => {
        if (a.timestamp !== b.timestamp) {
          return a.timestamp - b.timestamp;
        }
        if (a.sessionId !== b.sessionId) {
          return a.sessionId.localeCompare(b.sessionId);
        }
        return a.messageId.localeCompare(b.messageId);
      });

      return {
        fileName: buildRoleTimelineFileName(role),
        payload: {
          role,
          generatedAt: new Date(now).toISOString(),
          sourceSessionCount: roleSessions.length,
          entryCount: entries.length,
          entries,
        },
      };
    });
}

export function writeConversationBackupSnapshot(options: {
  directory: string;
  sessions: ConversationBackupSession[];
  now?: number;
}): {
  backupDir: string;
  manifestPath: string;
  sessionCount: number;
} {
  const now = options.now ?? Date.now();
  const stamp = getBackupDateStamp(now);
  const backupDir = path.resolve(options.directory, stamp);
  fs.mkdirSync(backupDir, { recursive: true });

  const files: string[] = [];
  const roleTimelineFiles = buildRoleTimelineFiles(options.sessions, now);
  for (const roleTimeline of roleTimelineFiles) {
    fs.writeFileSync(
      path.join(backupDir, roleTimeline.fileName),
      JSON.stringify(roleTimeline.payload, null, 2),
      'utf8'
    );
    files.push(roleTimeline.fileName);
  }

  const manifestPath = path.join(backupDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    generatedAt: new Date(now).toISOString(),
    sessionCount: options.sessions.length,
    roleFileCount: roleTimelineFiles.length,
    files,
    roleFiles: roleTimelineFiles.map((item) => ({
      role: item.payload.role,
      fileName: item.fileName,
      entryCount: item.payload.entryCount,
      sourceSessionCount: item.payload.sourceSessionCount,
    })),
  }, null, 2), 'utf8');

  return {
    backupDir,
    manifestPath,
    sessionCount: options.sessions.length,
  };
}
