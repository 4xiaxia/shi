/**
 * {标记} 功能：通用徽章组件
 * {标记} 用途：状态标识、计数、标签等
 * {标记} 集成：Settings.tsx, IMSettings.tsx, 等所有页面
 * {标记} 状态：新建✅
 */

import React from 'react';

export interface BadgeProps {
  /** 徽章变体 */
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** 徽章尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否为点状徽章 */
  dot?: boolean;
  /** 是否带边框 */
  outlined?: boolean;
  /** 子元素 */
  children?: React.ReactNode;
  /** 额外类名 */
  className?: string;
}

const variantClasses: Record<string, string> = {
  default: 'bg-claude-surfaceHover text-claude-textSecondary dark:bg-claude-darkSurfaceHover dark:text-claude-darkTextSecondary',
  primary: 'bg-claude-accent/15 text-claude-accent dark:bg-claude-accent/20 dark:text-claude-accentLight',
  success: 'bg-green-500/15 text-green-600 dark:bg-green-500/20 dark:text-green-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
  danger: 'bg-red-500/15 text-red-600 dark:bg-red-500/20 dark:text-red-400',
  info: 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-1.5 py-0.5 text-[10px] leading-none',
  md: 'px-2 py-0.5 text-xs leading-none',
  lg: 'px-2.5 py-1 text-sm leading-none',
};

const dotSizeClasses: Record<string, string> = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-2.5 w-2.5',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  dot = false,
  outlined = false,
  children,
  className = '',
}) => {
  const baseClasses = `
    inline-flex items-center gap-1.5
    rounded-full font-medium
    ${variantClasses[variant]}
    ${outlined ? 'ring-1 ring-inset ring-current' : ''}
    ${dot ? 'px-0 py-0' : sizeClasses[size]}
    ${className}
  `.trim();

  return (
    <span className={baseClasses}>
      {dot && (
        <span className={`rounded-full bg-current ${dotSizeClasses[size]}`} />
      )}
      {!dot && children}
    </span>
  );
};

export default Badge;
