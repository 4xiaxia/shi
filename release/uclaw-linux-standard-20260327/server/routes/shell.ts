import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// In web version, shell operations have different semantics
// - shell:openPath: Returns info about how to open a file (client-side)
// - shell:showItemInFolder: Returns file path info (client-side)
// - shell:openExternal: Returns URL for client-side navigation

export function setupShellRoutes(app: Router) {
  const router = Router();

  // GET /api/shell/openPath - Get info for opening a file
  // In web version, returns file info; client handles opening
  router.get('/openPath', async (req: Request, res: Response) => {
    try {
      const { path: filePath } = req.query;

      if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Missing query parameter: path',
        });
      }

      // In a real web app, files are opened client-side
      // For server-side files, we can check if they exist
      const fs = await import('fs');
      const pathModule = await import('path');
      const resolvedPath = pathModule.resolve(filePath);
      const exists = fs.existsSync(resolvedPath);

      res.json({
        success: true,
        path: resolvedPath,
        exists,
        // In web version, client should handle file opening
        action: 'client-side-open',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/shell/showItemInFolder - Get info for showing file in folder
  // In web version, returns file path info; client handles folder opening
  router.get('/showItemInFolder', async (req: Request, res: Response) => {
    try {
      const { path: filePath } = req.query;

      if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Missing query parameter: path',
        });
      }

      const pathModule = await import('path');
      const resolvedPath = pathModule.resolve(filePath);
      const dirName = pathModule.dirname(resolvedPath);

      const fs = await import('fs');
      const exists = fs.existsSync(resolvedPath);
      const dirExists = fs.existsSync(dirName);

      res.json({
        success: true,
        path: resolvedPath,
        directory: dirName,
        exists,
        dirExists,
        // In web version, client should handle folder opening
        action: 'client-side-reveal',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/shell/openExternal - Get info for external URL
  // In web version, returns URL info; client handles navigation
  router.get('/openExternal', async (req: Request, res: Response) => {
    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Missing query parameter: url',
        });
      }

      // Validate URL format
      let validUrl: URL;
      try {
        validUrl = new URL(url);
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Invalid URL format',
        });
      }

      res.json({
        success: true,
        url: validUrl.href,
        // In web version, client should handle external navigation
        action: 'client-side-navigate',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.use('/api/shell', router);
}
