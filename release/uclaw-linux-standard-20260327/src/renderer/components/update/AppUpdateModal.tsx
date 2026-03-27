import React from 'react';

/**
 * Stub AppUpdateModal component for web builds
 * In web builds, this component renders nothing as auto-updates are handled differently
 */
interface AppUpdateModalProps {
  updateInfo: {
    latestVersion: string;
    url: string;
    releaseNotes?: string;
  };
  onCancel: () => void;
  onConfirm: () => void;
  modalState: 'info' | 'downloading' | 'installing' | 'error';
  downloadProgress: {
    received: number;
    total: number | undefined;
    percent: number | undefined;
    speed: number | undefined;
  } | null;
  errorMessage: string | null;
  onCancelDownload: () => void;
  onRetry: () => void;
}

const AppUpdateModal: React.FC<AppUpdateModalProps> = () => {
  return null;
};

export default AppUpdateModal;
