/**
 * {标记} 功能：通用按钮组件
 * {标记} 用途：统一按钮样式，减少重复代码
 * {标记} 集成：Settings.tsx, IMSettings.tsx, 等所有页面
 * {标记} 状态：新建✅
 */

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮变体 */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否加载中 */
  loading?: boolean;
  /** 是否全屏宽度 */
  fullWidth?: boolean;
  /** 左侧图标 */
  leftIcon?: React.ReactNode;
  /** 右侧图标 */
  rightIcon?: React.ReactNode;
  /** 子元素 */
  children?: React.ReactNode;
}

const variantClasses: Record<string, string> = {
  primary: 'bg-claude-accent hover:bg-claude-accentHover text-white shadow-subtle',
  secondary: 'bg-claude-surfaceHover hover:bg-claude-accent/10 text-claude-text dark:bg-claude-darkSurfaceHover dark:text-claude-darkText',
  ghost: 'bg-transparent hover:bg-claude-surfaceHover text-claude-textSecondary dark:hover:bg-claude-darkSurfaceHover dark:text-claude-darkTextSecondary',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
  success: 'bg-green-500 hover:bg-green-600 text-white',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = `
    inline-flex items-center justify-center gap-2
    rounded-xl font-medium
    transition-colors duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-claude-accent/50
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim();

  return (
    <button
      className={baseClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {leftIcon && !loading && <span className="flex-shrink-0">{leftIcon}</span>}
      {children && <span>{children}</span>}
      {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
};

export default Button;
