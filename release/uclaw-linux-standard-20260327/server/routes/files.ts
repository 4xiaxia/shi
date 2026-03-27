import { Router, Request, Response } from 'express';
import type { Router as RouterType } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { getProjectRoot } from '../../src/shared/runtimeDataPaths';

const router: RouterType = Router();

// Get workspace root from app settings
const getWorkspaceRoot = (req: Request): string => {
  return req.app.get('workspace') || getProjectRoot();
};

// Validate path is within workspace (prevent traversal attacks)
const validatePath = (workspaceRoot: string, targetPath: string): { valid: boolean; resolved?: string; error?: string } => {
  try {
    const resolved = path.resolve(workspaceRoot, targetPath);
    const normalizedWorkspace = path.resolve(workspaceRoot);

    if (!resolved.startsWith(normalizedWorkspace)) {
      return { valid: false, error: 'Path escapes workspace' };
    }
    return { valid: true, resolved };
  } catch (error) {
    return { valid: false, error: 'Invalid path' };
  }
};

// List directory contents
router.get('/list', async (req: Request, res: Response) => {
  const workspaceRoot = getWorkspaceRoot(req);
  const targetPath = req.query.path as string || '';

  const validation = validatePath(workspaceRoot, targetPath);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  try {
    const entries = await fs.promises.readdir(validation.resolved!, { withFileTypes: true });
    const items = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
      path: path.join(targetPath, entry.name),
    }));

    res.json({ success: true, items, path: targetPath, workspaceRoot });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Read file content (for text files)
router.get('/read', async (req: Request, res: Response) => {
  const workspaceRoot = getWorkspaceRoot(req);
  const targetPath = req.query.path as string;

  if (!targetPath) {
    return res.status(400).json({ success: false, error: 'Path required' });
  }

  const validation = validatePath(workspaceRoot, targetPath);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  try {
    const content = await fs.promises.readFile(validation.resolved!, 'utf-8');
    res.json({ success: true, content, path: targetPath });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Download file
router.get('/download', async (req: Request, res: Response) => {
  const workspaceRoot = getWorkspaceRoot(req);
  const targetPath = req.query.path as string;

  if (!targetPath) {
    return res.status(400).json({ success: false, error: 'Path required' });
  }

  const validation = validatePath(workspaceRoot, targetPath);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  try {
    res.download(validation.resolved!);
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Upload file
router.post('/upload', async (req: Request, res: Response) => {
  const workspaceRoot = getWorkspaceRoot(req);
  const targetPath = req.query.path as string || '';

  if (!req.body || !req.body.file) {
    return res.status(400).json({ success: false, error: 'No file data provided' });
  }

  const validation = validatePath(workspaceRoot, targetPath);
  if (!validation.valid && targetPath) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  try {
    const { filename, content, encoding = 'base64' } = req.body.file;

    if (!filename) {
      return res.status(400).json({ success: false, error: 'Filename required' });
    }

    const uploadDir = validation.resolved || workspaceRoot;
    const filePath = path.join(uploadDir, filename);

    // Validate the final path is still within workspace
    const finalValidation = validatePath(workspaceRoot, filePath);
    if (!finalValidation.valid) {
      return res.status(400).json({ success: false, error: 'Path escapes workspace' });
    }

    // Decode and write file content
    const buffer = Buffer.from(content, encoding as BufferEncoding);
    await fs.promises.writeFile(finalValidation.resolved!, buffer);

    res.json({
      success: true,
      path: path.relative(workspaceRoot, finalValidation.resolved!),
      filename,
      size: buffer.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Validate path
router.get('/validate', async (req: Request, res: Response) => {
  const workspaceRoot = getWorkspaceRoot(req);
  const targetPath = req.query.path as string;

  if (!targetPath) {
    return res.json({ success: true, valid: false, error: 'Path required' });
  }

  const validation = validatePath(workspaceRoot, targetPath);

  if (!validation.valid) {
    return res.json({ success: true, valid: false, error: validation.error });
  }

  try {
    const stats = await fs.promises.stat(validation.resolved!);
    res.json({
      success: true,
      valid: true,
      exists: true,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      resolved: validation.resolved
    });
  } catch {
    res.json({ success: true, valid: true, exists: false, resolved: validation.resolved });
  }
});

export function setupFilesRoutes(app: Router) {
  app.use('/api/files', router);

  // Serve workspace files directly
  app.get('/workspace/*', (req: Request, res: Response) => {
    const workspaceRoot = getWorkspaceRoot(req);
    const targetPath = req.params[0];

    const validation = validatePath(workspaceRoot, targetPath);
    if (!validation.valid) {
      return res.status(400).send('Invalid path');
    }

    res.sendFile(validation.resolved!);
  });
}

export default router;
