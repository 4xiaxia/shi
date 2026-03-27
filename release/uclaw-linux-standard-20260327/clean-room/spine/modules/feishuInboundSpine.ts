import type { AgentRoleKey } from './contracts';
import { createFeishuInboundRequest, type ImageAttachment, type InboundRequest } from './inbound';
import { createRequestTrace } from './requestTrace';
import { stripFeishuMentions } from './feishuText';

export interface FeishuWebhookMention {
  key?: string;
  name?: string;
}

export interface FeishuWebhookMessage {
  message_id?: string;
  chat_id?: string;
  message_type?: string;
  content?: string;
  mentions?: FeishuWebhookMention[];
}

export interface FeishuWebhookEvent {
  sender?: {
    sender_id?: {
      user_id?: string;
      open_id?: string;
    };
    sender_type?: string;
  };
  message?: FeishuWebhookMessage;
}

export interface FeishuWebhookEnvelope {
  chatId: string;
  messageId: string;
  senderId?: string;
  senderType?: string;
  messageType?: string;
  rawContent: string;
  mentions?: FeishuWebhookMention[];
}

export type FeishuEnvelopeReadResult =
  | { kind: 'ok'; envelope: FeishuWebhookEnvelope }
  | { kind: 'ignore'; reason: 'non-message-event'; eventType?: string }
  | { kind: 'bad_request'; reason: 'missing-message-payload' };

export type FeishuTextNormalizationResult =
  | { kind: 'ok'; chatId: string; messageId: string; senderId?: string; text: string; imageKey?: string }
  | { kind: 'ignore'; reason: 'sender-is-bot' | 'unsupported-message-type' | 'empty-content' | 'empty-text' | 'non-string-text' }
  | { kind: 'bad_request'; reason: 'invalid-message-content'; error: string };

export function readFeishuWebhookEnvelope(params: {
  headerEventType?: string;
  event?: FeishuWebhookEvent;
}): FeishuEnvelopeReadResult {
  if (params.headerEventType !== 'im.message.receive_v1') {
    return {
      kind: 'ignore',
      reason: 'non-message-event',
      eventType: params.headerEventType,
    };
  }

  const message = params.event?.message;
  const chatId = message?.chat_id;
  const messageId = message?.message_id;

  if (!message || !chatId || !messageId) {
    return {
      kind: 'bad_request',
      reason: 'missing-message-payload',
    };
  }

  return {
    kind: 'ok',
    envelope: {
      chatId,
      messageId,
      senderId: params.event?.sender?.sender_id?.user_id || params.event?.sender?.sender_id?.open_id,
      senderType: params.event?.sender?.sender_type,
      messageType: message.message_type,
      rawContent: message.content || '',
      mentions: message.mentions,
    },
  };
}

export function normalizeFeishuTextEnvelope(
  envelope: FeishuWebhookEnvelope
): FeishuTextNormalizationResult {
  if (envelope.senderType === 'app' || envelope.senderType === 'bot') {
    return {
      kind: 'ignore',
      reason: 'sender-is-bot',
    };
  }

  if (envelope.messageType === 'image') {
    const rawContent = envelope.rawContent.trim();
    if (!rawContent) {
      return {
        kind: 'ignore',
        reason: 'empty-content',
      };
    }

    try {
      const content = JSON.parse(rawContent) as unknown;
      const imageKey = (
        typeof content === 'object'
        && content !== null
        && 'image_key' in content
        && typeof (content as Record<string, unknown>).image_key === 'string'
      )
        ? String((content as Record<string, unknown>).image_key)
        : '';

      if (!imageKey) {
        return {
          kind: 'bad_request',
          reason: 'invalid-message-content',
          error: 'image_key missing in Feishu image payload',
        };
      }

      return {
        kind: 'ok',
        chatId: envelope.chatId,
        messageId: envelope.messageId,
        senderId: envelope.senderId,
        text: '[用户发送了一张图片，请描述或分析图片内容]',
        imageKey,
      };
    } catch (error) {
      return {
        kind: 'bad_request',
        reason: 'invalid-message-content',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (envelope.messageType && envelope.messageType !== 'text') {
    return {
      kind: 'ignore',
      reason: 'unsupported-message-type',
    };
  }
  // Keep legacy-compatible behavior: if message_type is missing, still attempt text parsing.

  const rawContent = envelope.rawContent.trim();
  if (!rawContent) {
    return {
      kind: 'ignore',
      reason: 'empty-content',
    };
  }

  try {
    const content = JSON.parse(rawContent) as unknown;
    const rawText = (
      typeof content === 'object'
      && content !== null
      && 'text' in content
    )
      ? (content as Record<string, unknown>).text
      : '';

    if (typeof rawText !== 'string') {
      return {
        kind: 'ignore',
        reason: 'non-string-text',
      };
    }

    const text = stripFeishuMentions(rawText, envelope.mentions);
    if (!text.trim()) {
      return {
        kind: 'ignore',
        reason: 'empty-text',
      };
    }

    return {
      kind: 'ok',
      chatId: envelope.chatId,
      messageId: envelope.messageId,
      senderId: envelope.senderId,
      text,
    };
  } catch (error) {
    return {
      kind: 'bad_request',
      reason: 'invalid-message-content',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function buildFeishuInboundRequest(params: {
  chatId: string;
  messageId: string;
  text: string;
  imageAttachments?: ImageAttachment[];
  agentRoleKey: AgentRoleKey;
  modelId?: string;
  scopeKey: string;
}): InboundRequest {
  const trace = createRequestTrace({
    platform: 'feishu',
    channelId: params.chatId,
    externalMessageId: params.messageId,
    agentRoleKey: params.agentRoleKey,
    modelId: params.modelId,
  });

  return createFeishuInboundRequest({
    chatId: params.chatId,
    text: params.text,
    messageId: params.messageId,
    imageAttachments: params.imageAttachments,
    agentRoleKey: params.agentRoleKey,
    modelId: params.modelId,
    scopeKey: params.scopeKey,
    trace,
  });
}
