export const TOUCH_TARGET_CLASS = 'min-h-11 min-w-11';

// [FLOW] Unified main content width for top-level views (Skills/MCP/ScheduledTasks).
export const RESPONSIVE_CONTENT_WRAP_CLASS = 'w-full max-w-7xl mx-auto px-3 py-4 sm:px-4 sm:py-6';

// [FLOW] Horizontal alignment helper when a page manages its own vertical spacing.
export const RESPONSIVE_CONTENT_INNER_CLASS = 'w-full max-w-7xl mx-auto px-3 sm:px-4';

export const getResponsiveTabBarClass = (borderClass: string): string => (
  `flex items-center gap-1 overflow-x-auto whitespace-nowrap border-b ${borderClass}`
);

export const getResponsivePageTitleClass = (colorClass: string): string => (
  `truncate text-base sm:text-lg font-semibold ${colorClass}`
);

export const getTouchButtonClass = (baseClass: string): string => (
  `${TOUCH_TARGET_CLASS} ${baseClass}`
);

export const getResponsiveTabButtonClass = (stateClass: string): string => (
  `relative ${TOUCH_TARGET_CLASS} shrink-0 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${stateClass}`
);
