/**
 * {标记} 功能: 快捷链接打开器
 * {标记} 来源: 二开需求总表#1.1
 * {标记} 用途: 统一处理embedded/external链接打开，支持claW特价API等快捷入口
 * {标记} 关键API: normalizeQuickActionUrl() / openQuickActionLink()
 * {标记} 集成: Settings.tsx claW iframe / 快捷操作系统
 * {标记} 状态: 源代码完整✅
 */

import type { LocalizedQuickAction, QuickActionLinkMode } from '../types/quickAction';
import { normalizeEmbeddedBrowserUrl } from './embeddedBrowser';

type QuickActionLinkTarget = Pick<LocalizedQuickAction, 'url' | 'openMode'>;

interface QuickActionLinkOpeners {
  openEmbedded?: (url: string) => boolean | Promise<boolean>;
  openExternal?: (url: string) => boolean | Promise<boolean>;
  openWindow?: (url: string) => void;
}

export const normalizeQuickActionUrl = (value?: string): string | null => {
  return normalizeEmbeddedBrowserUrl(value);
};

export const isLinkQuickAction = (action: QuickActionLinkTarget): boolean => (
  normalizeQuickActionUrl(action.url) !== null
);

const shouldTryEmbedded = (openMode?: QuickActionLinkMode): boolean => (
  openMode !== 'external'
);

export const openQuickActionLink = async (
  action: QuickActionLinkTarget,
  openers: QuickActionLinkOpeners = {},
): Promise<boolean> => {
  const url = normalizeQuickActionUrl(action.url);
  if (!url) {
    return false;
  }

  if (shouldTryEmbedded(action.openMode) && openers.openEmbedded) {
    if (await openers.openEmbedded(url)) {
      return true;
    }
  }

  if (openers.openExternal) {
    if (await openers.openExternal(url)) {
      return true;
    }
  }

  if (openers.openWindow) {
    openers.openWindow(url);
    return true;
  }

  return false;
};