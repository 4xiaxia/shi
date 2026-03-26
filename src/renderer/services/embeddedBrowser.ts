/**
 * {标记} 功能: 嵌入浏览器服务
 * {标记} 来源: 二开需求总表#1.1
 * {标记} 用途: 支持在应用内嵌入external URLs (如claW API)，优化使用体验
 * {标记} 关键API: requestEmbeddedBrowserOpen() / normalizeEmbeddedBrowserUrl()
 * {标记} 集成: Settings.tsx iframe遮罩 /  EmbeddedBrowserModal.tsx
 * {标记} 状态: 源代码完整✅
 */

export const EMBEDDED_BROWSER_OPEN_EVENT = 'app:embedded-browser:open';

export interface EmbeddedBrowserRequest {
  title: string;
  url: string;
}

interface EmbeddedBrowserOpenOptions {
  title: string;
  url?: string;
  eventTarget?: {
    dispatchEvent: (event: Event) => boolean;
  } | null;
}

const hasScheme = (value: string): boolean => /^[a-z][a-z\d+.-]*:/i.test(value);

export const normalizeEmbeddedBrowserUrl = (value?: string): string | null => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    return null;
  }

  return hasScheme(normalized) ? normalized : `https://${normalized}`;
};

const createOpenEvent = (detail: EmbeddedBrowserRequest): Event => {
  if (typeof CustomEvent === 'function') {
    return new CustomEvent<EmbeddedBrowserRequest>(EMBEDDED_BROWSER_OPEN_EVENT, { detail });
  }

  return {
    type: EMBEDDED_BROWSER_OPEN_EVENT,
    detail,
  } as unknown as Event;
};

export const requestEmbeddedBrowserOpen = ({
  title,
  url,
  eventTarget,
}: EmbeddedBrowserOpenOptions): boolean => {
  const normalizedUrl = normalizeEmbeddedBrowserUrl(url);
  const target = eventTarget ?? (typeof window !== 'undefined' ? window : null);

  if (!normalizedUrl || !target) {
    return false;
  }

  const detail: EmbeddedBrowserRequest = {
    title: title.trim() || normalizedUrl,
    url: normalizedUrl,
  };

  return target.dispatchEvent(createOpenEvent(detail));
};