import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  BROWSER_EYES_CURRENT_PAGE_STORE_KEY,
  type BrowserEyesCurrentPageState,
} from './browserEyesState';
import { getProjectRoot, resolveRuntimeUserDataPath } from './runtimeDataPaths';

const BLINGBLING_LITTLE_EYE_SKILL_ID = 'blingbling-little-eye';
const BLINGBLING_OBSERVER_SCRIPT = path.join('scripts', 'observe-page.mjs');
const BLINGBLING_OBSERVER_TIMEOUT_MS = 12000;
const BLINGBLING_CURRENT_PAGE_MAX_AGE_MS = 15 * 60 * 1000;

type ConfigStoreLike = {
  get: (key: string) => unknown;
};

export type BrowserObservationTarget =
  | { mode: 'url'; value: string }
  | { mode: 'file'; value: string };

export function resolveBlingblingObserverScriptPath(): string | null {
  const userDataPath = resolveRuntimeUserDataPath();
  const runtimePath = path.join(userDataPath, 'SKILLs', BLINGBLING_LITTLE_EYE_SKILL_ID, BLINGBLING_OBSERVER_SCRIPT);
  if (fs.existsSync(runtimePath)) {
    return runtimePath;
  }

  const projectPath = path.join(getProjectRoot(), 'SKILLs', BLINGBLING_LITTLE_EYE_SKILL_ID, BLINGBLING_OBSERVER_SCRIPT);
  return fs.existsSync(projectPath) ? projectPath : null;
}

export function hasBrowserObserverRuntime(): boolean {
  return Boolean(resolveBlingblingObserverScriptPath());
}

export async function runBrowserObserver(
  target: BrowserObservationTarget
): Promise<Record<string, unknown> | null> {
  const scriptPath = resolveBlingblingObserverScriptPath();
  if (!scriptPath) {
    return null;
  }

  const args = target.mode === 'url'
    ? [scriptPath, '--url', target.value, '--compact']
    : [scriptPath, '--file', target.value, '--compact'];

  const child = spawn(process.execPath, args, {
    cwd: path.dirname(path.dirname(scriptPath)),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  let stdout = '';
  let stderr = '';
  const timeout = setTimeout(() => {
    child.kill('SIGTERM');
  }, BLINGBLING_OBSERVER_TIMEOUT_MS);

  return await new Promise((resolve) => {
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', () => {
      clearTimeout(timeout);
      resolve(null);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0 || !stdout.trim()) {
        if (stderr.trim()) {
          console.warn('[browserObserverRuntime] observer failed:', stderr.trim());
        }
        resolve(null);
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        if (!parsed || typeof parsed !== 'object') {
          resolve(null);
          return;
        }
        resolve(parsed as Record<string, unknown>);
      } catch {
        resolve(null);
      }
    });
  });
}

export function readCurrentBrowserEyesStateFromConfigStore(
  configStore: ConfigStoreLike
): BrowserEyesCurrentPageState | null {
  try {
    const raw = configStore.get(BROWSER_EYES_CURRENT_PAGE_STORE_KEY) as BrowserEyesCurrentPageState | null;
    return normalizeCurrentBrowserEyesState(raw);
  } catch {
    return null;
  }
}

export function normalizeCurrentBrowserEyesState(
  raw: BrowserEyesCurrentPageState | null | undefined
): BrowserEyesCurrentPageState | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const url = String(raw.url || '').trim();
  const updatedAt = Number(raw.updatedAt || 0);
  if (!url || !Number.isFinite(updatedAt) || updatedAt <= 0) {
    return null;
  }

  if (Date.now() - updatedAt > BLINGBLING_CURRENT_PAGE_MAX_AGE_MS) {
    return null;
  }

  return {
    source: 'embedded-browser',
    url,
    title: typeof raw.title === 'string' ? raw.title.trim() : undefined,
    updatedAt,
  };
}
