import React from 'react';

/**
 * Stub WindowTitleBar component for web builds
 * In web builds, this component renders nothing as window controls are not applicable
 */
interface WindowTitleBarProps {
  isOverlayActive?: boolean;
  inline?: boolean;
  className?: string;
}

const WindowTitleBar: React.FC<WindowTitleBarProps> = () => {
  return null;
};

export default WindowTitleBar;
