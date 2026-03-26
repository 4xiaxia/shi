/**
 * Daily Memory Extraction Routes
 * POST /api/memory/daily-extract — 手动触发每日记忆抽取
 */

import { Router, Request, Response } from 'express';
import type { RequestContext } from '../src/index';

export function setupDailyMemoryRoutes(app: Router) {
  const router = Router();

  // POST /api/memory/daily-extract — 触发每日记忆抽取
  // {路标} FLOW-ROUTE-DAILY-MEMORY
  // {标记} 现役主链: 手动每日记忆抽取直接调用 dailyMemoryPipeline，不经过 CoworkRunner 会话启动。
  router.post('/daily-extract', async (req: Request, res: Response) => {
    try {
      const { store, coworkStore } = req.context as RequestContext;
      const {
        getDailyMemoryTargetSlotDay,
        runAndMarkDailyMemoryPipeline,
      } = await import('../libs/dailyMemoryPipeline');
      const result = await runAndMarkDailyMemoryPipeline({
        store,
        coworkStore,
        slotDay: getDailyMemoryTargetSlotDay(new Date()),
      });

      res.json({
        success: true,
        ...result.extraction,
        backup: result.backup,
        warnings: result.warnings,
      });
    } catch (error) {
      console.error('[DailyMemory] Extraction failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Extraction failed',
      });
    }
  });

  app.use('/api/memory', router);
}
