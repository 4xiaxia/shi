/**
 * {ROUTE} /api/im/dingtalk/webhook
 * {BREAKPOINT} PHASE1-FROZEN-DINGTALK-HEAVY-PATH
 * {FLOW} PHASE1-FROZEN: 钉钉当前仍走旧 CoworkRunner 重链，一期冻结，只做标记不继续扩修。
 * {标记} DingTalk Webhook Handler
 * {标记} 功能：接收钉钉消息，绑定身份，触发 AI 回复
 * {标记} 集成：CoworkRunner + identity_thread_24h
 * {标记} 待评估-冻结一期: 钉钉链路暂不纳入第一期迁桥与轻链收敛，避免分散主线修复注意力
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import type { RequestContext } from '../src/index';
import {
  bindChannelSession,
  buildChannelBindingKey,
  findLatestScopedSession,
  getBoundChannelSession,
} from '../libs/channelSessionBinding';

const DINGTALK_SESSION_SCOPE_PREFIX = 'im:dingtalk:chat:';

export function setupDingTalkWebhookRoutes(app: Router) {
  const router = Router();

  /**
   * {标记} POST /api/im/dingtalk/webhook
   * 钉钉消息 webhook 处理器
   */
  router.post('/webhook', async (req: Request, res: Response) => {
    try {
      const { store, coworkStore, coworkRunner } = req.context as RequestContext;
      const body = req.body;

      // Get dingtalk config from store
      const kvData = store.get('im_config');
      const imConfig = (kvData && typeof kvData === 'object') ? kvData as Record<string, any> : {} as Record<string, any>;
      const dingtalkConfig = imConfig.dingtalk || {};

      if (!dingtalkConfig.appSecret) {
        console.error('[DingTalk] App secret not configured');
        return res.sendStatus(500);
      }

      // 1. 验证签名
      const timestamp = req.headers['timestamp'] as string;
      const sign = req.headers['sign'] as string;

      if (sign && !verifySignature(timestamp, dingtalkConfig.appSecret, sign)) {
        console.error('[DingTalk] Signature verification failed');
        return res.sendStatus(401);
      }

      // 2. 只处理文本消息
      if (body.msgtype !== 'text') {
        console.log('[DingTalk] Ignoring non-text message:', body.msgtype);
        return res.json({ success: true });
      }

      // 3. 提取消息内容
      const chatId = body.conversationId || body.sessionWebhook;
      const senderId = body.senderId || body.senderStaffId;
      const text = body.text?.content || '';

      console.log('[DingTalk] Message received:', {
        chatId,
        senderId,
        text: text.substring(0, 50),
      });

      // 4. 【关键】获取或创建 Session (绑定身份)
      const session = await getOrCreateDingTalkSession(
        coworkStore,
        store,
        chatId,
        senderId,
        text
      );

      console.log('[DingTalk] Using session:', {
        sessionId: session.id,
        agentRoleKey: session.agentRoleKey,
        modelId: session.modelId,
      });

      // 5. 触发 CoworkRunner 执行AI回复
      const sessionWebhook = body.sessionWebhook;
      if (sessionWebhook && coworkRunner) {
        // 异步执行,先返回200给钉钉
        res.json({ success: true });

        void (async () => {
          try {
            // {标记} P0-2-FIX: 记录已有assistant消息ID，用于提取新回复
            const baselineSession = coworkStore.getSession(session.id);
            const knownAssistantIds = new Set(
              baselineSession?.messages
                ?.filter((m: any) => m.type === 'assistant')
                .map((m: any) => m.id) ?? []
            );

            // {标记} P0-2-FIX: 检查会话是否活跃，决定用startSession还是continueSession
            if (coworkRunner.isSessionActive(session.id) || session.status === 'running') {
              // 会话正在运行，通知用户稍后再试
              await fetch(sessionWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  msgtype: 'text',
                  text: { content: '当前这个身份正在处理中，请稍后再发一条消息。' },
                }),
              });
              return;
            }

            // {标记} P0-2-FIX: 使用startSession + text确认模式，与飞书保持一致
            // 使用cleanedText（去掉/writer等命令前缀）
            const promptText = session.cleanedText || text;
            // {标记} 旧污染活口: 钉钉入口仍直接走 CoworkRunner.startSession 重链。
            // {标记} 待评估-可能波及: 渠道连续性、回复抽取、autoApprove、text confirmation、低配机负载。
            // [CHANNEL_SKIP_HEAVY_PROMPT] DingTalk still enters the heavy startSession path instead of the lighter channel path.
            // [SDK-CUT:CHANNEL-DINGTALK] DingTalk webhook still enters the SDK path through CoworkRunner startSession.
            await coworkRunner.startSession(session.id, promptText, {
              confirmationMode: 'text',
              autoApprove: true,
              workspaceRoot: session.cwd,
            });

            // {标记} P0-2-FIX: 用type字段（不是role）提取AI回复
            const completedSession = coworkStore.getSession(session.id);
            const messages = completedSession?.messages || [];
            const newAssistant = [...messages]
              .reverse()
              .find((m: any) => m.type === 'assistant' && !knownAssistantIds.has(m.id) && m.content?.trim());

            if (newAssistant?.content && sessionWebhook) {
              // 通过钉钉 sessionWebhook 回复
              await fetch(sessionWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  msgtype: 'text',
                  text: { content: newAssistant.content.substring(0, 6000) },
                }),
              });
            }
          } catch (err) {
            console.error('[DingTalk] AI processing error:', err);
          }
        })();
        return;
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[DingTalk] Webhook error:', error);
      res.sendStatus(500);
    }
  });

  app.use('/api/im/dingtalk', router);
}

