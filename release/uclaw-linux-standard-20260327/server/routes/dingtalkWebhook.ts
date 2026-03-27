/**
 * {ROUTE} /api/im/dingtalk/webhook
 * {BREAKPOINT} PHASE1-SOFT-CONTAINED-DINGTALK
 * {FLOW} PHASE1-SOFT-CONTAINED: 钉钉当前不再进入 live 执行链；保留兼容入口，仅返回明确禁用响应，避免历史配置直接 404。
 * {标记} 稳定优先：不再走 CoworkRunner / HttpSessionExecutor，不再参与当前主线运行面。
 */

import { Router, Request, Response } from 'express';

const DINGTALK_SOFT_CONTAINED_PAYLOAD = {
  success: false,
  disabled: true,
  code: 'DINGTALK_SOFT_CONTAINED',
  error: 'DingTalk channel has been soft-contained and is no longer active in the current mainline.',
};

export function setupDingTalkWebhookRoutes(app: Router) {
  const router = Router();

  router.post('/webhook', (_req: Request, res: Response) => {
    res.status(200).json(DINGTALK_SOFT_CONTAINED_PAYLOAD);
  });

  router.get('/status', (_req: Request, res: Response) => {
    res.status(200).json(DINGTALK_SOFT_CONTAINED_PAYLOAD);
  });

  app.use('/api/im/dingtalk', router);
}
