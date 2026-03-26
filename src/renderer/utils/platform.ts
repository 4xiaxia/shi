/**
 * Platform detection utilities
 * Determines if the app is running in Electron or web browser
 */

// Declare the build-time constant
declare const __WEB_BUILD__: string;
declare const __ELECTRON_BUILD__: string;

/**
 * Check if running in web browser (not Electron)
 */
export function isWebBuild(): boolean {
  // Check for build-time constant first (most reliable)
  if (typeof __WEB_BUILD__ !== 'undefined') {
    return __WEB_BUILD__ === 'true';
  }

  // Runtime check: Electron sets window.electron with platform/arch
  // Our web shim sets platform to 'web'
  if (window.electron?.platform === 'web') {
    return true;
  }

  return false;
}

/**
 * Check if running in Electron
 */
export function isElectronBuild(): boolean {
  return !isWebBuild();
}

/**
 * Check if running on Windows (Electron only)
 */
export function isWindows(): boolean {
  return window.electron?.platform === 'win32';
}

/**
 * Check if running on macOS (Electron only)
 */
export function isMac(): boolean {
  return window.electron?.platform === 'darwin';
}

/**
 * Check if running on Linux (Electron only)
 */
export function isLinux(): boolean {
  return window.electron?.platform === 'linux';
}

/**
 * Get the platform identifier - safe for web build
 */
export function getPlatform(): 'win32' | 'darwin' | 'linux' | 'web' | 'unknown' {
  if (isWebBuild()) return 'web';
  const platform = window.electron?.platform;
  if (platform === 'win32' || platform === 'darwin' || platform === 'linux') {
    return platform;
  }
  return 'web';
}

/**
 * Check if auto-launch feature is available (Electron only)
 */
export function hasAutoLaunch(): boolean {
  return !isWebBuild();
}

/**
 * Check if app update feature is available (Electron only)
 */
export function hasAppUpdate(): boolean {
  return !isWebBuild();
}

/**
 * Check if file system operations are available (Electron only)
 */
export function hasFileSystem(): boolean {
  return !isWebBuild();
}

/**
 * Check if export logs feature is available (Electron only)
 */
export function hasExportLogs(): boolean {
  return !isWebBuild();
}
