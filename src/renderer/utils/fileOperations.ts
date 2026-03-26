/**
 * File Operations Utility for Web Version
 *
 * This module provides browser-compatible file operations as replacements
 * for Electron's dialog and shell APIs.
 */

export interface FileSelectOptions {
  accept?: string;
  multiple?: boolean;
}

export interface DirectorySelectResult {
  name: string;
  files: File[];
  relativePath: string;
}

export interface ServerPathConfig {
  path: string;
  validated: boolean;
}

/**
 * Browser-compatible file operations class
 */
export class WebFileOperations {
  /**
   * Select a single file
   * @param options File selection options
   * @returns Selected file or null if canceled
   */
  static async selectFile(options?: FileSelectOptions): Promise<File | null> {
    const files = await this.selectFiles({ ...options, multiple: false });
    return files[0] || null;
  }

  /**
   * Select multiple files
   * @param options File selection options
   * @returns Array of selected files
   */
  static async selectFiles(options?: FileSelectOptions): Promise<File[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      if (options?.accept) {
        input.accept = options.accept;
      }
      if (options?.multiple) {
        input.multiple = true;
      }

      const cleanup = () => {
        setTimeout(() => {
          document.body.removeChild(input);
        }, 100);
      };

      input.onchange = (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        cleanup();
        resolve(files);
      };

      input.oncancel = () => {
        cleanup();
        resolve([]);
      };

      document.body.appendChild(input);
      input.click();
    });
  }

  /**
   * Select a directory using webkitdirectory
   * Note: This only gives access to files within the directory,
   * not the directory path itself.
   * @returns Directory selection result or null if canceled
   */
  static async selectDirectory(): Promise<DirectorySelectResult | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;
      input.multiple = true;

      const cleanup = () => {
        setTimeout(() => {
          document.body.removeChild(input);
        }, 100);
      };

      input.onchange = (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || []);
        if (files.length > 0) {
          const firstFile = files[0];
          const relativePath = firstFile.webkitRelativePath; // "dir-name/file.txt"
          const dirName = relativePath.split('/')[0];
          cleanup();
          resolve({
            name: dirName,
            files,
            relativePath: dirName,
          });
        } else {
          cleanup();
          resolve(null);
        }
      };

      input.oncancel = () => {
        cleanup();
        resolve(null);
      };

      document.body.appendChild(input);
      input.click();
    });
  }

  /**
   * Read file as data URL (base64)
   * @param file File to read
   * @returns Data URL string
   */
  static async readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Read file as text
   * @param file File to read
   * @returns File content as string
   */
  static async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Read file as array buffer
   * @param file File to read
   * @returns ArrayBuffer
   */
  static async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Download a file from base64 data
   * @param dataBase64 Base64 data (with or without data URL prefix)
   * @param fileName Download filename
   * @param mimeType MIME type of the file
   */
  static downloadFile(dataBase64: string, fileName: string, mimeType: string): void {
    const base64Data = dataBase64.includes(',')
      ? dataBase64.split(',')[1]
      : dataBase64;

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    this.downloadBlob(blob, fileName);
  }

  /**
   * Download a blob as a file
   * @param blob Blob to download
   * @param fileName Download filename
   */
  static downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Download a file from server
   * @param filePath Server file path
   * @param fileName Optional custom filename
   */
  static async downloadServerFile(filePath: string, fileName?: string): Promise<void> {
    const url = `/api/file/download?path=${encodeURIComponent(filePath)}`;
    const link = document.createElement('a');
    link.href = url;
    if (fileName) {
      link.download = fileName;
    }
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  }

  /**
   * Open external URL in new tab
   * @param url URL to open
   */
  static openExternal(url: string): void {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * Upload a file to the server
   * @param file File to upload
   * @param endpoint Upload endpoint (default: /api/file/upload)
   * @param onProgress Optional progress callback
   * @returns Upload response
   */
  static async uploadFile(
    file: File,
    endpoint: string = '/api/file/upload',
    _onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; path?: string; url?: string; error?: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-auth-token': this.getAuthToken(),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Upload failed' };
    }

    return response.json();
  }

  /**
   * Upload multiple files to the server
   * @param files Files to upload
   * @param endpoint Upload endpoint
   * @param onProgress Optional progress callback
   * @returns Upload results
   */
  static async uploadFiles(
    files: File[],
    endpoint: string = '/api/file/upload',
    onProgress?: (current: number, total: number) => void
  ): Promise<Array<{ success: boolean; path?: string; error?: string }>> {
    const results = await Promise.all(
      files.map(async (file, index) => {
        const result = await this.uploadFile(file, endpoint);
        onProgress?.(index + 1, files.length);
        return result;
      })
    );
    return results;
  }

  /**
   * Request a server-side directory path (for trusted environments)
   * @param defaultPath Default path suggestion
   * @returns Server path configuration
   */
  static async requestServerPath(defaultPath?: string): Promise<ServerPathConfig | null> {
    const path = prompt(
      'Enter server directory path (e.g., /Users/user/projects):',
      defaultPath || ''
    );

    if (!path) {
      return null;
    }

    // Validate with server
    try {
      const response = await fetch('/api/file/validate-directory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': this.getAuthToken(),
        },
        body: JSON.stringify({ path }),
      });

      if (response.ok) {
        const result = await response.json();
        return { path: result.path, validated: true };
      } else {
        const error = await response.json();
        alert(`Invalid path: ${error.error}`);
        return null;
      }
    } catch {
      alert('Failed to validate path with server');
      return null;
    }
  }

  /**
   * Read a server-side file as data URL
   * @param filePath Server file path
   * @returns Data URL
   */
  static async readServerFile(filePath: string): Promise<string> {
    const response = await fetch(
      `/api/file/read?path=${encodeURIComponent(filePath)}`,
      {
        headers: {
          'x-auth-token': this.getAuthToken(),
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to read file');
    }

    const result = await response.json();
    return result.dataUrl;
  }

  /**
   * Export logs as zip download
   */
  static async exportLogs(): Promise<void> {
    const response = await fetch('/api/logs/export', {
      headers: {
        'x-auth-token': this.getAuthToken(),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export logs');
    }

    // Get filename from header
    const contentDisposition = response.headers.get('Content-Disposition');
    const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
    const fileName = fileNameMatch?.[1] || 'uclaw-logs.zip';

    // Download blob
    const blob = await response.blob();
    this.downloadBlob(blob, fileName);
  }

  /**
   * Get auth token from localStorage or env
   */
  private static getAuthToken(): string {
    return (
      localStorage.getItem('uclaw_auth_token') ||
      process.env.VITE_WEB_AUTH_TOKEN ||
      ''
    );
  }
}

/**
 * React hook for file operations
 */
export function useFileOperations() {
  return {
    selectFile: WebFileOperations.selectFile.bind(WebFileOperations),
    selectFiles: WebFileOperations.selectFiles.bind(WebFileOperations),
    selectDirectory: WebFileOperations.selectDirectory.bind(WebFileOperations),
    readFileAsDataURL: WebFileOperations.readFileAsDataURL.bind(WebFileOperations),
    readFileAsText: WebFileOperations.readFileAsText.bind(WebFileOperations),
    readFileAsArrayBuffer: WebFileOperations.readFileAsArrayBuffer.bind(WebFileOperations),
    downloadFile: WebFileOperations.downloadFile.bind(WebFileOperations),
    downloadBlob: WebFileOperations.downloadBlob.bind(WebFileOperations),
    downloadServerFile: WebFileOperations.downloadServerFile.bind(WebFileOperations),
    openExternal: WebFileOperations.openExternal.bind(WebFileOperations),
    uploadFile: WebFileOperations.uploadFile.bind(WebFileOperations),
    uploadFiles: WebFileOperations.uploadFiles.bind(WebFileOperations),
    requestServerPath: WebFileOperations.requestServerPath.bind(WebFileOperations),
    readServerFile: WebFileOperations.readServerFile.bind(WebFileOperations),
    exportLogs: WebFileOperations.exportLogs.bind(WebFileOperations),
  };
}

/**
 * Electron API compatibility shim for file operations
 * Use this to replace window.electron.dialog and window.electron.shell
 */
export const dialogCompat = {
  selectDirectory: WebFileOperations.selectDirectory.bind(WebFileOperations),
  selectFile: WebFileOperations.selectFile.bind(WebFileOperations),
  saveInlineFile: async (options: {
    dataBase64: string;
    fileName?: string;
    mimeType?: string;
  }) => {
    WebFileOperations.downloadFile(
      options.dataBase64,
      options.fileName || 'download',
      options.mimeType || 'application/octet-stream'
    );
    return { success: true, canceled: false };
  },
  readFileAsDataUrl: async (filePath: string) => {
    try {
      const dataUrl = await WebFileOperations.readServerFile(filePath);
      return { success: true, dataUrl };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read file',
      };
    }
  },
};

export const shellCompat = {
  openPath: async (filePath: string) => {
    // Download file instead of opening
    try {
      WebFileOperations.downloadServerFile(filePath);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download file',
      };
    }
  },
  showItemInFolder: async (_filePath: string) => {
    // Not supported in web - return silent error
    return { success: false, error: 'Not supported in web version' };
  },
  openExternal: async (url: string) => {
    WebFileOperations.openExternal(url);
    return { success: true };
  },
};

export const logCompat = {
  exportZip: async () => {
    try {
      await WebFileOperations.exportLogs();
      return { success: true, canceled: false };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export logs',
      };
    }
  },
  getPath: () => ({ success: true, path: '/logs' }),
  openFolder: () => {
    alert('Log folder access is not supported in the web version.');
    return { success: false, error: 'Not supported in web version' };
  },
};

// Default export
export default WebFileOperations;
