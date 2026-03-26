/**
 * 数据备份与还原 API
 *
 * GET  /api/backup/export  — 导出整个 SQLite 数据库为二进制文件
 * POST /api/backup/import  — 上传 .sqlite 文件覆盖当前数据库
 * GET  /api/backup/stats   — 获取各表数据量统计
 */

import { Router, Request, Response } from 'express';
import express from 'express';
import type { RequestContext } from '../src/index';
import initSqlJs from 'sql.js';
import path from 'path';
import { getProjectRoot } from '../../src/shared/runtimeDataPaths';

export function setupBackupRoutes(app: Router) {
  const router = Router();

  // ── 导出数据库 ──
  router.get('/export', (req: Request, res: Response) => {
    try {
      const { store } = req.context as RequestContext;
      const db = store.getDatabase();
      const data = db.export();
      const buffer = Buffer.from(data);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `uclaw-backup-${timestamp}.sqlite`;

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (error) {
      console.error('[Backup] Export failed:', error);
      res.status(500).json({ success: false, error: 'Failed to export database' });
    }
  });

  // ── 导入数据库（raw binary body） ──
  router.post('/import', express.raw({ type: 'application/octet-stream', limit: '200mb' }), async (req: Request, res: Response) => {
    try {
      const bodyBuf = req.body as Buffer;
      if (!bodyBuf || bodyBuf.length === 0) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      const SQL = await initSqlJs({
        locateFile: (file: string) => path.join(getProjectRoot(), 'node_modules', 'sql.js', 'dist', file),
      });

      // 验证合法 SQLite
      let testDb;
      try {
        testDb = new SQL.Database(new Uint8Array(bodyBuf));
        const tables = testDb.exec("SELECT name FROM sqlite_master WHERE type='table'");
        const tableNames = tables.length > 0 ? tables[0].values.map(r => r[0] as string) : [];
        const missing = ['kv', 'cowork_sessions'].filter(t => !tableNames.includes(t));
        if (missing.length > 0) {
          testDb.close();
          return res.status(400).json({ success: false, error: `Invalid backup: missing tables [${missing.join(', ')}]` });
        }
        testDb.close();
      } catch {
        return res.status(400).json({ success: false, error: 'Invalid SQLite file' });
      }

      // 逐表覆盖
      const { store } = req.context as RequestContext;
      const db = store.getDatabase();
      const newDb = new SQL.Database(new Uint8Array(bodyBuf));
      const srcTables = newDb.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
      const srcTableNames = srcTables.length > 0 ? srcTables[0].values.map(r => r[0] as string) : [];

      for (const tableName of srcTableNames) {
        try {
          const exists = db.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
          if (exists.length === 0 || exists[0].values.length === 0) continue;
          db.run(`DELETE FROM "${tableName}"`);
          const rows = newDb.exec(`SELECT * FROM "${tableName}"`);
          if (rows.length > 0 && rows[0].values.length > 0) {
            const cols = rows[0].columns;
            const placeholders = cols.map(() => '?').join(',');
            const sql = `INSERT INTO "${tableName}" (${cols.map(c => `"${c}"`).join(',')}) VALUES (${placeholders})`;
            for (const row of rows[0].values) {
              db.run(sql, row as any[]);
            }
          }
        } catch (err) {
          console.warn(`[Backup] Skipped table "${tableName}":`, err);
        }
      }
      newDb.close();
      store.save();

      res.json({ success: true, message: 'Database restored. Please refresh the page.' });
    } catch (error) {
      console.error('[Backup] Import failed:', error);
      res.status(500).json({ success: false, error: 'Failed to import database' });
    }
  });

  // ── 数据统计 ──
  router.get('/stats', (req: Request, res: Response) => {
    try {
      const { store } = req.context as RequestContext;
      const db = store.getDatabase();

      const tables = [
        { name: 'cowork_sessions', label: '对话会话' },
        { name: 'cowork_messages', label: '对话消息' },
        { name: 'user_memories', label: '用户记忆' },
        { name: 'mcp_servers', label: 'MCP 服务' },
        { name: 'scheduled_tasks', label: '定时任务' },
        { name: 'scheduled_task_runs', label: '任务运行记录' },
        { name: 'skill_role_configs', label: '技能配置' },
        { name: 'identity_thread_24h', label: '24h 线程' },
        { name: 'kv', label: '键值配置' },
      ];

      const stats = tables.map(({ name, label }) => {
        try {
          const result = db.exec(`SELECT COUNT(*) FROM "${name}"`);
          const count = result.length > 0 ? (result[0].values[0][0] as number) : 0;
          return { table: name, label, count };
        } catch {
          return { table: name, label, count: 0 };
        }
      });

      const exported = db.export();
      const sizeBytes = exported.length;

      res.json({ success: true, stats, sizeBytes });
    } catch (error) {
      console.error('[Backup] Stats failed:', error);
      res.status(500).json({ success: false, error: 'Failed to get stats' });
    }
  });

  app.use('/api/backup', router);
}
