import { apiClient } from './apiClient';

// {标记} P0-SKILLS-MCP-HELPER: 前端独立服务层，只连接 Skills / MCP 小助手接口

export interface SkillsMcpHelperManifest {
  name: string;
  mode: 'standalone-plugin';
  promptPath: string;
  prompt: string;
  boundaries: string[];
  tasks: string[];
  directories: {
    workspaceRoot: string;
    bundledSkillsRoot: string;
    runtimeUserDataPath: string;
    runtimeSkillsRoot: string;
    rolesRoot: string;
    mcpStorage: string;
    skillBindingStorage: string;
    helperApiKeyEnv: string;
  };
  roleDirectories: Record<string, string>;
}

export interface SkillsMcpHelperChatPayload {
  success?: boolean;
  reply?: string;
}

class SkillsMcpHelperService {
  // {标记} P0-SKILLS-MCP-HELPER: 读取小助手边界、目录和任务说明
  async getManifest(): Promise<SkillsMcpHelperManifest | null> {
    try {
      const result = await apiClient.get<{ success?: boolean; manifest?: SkillsMcpHelperManifest }>('/skills-mcp-helper/manifest');
      if (!result.success) {
        return null;
      }
      const payload = result.data;
      if (!payload?.manifest) {
        return null;
      }
      return payload.manifest;
    } catch (error) {
      console.error('[skills-mcp-helper] Failed to load manifest:', error);
      return null;
    }
  }

  // {标记} P0-SKILLS-MCP-HELPER: 发送独立小窗消息，不进入主聊天状态树
  async chat(message: string, contextLabel: 'Skills' | 'MCP', roleKey: string): Promise<string | null> {
    try {
      const result = await apiClient.post<SkillsMcpHelperChatPayload>('/skills-mcp-helper/chat', {
        message,
        contextLabel,
        roleKey,
      });
      if (!result.success) {
        return null;
      }
      const payload = result.data;
      if (!payload?.success || !payload.reply) {
        return null;
      }
      return payload.reply;
    } catch (error) {
      console.error('[skills-mcp-helper] Failed to chat:', error);
      return null;
    }
  }
}

export const skillsMcpHelperService = new SkillsMcpHelperService();
