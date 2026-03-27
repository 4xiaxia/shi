import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { getLogFilePath } from '../../src/main/logger';
import { getCoworkLogPath } from '../../src/main/libs/coworkLogger';
import { exportLogsZip } from '../../src/main/libs/logExport';

const padTwoDigits = (value: number): string => value.toString().padStart(2, '0');

const buildLogExportFileName = (): string => {
  const now = new Date();
  const datePart = `${now.getFullYear()}${padTwoDigits(now.getMonth() + 1)}${padTwoDigits(now.getDate())}`;
  const timePart = `${padTwoDigits(now.getHours())}${padTwoDigits(now.getMinutes())}${padTwoDigits(now.getSeconds())}`;
  return `uclaw-logs-${datePart}-${timePart}.zip`;
};

const ensureZipFileName = (value: string): string => {
  return value.toLowerCase().endsWith('.zip') ? value : `${value}.zip`;
};

export function setupLogRoutes(app: Router) {
  const router = Router();

  // GET /api/log/path - Get log file path
  router.get('/path', (req: Request, res: Response) => {
    try {
      const logPath = getLogFilePath();
      res.json({ success: true, path: logPath });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get log path',
      });
    }
  });

  // GET /api/log/export - Export logs as zip file
  router.get('/export', async (req: Request, res: Response) => {
    try {
      const outputPath = req.query.path as string | undefined;

      if (!outputPath) {
        return res.status(400).json({
          success: false,
          error: 'Missing query parameter: path',
        });
      }

      const normalizedPath = ensureZipFileName(outputPath);
      const archiveResult = await exportLogsZip({
        outputPath: normalizedPath,
        entries: [
          { archiveName: 'main.log', filePath: getLogFilePath() },
          { archiveName: 'cowork.log', filePath: getCoworkLogPath() },
        ],
      });

      res.json({
        success: true,
        path: normalizedPath,
        missingEntries: archiveResult.missingEntries,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export logs',
      });
    }
  });

  // Note: log:openFolder is Electron-specific and not applicable to web
  // The web version can return the log path for the frontend to display

  app.use('/api/log', router);
}
