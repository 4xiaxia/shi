import React from 'react';

/**
 * Stub AppUpdateBadge component for web builds
 * In web builds, this component renders nothing as auto-updates are handled differently
 */
interface AppUpdateBadgeProps {
  latestVersion: string;
  onClick: () => void;
}

const AppUpdateBadge: React.FC<AppUpdateBadgeProps> = () => {
  return null;
};

export default AppUpdateBadge;
