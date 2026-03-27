/**
 * CoworkSessionDetail 组件类型定义
 * 
 * FLOW: 会话详情类型 步骤1: 定义会话详情页面所需的类型
 * 
 * @module components/cowork/sessionDetailTypes
 */

import type { CoworkMessage } from '../../types/cowork';

/**
 * 工具组项目
 */
export interface ToolGroupItem {
  message: CoworkMessage;
  toolName: string;
  input: unknown;
  result: string;
}

/**
 * 显示项目类型
 */
export type DisplayItem =
  | { type: 'user'; message: CoworkMessage }
  | { type: 'assistant'; message: CoworkMessage }
  | { type: 'tool'; items: ToolGroupItem[] };

/**
 * 助手回合项目
 */
export interface AssistantTurnItem {
  message: CoworkMessage;
  toolGroups: ToolGroupItem[][];
  isStreaming?: boolean;
}

/**
 * 对话回合
 */
export interface ConversationTurn {
  userMessage: CoworkMessage;
  assistantMessage: CoworkMessage | null;
  toolGroups: ToolGroupItem[][];
}

/**
 * 导出选项
 */
export interface ExportOptions {
  format: 'png' | 'html';
  includeMetadata?: boolean;
  includeTimestamp?: boolean;
}

/**
 * 消息显示状态
 */
export interface MessageDisplayState {
  expanded: boolean;
  pinned: boolean;
  selectedText: string;
}

/**
 * 工具输入预览配置
 */
export interface ToolInputPreviewConfig {
  maxChars: number;
  maxDepth: number;
  maxKeys: number;
  maxItems: number;
}