/**
 * {标记} 功能：验证钉钉签名
 */
function verifySignature(
  timestamp: string,
  secret: string,
  sign: string
): boolean {
  const stringToSign = `${timestamp}\n${secret}`;
  const hash = crypto
    .createHmac('sha256', secret)
    .update(stringToSign)
    .digest('base64');
  return hash === sign;
}

/**
 * {标记} 功能：获取或创建钉钉用户的 Session (关键：绑定身份)
 * {标记} 策略：支持命令选择身份，默认使用 organizer
 * {标记} 核心：同一身份跨渠道共享记忆，不按渠道隔离 Session
 */
async function getOrCreateDingTalkSession(
  coworkStore: any,
  store: any,
  chatId: string,
  senderId: string,
  messageText: string
): Promise<any> {
  // {标记} 解析命令（如果有）
  const { agentRoleKey, cleanedText } = parseCommand(messageText);

  // 获取该身份的模型配置
  const configData = store.get('app_config');
  const config = (configData && typeof configData === 'object') ? configData : {};
  const agentRoleConfig = config.agentRoles?.[agentRoleKey];

  if (!agentRoleConfig?.enabled || !agentRoleConfig.apiUrl || !agentRoleConfig.modelId) {
    throw new Error(`Agent role "${agentRoleKey}" is not configured properly`);
  }

  const modelId = agentRoleConfig.modelId;
  const scopeKey = `${DINGTALK_SESSION_SCOPE_PREFIX}${chatId || senderId || 'default'}`;
  const bindingKey = buildChannelBindingKey('dingtalk', scopeKey, agentRoleKey);

  const boundSession = getBoundChannelSession(store, coworkStore, bindingKey);
  if (boundSession) {
    console.log('[DingTalk] Reusing bound session:', boundSession.id, 'for role:', agentRoleKey);
    return {
      ...boundSession,
      agentRoleKey,
      modelId,
      cleanedText,
    };
  }

  const existingSession = findLatestScopedSession(coworkStore, {
    agentRoleKey,
    scopeKeys: [scopeKey],
  });

  if (existingSession) {
    console.log('[DingTalk] Reusing existing session:', existingSession.id, 'for role:', agentRoleKey);
    bindChannelSession(store, bindingKey, existingSession.id, scopeKey);
    return {
      ...existingSession,
      agentRoleKey,
      modelId,
      cleanedText,
    };
  }

  // {标记} 创建新 Session
  console.log('[DingTalk] Creating new session for role:', agentRoleKey);
  const roleLabels: Record<string, string> = {
    organizer: '浏览器助手',
    writer: '文字撰写员',
    designer: '美术编辑师',
    analyst: '数据分析师',
  };

  const session = coworkStore.createSession(
    `${roleLabels[agentRoleKey]} - 钉钉对话`,
    process.cwd(),
    scopeKey,
    'local',
    [],
    { agentRoleKey, modelId, sourceType: 'external' }
  );
  bindChannelSession(store, bindingKey, session.id, scopeKey);

  return {
    ...session,
    agentRoleKey,
    modelId,
    cleanedText,
  };
}

/**
 * {标记} 功能：解析命令，提取身份和消息内容
 * {标记} 命令格式：/writer 帮我写文章
 * {标记} 默认：如果没有命令，使用 organizer
 */
function parseCommand(text: string): { agentRoleKey: string; cleanedText: string } {
  const commandMatch = text.match(/^\/(\w+)\s+([\s\S]+)$/);

  if (commandMatch) {
    const [, command, cleanedText] = commandMatch;
    const roleKey = command.toLowerCase();

    // {标记} 验证是否是有效的身份
    if (['organizer', 'writer', 'designer', 'analyst'].includes(roleKey)) {
      return {
        agentRoleKey: roleKey,
        cleanedText: cleanedText.trim()
      };
    }
  }

  // {标记} 默认使用 organizer（浏览器助手）
  return {
    agentRoleKey: 'organizer',
    cleanedText: text
  };
}

// saveToIdentityThread replaced by direct DB call via identityThreadHelper
