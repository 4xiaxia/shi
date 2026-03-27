import { Router, Request, Response } from 'express';

// Platform detection
const platform = process.platform;

/**
 * Check calendar permission on macOS by attempting to access Calendar app
 * Returns: 'authorized' | 'denied' | 'restricted' | 'not-determined'
 * On Windows, checks if Outlook is available
 * On Linux, returns 'not-supported'
 */
const checkCalendarPermission = async (): Promise<string> => {
  if (platform === 'darwin') {
    try {
      const { exec } = await import('child_process');
      const util = await import('util');
      const execAsync = util.promisify(exec);

      await execAsync('osascript -l JavaScript -e \'Application("Calendar").name()\'', { timeout: 5000 });
      console.log('[Permissions] macOS Calendar access: authorized');
      return 'authorized';
    } catch (error: any) {
      if (error.stderr?.includes('不能获取对象') ||
          error.stderr?.includes('not authorized') ||
          error.stderr?.includes('Permission denied')) {
        console.log('[Permissions] macOS Calendar access: not-determined (needs permission)');
        return 'not-determined';
      }
      console.warn('[Permissions] Failed to check macOS calendar permission:', error);
      return 'not-determined';
    }
  }

  if (platform === 'win32') {
    try {
      const { exec } = await import('child_process');
      const util = await import('util');
      const execAsync = util.promisify(exec);

      const checkScript = `
        try {
          $Outlook = New-Object -ComObject Outlook.Application
          $Outlook.Version
        } catch { exit 1 }
      `;
      await execAsync('powershell -Command "' + checkScript + '"', { timeout: 10000 });
      console.log('[Permissions] Windows Outlook is available');
      return 'authorized';
    } catch (error) {
      console.log('[Permissions] Windows Outlook not available or not accessible');
      return 'not-determined';
    }
  }

  return 'not-supported';
};

/**
 * Request calendar permission on macOS
 * On Windows, attempts to initialize Outlook COM object
 */
const requestCalendarPermission = async (): Promise<boolean> => {
  if (platform === 'darwin') {
    try {
      const { exec } = await import('child_process');
      const util = await import('util');
      const execAsync = util.promisify(exec);

      await execAsync('osascript -l JavaScript -e \'Application("Calendar").calendars()[0].name()\'', { timeout: 10000 });
      return true;
    } catch (error) {
      console.warn('[Permissions] Failed to request macOS calendar permission:', error);
      return false;
    }
  }

  if (platform === 'win32') {
    const status = await checkCalendarPermission();
    return status === 'authorized';
  }

  return false;
};

export function setupPermissionsRoutes(app: Router) {
  const router = Router();

  // GET /api/permissions/calendar - Check calendar permission status
  router.get('/calendar', async (req: Request, res: Response) => {
    try {
      const status = await checkCalendarPermission();

      // Development mode: Auto-request permission if not determined
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev && status === 'not-determined' && platform === 'darwin') {
        console.log('[Permissions] Development mode: Auto-requesting calendar permission...');
        try {
          await requestCalendarPermission();
          const newStatus = await checkCalendarPermission();
          console.log('[Permissions] Development mode: Permission status after request:', newStatus);
          return res.json({ success: true, status: newStatus, autoRequested: true });
        } catch (requestError) {
          console.warn('[Permissions] Development mode: Auto-request failed:', requestError);
        }
      }

      res.json({ success: true, status });
    } catch (error) {
      console.error('[API] Error checking calendar permission:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check permission',
      });
    }
  });

  // POST /api/permissions/calendar - Request calendar permission
  router.post('/calendar', async (req: Request, res: Response) => {
    try {
      const granted = await requestCalendarPermission();
      const status = await checkCalendarPermission();
      res.json({ success: true, granted, status });
    } catch (error) {
      console.error('[API] Error requesting calendar permission:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request permission',
      });
    }
  });

  app.use('/api/permissions', router);
}
