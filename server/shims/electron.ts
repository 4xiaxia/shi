/**
 * Electron Shim for Web Server
 * Provides mock implementations of Electron APIs for server-side use
 */

import path from 'path';
import os from 'os';
import {
  getProjectRoot,
  resolveRuntimeRoot,
  resolveRuntimeUserDataPath,
} from '../../src/shared/runtimeDataPaths';

// Polyfill process.resourcesPath for non-Electron environments
if (!(process as any).resourcesPath) {
  (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath = getProjectRoot();
}

// Extend Process type
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Process {
      resourcesPath?: string;
    }
  }
}

// Mock app API
const getUserDataPath = (): string => {
  return resolveRuntimeUserDataPath(undefined, getProjectRoot());
};

export const app = {
  getPath: (name: string): string => {
    switch (name) {
      case 'userData':
        return getUserDataPath();
      case 'logs':
        return path.join(getUserDataPath(), 'logs');
      case 'temp':
        return os.tmpdir();
      case 'home':
        return os.homedir();
      case 'exe':
        return process.execPath;
      case 'appData':
        return resolveRuntimeRoot(getProjectRoot());
      default:
        return getUserDataPath();
    }
  },
  getVersion: () => '0.3.0',
  getName: () => 'UCLAW',
  isPackaged: false,  // {标记} Web 版本始终为非打包状态
  isReady: () => true,
  whenReady: () => Promise.resolve(),
  quit: () => process.exit(0),
  on: () => {},
  getAppPath: () => getProjectRoot(),
};

// Mock BrowserWindow class
export class BrowserWindow {
  static getAllWindows = () => [];
  static getFocusedWindow = () => null;
  constructor() {}
  loadURL() {}
  loadFile() {}
  on() { return this; }
  once() { return this; }
  webContents = {
    send: () => {},
    on: () => {},
    openDevTools: () => {},
  };
}

// Mock session
export const session = {
  defaultSession: {
    webRequest: {
      onBeforeSendHeaders: () => {},
      onHeadersReceived: () => {},
    },
    protocol: {
      registerStringProtocol: () => {},
      handle: () => {},
    },
    cookies: {
      get: () => Promise.resolve([]),
      set: () => Promise.resolve(),
    },
    fetch: async (url: string, options?: RequestInit) => {
      // Use native fetch for web server build
      return fetch(url, options);
    },
  },
  fromPartition: () => ({
    webRequest: {
      onBeforeSendHeaders: () => {},
      onHeadersReceived: () => {},
    },
  }),
};

// Mock ipcMain
export const ipcMain = {
  handle: () => {},
  on: () => {},
  once: () => {},
  removeHandler: () => {},
};

// Mock dialog
export const dialog = {
  showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
  showSaveDialog: async () => ({ canceled: true, filePath: undefined }),
  showMessageBox: async () => ({ response: 0 }),
  showErrorBox: () => {},
};

// Mock shell
export const shell = {
  openExternal: async () => true,
  openPath: async () => '',
  showItemInFolder: () => {},
};

// Mock nativeTheme
export const nativeTheme = {
  shouldUseDarkColors: false,
  on: () => {},
};

// Mock nativeImage
export const nativeImage = {
  createFromPath: () => ({ toDataURL: () => '' }),
  createFromDataURL: () => ({ toDataURL: () => '' }),
  createEmpty: () => ({ toDataURL: () => '' }),
};

// Mock Menu
export const Menu = {
  buildFromTemplate: () => ({ popup: () => {} }),
  setApplicationMenu: () => {},
};

// Mock Tray
export class Tray {
  constructor() {}
  setToolTip() {}
  setContextMenu() {}
  on() {}
}

// Mock systemPreferences
export const systemPreferences = {
  getUserDefault: () => 'dark',
  on: () => {},
};

// Type exports
export type WebContents = {
  send: (channel: string, ...args: unknown[]) => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  openDevTools: () => void;
};
