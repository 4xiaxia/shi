/**
 * Logger module using electron-log when available.
 * Falls back to a lightweight file logger in pure Node/web dev mode.
 */

import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { ensureDirectory, getProjectRoot, resolveRuntimeUserDataPath } from '../shared/runtimeDataPaths';

const require = createRequire(import.meta.url);

type LogMethod = (...args: any[]) => void;

type LoggerLike = {
  info: LogMethod;
  error: LogMethod;
  warn: LogMethod;
  debug: LogMethod;
  transports: {
    file: {
      level: string;
      maxSize: number;
      format: string;
      getFile: () => { path: string };
    };
    console: {
      level: string | false;
      format: string;
    };
  };
};

const getFallbackLogFilePath = (): string => {
  const baseDir = resolveRuntimeUserDataPath(undefined, getProjectRoot());
  const logsDir = path.join(baseDir, 'logs');
  ensureDirectory(logsDir);
  return path.join(logsDir, 'main.log');
};

const createFallbackLogger = (): LoggerLike => {
  const logFilePath = getFallbackLogFilePath();

  const writeLine = (level: string, args: any[]) => {
    const rendered = args.map((arg) => {
      if (arg instanceof Error) {
        return arg.stack || arg.message;
      }
      if (typeof arg === 'string') {
        return arg;
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(' ');

    const line = `[${new Date().toISOString()}] [${level}] ${rendered}\n`;
    fs.appendFileSync(logFilePath, line, 'utf8');
  };

  return {
    info: (...args: any[]) => writeLine('info', args),
    error: (...args: any[]) => writeLine('error', args),
    warn: (...args: any[]) => writeLine('warn', args),
    debug: (...args: any[]) => writeLine('debug', args),
    transports: {
      file: {
        level: 'debug',
        maxSize: 10 * 1024 * 1024,
        format: '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}',
        getFile: () => ({ path: logFilePath }),
      },
      console: {
        level: 'debug',
        format: '{text}',
      },
    },
  };
};

const log: LoggerLike = (() => {
  try {
    return require('electron-log/main') as LoggerLike;
  } catch {
    return createFallbackLogger();
  }
})();

/**
 * Initialize logging system.
 * Must be called early in main process, before any console output.
 */
export function initLogger(): void {
  // File transport config
  log.transports.file.level = 'debug';
  log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB, then rotate to main.old.log
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

  // Console transport config
  log.transports.console.level = 'debug';
  log.transports.console.format = '{text}';

  // Intercept console.* methods so all existing console.log/error/warn
  // across 25+ files are automatically captured without any code changes.
  // electron-log correctly serializes Error objects (with stack traces),
  // unlike JSON.stringify which outputs '{}' for Error instances.
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const originalDebug = console.debug;

  console.log = (...args: any[]) => {
    originalLog.apply(console, args);
    log.info(...args);
  };
  console.error = (...args: any[]) => {
    originalError.apply(console, args);
    log.error(...args);
  };
  console.warn = (...args: any[]) => {
    originalWarn.apply(console, args);
    log.warn(...args);
  };
  console.info = (...args: any[]) => {
    originalInfo.apply(console, args);
    log.info(...args);
  };
  console.debug = (...args: any[]) => {
    originalDebug.apply(console, args);
    log.debug(...args);
  };

  // Disable electron-log's own console transport to avoid double printing
  // (we already call originalLog above, so electron-log only needs to write to file)
  log.transports.console.level = false;

  // Log startup marker
  log.info('='.repeat(60));
  log.info(`LobsterAI started (${process.platform} ${process.arch})`);
  log.info('='.repeat(60));
}

/**
 * Get the current log file path
 */
export function getLogFilePath(): string {
  return log.transports.file.getFile().path;
}

/**
 * Log instance for direct usage if needed
 */
export { log };
