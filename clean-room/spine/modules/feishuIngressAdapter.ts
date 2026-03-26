import crypto from 'crypto';
import { FEISHU_EMPTY_RESULT_MESSAGE, splitFeishuMessageChunks } from './feishuText';
import type { FeishuRuntimeAppConfig } from './feishuRuntime';

const FEISHU_API_BASE_URL = 'https://open.feishu.cn';
const FEISHU_TOKEN_EXPIRY_BUFFER_MS = 60_000;
export const FEISHU_BUSY_MESSAGE = '当前这个身份正在处理中，请稍后再发一条消息。';
export const FEISHU_ACK_MESSAGE = '送达ok，努力思考ing...';
export { FEISHU_EMPTY_RESULT_MESSAGE };

type FeishuTokenResponse = {
  code?: number;
  tenant_access_token?: string;
  expire?: number;
};

const feishuTenantTokenCache = new Map<string, { token: string; expiresAt: number }>();

export function verifyFeishuSignature(
  signature: string,
  timestamp: string,
  nonce: string,
  body: string,
  secret: string
): boolean {
  const raw = `${timestamp}${nonce}${secret}${body}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return hash === signature;
}

export function resolveFeishuWebhookChallenge(challenge?: string): { challenge: string } | null {
  return challenge ? { challenge } : null;
}

export async function getFeishuTenantAccessToken(
  app: FeishuRuntimeAppConfig,
  apiBaseUrl: string = FEISHU_API_BASE_URL
): Promise<string> {
  if (!app.appId || !app.appSecret) {
    throw new Error('Feishu app credentials are incomplete.');
  }

  const cacheKey = app.appId;
  const cached = feishuTenantTokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + FEISHU_TOKEN_EXPIRY_BUFFER_MS) {
    return cached.token;
  }

  const response = await fetch(`${apiBaseUrl}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: app.appId,
      app_secret: app.appSecret,
    }),
  });

  const payload = await response.json().catch(() => ({} as FeishuTokenResponse)) as FeishuTokenResponse;
  if (!response.ok || payload.code !== 0 || typeof payload.tenant_access_token !== 'string') {
    throw new Error(`Feishu tenant token request failed: HTTP ${response.status}`);
  }

  const expireSeconds = typeof payload.expire === 'number' ? payload.expire : 7200;
  feishuTenantTokenCache.set(cacheKey, {
    token: payload.tenant_access_token,
    expiresAt: Date.now() + expireSeconds * 1000,
  });
  return payload.tenant_access_token;
}

export async function sendFeishuTextReply(params: {
  app: FeishuRuntimeAppConfig;
  chatId: string;
  text: string;
  replyToMessageId?: string;
  apiBaseUrl?: string;
}): Promise<void> {
  if (!params.chatId && !params.replyToMessageId) {
    throw new Error('Feishu reply target is required.');
  }

  const token = await getFeishuTenantAccessToken(params.app, params.apiBaseUrl || FEISHU_API_BASE_URL);
  const chunks = splitFeishuMessageChunks(params.text);

  for (const chunk of chunks) {
    const response = params.replyToMessageId
      ? await fetch(`${params.apiBaseUrl || FEISHU_API_BASE_URL}/open-apis/im/v1/messages/${params.replyToMessageId}/reply`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          msg_type: 'text',
          content: JSON.stringify({ text: chunk }),
        }),
      })
      : await fetch(`${params.apiBaseUrl || FEISHU_API_BASE_URL}/open-apis/im/v1/messages?receive_id_type=chat_id`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receive_id: params.chatId,
          msg_type: 'text',
          content: JSON.stringify({ text: chunk }),
        }),
      });

    const payload = await response.json().catch(() => ({})) as { code?: number };
    if (!response.ok || payload.code !== 0) {
      throw new Error(`Feishu send message failed: HTTP ${response.status}`);
    }
  }
}
