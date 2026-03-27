/**
 * CoworkStore 常量定义
 * 
 * FLOW: 会话存储常量 步骤1: 定义会话存储所需的常量
 * 
 * @module main/coworkStore/constants
 */

/**
 * 任务工作空间容器目录
 */
export const TASK_WORKSPACE_CONTAINER_DIR = '.uclaw-tasks';

/**
 * 默认记忆功能启用
 */
export const DEFAULT_MEMORY_ENABLED = true;

/**
 * 默认隐式更新启用
 */
export const DEFAULT_MEMORY_IMPLICIT_UPDATE_ENABLED = true;

/**
 * 默认 LLM 判断启用
 */
export const DEFAULT_MEMORY_LLM_JUDGE_ENABLED = false;

/**
 * 默认记忆保护级别
 */
export const DEFAULT_MEMORY_GUARD_LEVEL = 'strict';

/**
 * 默认用户记忆最大条目数
 */
export const DEFAULT_MEMORY_USER_MEMORIES_MAX_ITEMS = 12;

/**
 * 最小用户记忆最大条目数
 */
export const MIN_MEMORY_USER_MEMORIES_MAX_ITEMS = 1;

/**
 * 最大用户记忆最大条目数
 */
export const MAX_MEMORY_USER_MEMORIES_MAX_ITEMS = 60;

/**
 * 记忆近似重复最小分数
 */
export const MEMORY_NEAR_DUPLICATE_MIN_SCORE = 0.82;

/**
 * 记忆程序化文本正则表达式
 */
export const MEMORY_PROCEDURAL_TEXT_RE = /(执行以下命令|run\s+(?:the\s+)?following\s+command|\b(?:cd|npm|pnpm|yarn|node|python|bash|sh|git|curl|wget)\b|\$[A-Z_][A-Z0-9_]*|&&|--[a-z0-9-]+|\/tmp\/|\.sh\b|\.bat\b|\.ps1\b)/i;

/**
 * 记忆助手风格文本正则表达式
 */
export const MEMORY_ASSISTANT_STYLE_TEXT_RE = /^(?:使用|use)\s+[A-Za-z0-9._-]+\s*(?:技能|skill)/i;

/**
 * 对话文件备份状态键
 */
export const CONVERSATION_FILE_BACKUP_STATE_KEY = 'conversationFileCache.lastBackupDate';

/**
 * 相似度缓存最大大小
 */
export const SIMILARITY_CACHE_MAX_SIZE = 1000;

/**
 * 记忆文本最大长度
 */
export const MEMORY_TEXT_MAX_LENGTH = 360;
