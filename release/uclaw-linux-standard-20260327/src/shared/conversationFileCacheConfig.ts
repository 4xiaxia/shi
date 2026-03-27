/**
 * {标记} 功能: 对话文件缓存配置
 * {标记} 来源: 二开需求总表#1.2
 * {标记} 用途: 明确指定缓存目录，与记忆管理系统配套
 * {标记} 集成: Settings.tsx / memoryManagementPreset.ts
 * {标记} 状态: 源代码完整✅
 */

export interface ConversationFileCacheSettingsValue {
  directory: string;
  autoBackupDaily: boolean;
}

export interface ConversationFileCacheConfigLike {
  conversationFileCache?: {
    directory?: string;
    autoBackupDaily?: boolean;
  };
}

const DEFAULT_CONVERSATION_FILE_CACHE: ConversationFileCacheSettingsValue = {
  directory: '',
  autoBackupDaily: true,
};

export function resolveConversationFileCacheConfig(
  config?: ConversationFileCacheConfigLike | null
): ConversationFileCacheSettingsValue {
  return {
    directory: config?.conversationFileCache?.directory?.trim() ?? DEFAULT_CONVERSATION_FILE_CACHE.directory,
    autoBackupDaily: config?.conversationFileCache?.autoBackupDaily ?? DEFAULT_CONVERSATION_FILE_CACHE.autoBackupDaily,
  };
}

export function buildConversationFileCacheUpdate(
  directory: string,
  autoBackupDaily: boolean
): { conversationFileCache: ConversationFileCacheSettingsValue } {
  return {
    conversationFileCache: {
      directory: directory.trim(),
      autoBackupDaily,
    },
  };
}
