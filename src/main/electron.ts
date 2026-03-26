import { createRequire } from 'module';

const require = createRequire(import.meta.url);

type ElectronModuleLike = {
  app: any;
  BrowserWindow: any;
  session: any;
  ipcMain: any;
  dialog: any;
  shell: any;
  nativeTheme: any;
  nativeImage: any;
  Menu: any;
  Tray: any;
  systemPreferences: any;
};

const loadElectronModule = (): ElectronModuleLike => {
  try {
    return require('electron') as ElectronModuleLike;
  } catch {
    return require('../../server/shims/electron.cjs') as ElectronModuleLike;
  }
};

const electronModule = loadElectronModule();

export const {
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
} = electronModule;
