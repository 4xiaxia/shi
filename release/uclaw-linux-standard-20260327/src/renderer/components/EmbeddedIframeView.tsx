import React, { useEffect, useState } from 'react';

interface EmbeddedIframeViewProps {
  title: string;
  url: string;
}

/**
 * 隐藏 iframe 滚动条的原理：
 * iframe 内部是跨域页面，外部 CSS 无法穿透。
 * 所以让 iframe 比容器宽 20px，滚动条被推到右侧不可见区域，
 * 外层 overflow:hidden 裁掉。用户能正常滚动但看不到滚动条。
 */
const SCROLLBAR_GUTTER = 20; // px，足够覆盖各平台滚动条宽度
const SIDEBAR_IFRAME_RADIUS = '0 0 var(--uclaw-shell-radius) var(--uclaw-shell-radius)';

const EmbeddedIframeView: React.FC<EmbeddedIframeViewProps> = ({ title, url }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
  }, [url]);

  return (
    <div
      className="embedded-iframe-view relative h-full w-full overflow-hidden"
      style={{ borderRadius: SIDEBAR_IFRAME_RADIUS }}
    >
      {/* {BREAKPOINT} IFRAME-EMBED-VIEW
          {FLOW} IFRAME-CROSS-ORIGIN-SHELL: 这里承载跨域 iframe；若出现“内容不显示 / 浏览器报错很多”，优先排查站点响应头、X-Frame-Options/CSP、referrerPolicy 与目标站可嵌入性。 */}
      {/* iframe 容器 — 右侧多出 SCROLLBAR_GUTTER 被裁掉 */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ borderRadius: SIDEBAR_IFRAME_RADIUS }}
      >
        <iframe
          title={title}
          src={url}
          className="absolute top-0 left-0 h-full border-0"
          style={{
            width: `calc(100% + ${SCROLLBAR_GUTTER}px)`,
            colorScheme: 'auto',
            borderRadius: SIDEBAR_IFRAME_RADIUS,
          }}
          referrerPolicy="no-referrer"
          onLoad={() => {
            setIsLoading(false);
          }}
        />
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-pearl-100 dark:bg-claude-darkBg"
          style={{ borderRadius: SIDEBAR_IFRAME_RADIUS }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-claude-accent/20 border-t-claude-accent rounded-full animate-spin" />
            <span className="text-xs text-claude-textSecondary dark:text-claude-darkTextSecondary tracking-wide">{'加载中...'}</span>
          </div>
        </div>
      )}

      {/* Banner overlay */}
      <div
        className="absolute top-0 left-0 right-0 z-20 pointer-events-none"
        style={{ height: 132 }}
      >
        <div
          className="absolute inset-0"
          style={{
            borderRadius: SIDEBAR_IFRAME_RADIUS,
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.18) 18%, rgba(255,255,255,0.08) 42%, rgba(255,255,255,0.03) 64%, rgba(255,255,255,0.01) 80%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.98) 34%, rgba(0,0,0,0.76) 62%, rgba(0,0,0,0.28) 84%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.98) 34%, rgba(0,0,0,0.76) 62%, rgba(0,0,0,0.28) 84%, transparent 100%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-80"
          style={{
            borderRadius: SIDEBAR_IFRAME_RADIUS,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 34%, transparent 100%)',
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-20 opacity-75"
          style={{
            background: 'radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.12) 36%, rgba(255,255,255,0.03) 62%, transparent 100%)',
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-px bg-white/40 dark:bg-white/16"
          style={{
            boxShadow: '0 1px 18px rgba(255,255,255,0.18)',
          }}
        />
        <div className="relative h-16 pointer-events-none" />
      </div>
    </div>
  );
};

export default EmbeddedIframeView;
