import React from 'react';

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'warm' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button'
}) => {
  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return 'from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700';
      case 'secondary':
        return 'from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700';
      case 'warm':
        return 'from-amber-400 to-orange-600 hover:from-amber-500 hover:to-orange-700';
      case 'purple':
        return 'from-purple-400 to-indigo-600 hover:from-purple-500 hover:to-indigo-700';
      default:
        return 'from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2 text-sm';
      case 'md':
        return 'px-4 py-2.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-base';
      default:
        return 'px-4 py-2.5 text-sm';
    }
  };

  const getShadowClasses = () => {
    if (disabled) return '';
    
    switch (variant) {
      case 'primary':
      case 'purple':
        return 'shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40';
      case 'secondary':
      case 'warm':
        return 'shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40';
      default:
        return 'shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        bg-gradient-to-r ${getGradientColors()}
        ${getSizeClasses()}
        ${getShadowClasses()}
        text-white font-medium
        rounded-2xl
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2
        ${variant === 'primary' || variant === 'purple' ? 'focus:ring-purple-500' : 'focus:ring-amber-500'}
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export default GradientButton;