/**
 * Electron Shim for Web Server (CommonJS)
 * Provides mock implementations of Electron APIs for server-side use
 */

const path = require('path');
const os = require('os');

const readEnvAlias = (primaryKey, legacyKey) => {
  const primaryValue = (process.env[primaryKey] || '').trim();
  if (primaryValue) {
    return primaryValue;
  }
  const legacyValue = (process.env[legacyKey] || '').trim();
  return legacyValue || '';
};

// Get user data path from environment or use default
const getProjectRoot = () => {
  const configuredRoot = readEnvAlias('UCLAW_APP_ROOT', 'LOBSTERAI_APP_ROOT');
  return path.resolve(configuredRoot || path.join(__dirname, '..', '..'));
};

const getRuntimeRoot = () => {
  const configuredRoot = readEnvAlias('UCLAW_DATA_PATH', 'LOBSTERAI_DATA_PATH');
  return path.resolve(configuredRoot || path.join(getProjectRoot(), '.uclaw'));
};

const getUserDataPath = () => {
  return path.join(getRuntimeRoot(), 'web');
};

// Mock app API
const app = {
  getPath: (name) => {
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
        return getRuntimeRoot();
      default:
        return getUserDataPath();
    }
  },
  getVersion: () => '0.3.0',
  getName: () => 'UCLAW',
  isReady: () => true,
  whenReady: () => Promise.resolve(),
  quit: () => process.exit(0),
  on: () => {},
  getAppPath: () => getProjectRoot(),
};

// Mock BrowserWindow class
class BrowserWindow {
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
const session = {
  defaultSession: {
    // Use Node's global fetch (available in Node 18+)
    fetch: globalThis.fetch,
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
  },
  fromPartition: () => ({
    webRequest: {
      onBeforeSendHeaders: () => {},
      onHeadersReceived: () => {},
    },
  }),
};

// Mock ipcMain
const ipcMain = {
  handle: () => {},
  on: () => {},
  once: () => {},
  removeHandler: () => {},
};

// Mock dialog
const dialog = {
  showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
  showSaveDialog: async () => ({ canceled: true, filePath: undefined }),
  showMessageBox: async () => ({ response: 0 }),
  showErrorBox: () => {},
};

// Mock shell
const shell = {
  openExternal: async () => true,
  openPath: async () => '',
  showItemInFolder: () => {},
};

// Mock nativeTheme
const nativeTheme = {
  shouldUseDarkColors: false,
  on: () => {},
};

// Mock nativeImage
const nativeImage = {
  createFromPath: () => ({ toDataURL: () => '' }),
  createFromDataURL: () => ({ toDataURL: () => '' }),
  createEmpty: () => ({ toDataURL: () => '' }),
};

// Mock Menu
const Menu = {
  buildFromTemplate: () => ({ popup: () => {} }),
  setApplicationMenu: () => {},
};

// Mock Tray
class Tray {
  constructor() {}
  setToolTip() {}
  setContextMenu() {}
  on() {}
}

// Mock systemPreferences
const systemPreferences = {
  getUserDefault: () => 'dark',
  on: () => {},
};

module.exports = {
  app,
  BrowserWindow,
  session,
  ipcMain,
  dialog,
  shell,
  nativeTheme,
  nativeImage,
  Menu,
  Tray,
  systemPreferences,
};
