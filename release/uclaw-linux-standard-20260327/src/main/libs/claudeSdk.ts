import { existsSync } from 'fs';
import { pathToFileURL } from 'url';
import { coworkLog } from './coworkLogger';
import {
  getBundledNodeModuleEntry,
  getRuntimeResourcesRoot,
  isBundledRuntime,
} from './runtimeLayout';

export type ClaudeSdkModule = typeof import('@anthropic-ai/claude-agent-sdk');

let claudeSdkPromise: Promise<ClaudeSdkModule> | null = null;

const CLAUDE_SDK_PATH_PARTS = ['@anthropic-ai', 'claude-agent-sdk'];

function getClaudeSdkPath(): string {
  const sdkPath = getBundledNodeModuleEntry(...CLAUDE_SDK_PATH_PARTS, 'sdk.mjs');

  console.log('[ClaudeSDK] Resolved SDK path:', sdkPath);
  return sdkPath;
}

export function loadClaudeSdk(): Promise<ClaudeSdkModule> {
  if (!claudeSdkPromise) {
    // [SDK-CUT:ROOT] Claude SDK dynamic loader root; removing SDK starts here.
    // Use runtime dynamic import so the CJS build can load the SDK's ESM entry.
    const dynamicImport = new Function('specifier', 'return import(specifier)') as (
      specifier: string
    ) => Promise<ClaudeSdkModule>;
    const sdkPath = getClaudeSdkPath();
    const sdkUrl = pathToFileURL(sdkPath).href;
    const sdkExists = existsSync(sdkPath);

    coworkLog('INFO', 'loadClaudeSdk', 'Loading Claude SDK', {
      sdkPath,
      sdkUrl,
      sdkExists,
      isPackaged: isBundledRuntime(),
      resourcesPath: getRuntimeResourcesRoot(),
    });

    claudeSdkPromise = dynamicImport(sdkUrl).catch((error) => {
      coworkLog('ERROR', 'loadClaudeSdk', 'Failed to load Claude SDK', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        sdkPath,
        sdkExists,
      });
      claudeSdkPromise = null;
      throw error;
    });
  }

  return claudeSdkPromise;
}
