const FEISHU_MESSAGE_MAX_CHARS = 3500;
const FEISHU_EMPTY_RESULT_MESSAGE = '已收到消息，但这一轮没有生成可发送的文本结果。';

type FeishuWebhookMention = {
  key?: string;
  name?: string;
};

type SessionMessage = {
  id: string;
  type: string;
  content: string;
};

type SessionLike = {
  messages?: SessionMessage[];
};

export function splitFeishuMessageChunks(text: string, maxChars: number = FEISHU_MESSAGE_MAX_CHARS): string[] {
  const normalized = text.trim();
  if (!normalized) {
    return [FEISHU_EMPTY_RESULT_MESSAGE];
  }

  const chunks: string[] = [];
  let remaining = normalized;
  while (remaining.length > maxChars) {
    let cutIndex = remaining.lastIndexOf('\n', maxChars);
    if (cutIndex < Math.floor(maxChars * 0.5)) {
      cutIndex = remaining.lastIndexOf(' ', maxChars);
    }
    if (cutIndex < Math.floor(maxChars * 0.5)) {
      cutIndex = maxChars;
    }
    chunks.push(remaining.slice(0, cutIndex).trim());
    remaining = remaining.slice(cutIndex).trim();
  }
  if (remaining) {
    chunks.push(remaining);
  }
  return chunks.filter(Boolean);
}

export function stripFeishuMentions(text: string, mentions?: FeishuWebhookMention[]): string {
  if (!text || !Array.isArray(mentions) || mentions.length === 0) {
    return text.trim();
  }

  let result = text;
  for (const mention of mentions) {
    const mentionName = mention.name?.trim();
    const mentionKey = mention.key?.trim();
    if (mentionName) {
      result = result.replace(new RegExp(`@${mentionName}\\s*`, 'g'), ' ');
    }
    if (mentionKey) {
      result = result.replace(new RegExp(mentionKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ' ');
    }
  }

  return result.replace(/\s+/g, ' ').trim();
}

export function extractLatestAssistantReply(
  session: SessionLike | null,
  knownAssistantIds: Set<string>
): string | null {
  if (!session?.messages?.length) {
    return null;
  }

  const candidates = session.messages
    .filter((message) => message.type === 'assistant' && !knownAssistantIds.has(message.id))
    .map((message) => message.content?.trim())
    .filter((content): content is string => Boolean(content));

  return candidates.length > 0 ? candidates[candidates.length - 1] : null;
}

export function extractLatestErrorMessage(session: SessionLike | null): string | null {
  if (!session?.messages?.length) {
    return null;
  }

  const candidate = session.messages
    .slice()
    .reverse()
    .find((message) => message.type === 'system' && typeof message.content === 'string' && message.content.trim());

  return candidate?.content?.trim() ?? null;
}

export { FEISHU_EMPTY_RESULT_MESSAGE, FEISHU_MESSAGE_MAX_CHARS };
