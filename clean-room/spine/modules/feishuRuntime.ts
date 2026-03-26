import type { AgentRoleKey, KvStore } from './contracts';

const DEFAULT_FEISHU_AGENT_ROLE_KEY = 'organizer';

const FEISHU_ROLE_LABELS: Record<string, string> = {
  organizer: '浏览器助手',
  writer: '文字撰写员',
  designer: '美术编辑师',
  analyst: '数据分析师',
};

export interface FeishuRuntimeAppConfig {
  id?: string;
  name?: string;
  appId?: string;
  appSecret?: string;
  agentRoleKey?: AgentRoleKey;
  enabled?: boolean;
  createdAt?: number;
}

export interface FeishuAgentBinding {
  agentRoleKey: AgentRoleKey;
  // modelId is the selected runtime model for this bound role, not an identity key.
  modelId: string;
  roleLabel: string;
}

function resolveFeishuRuntimeRoleKey(agentRoleKey: string): string {
  return agentRoleKey === 'writer' || agentRoleKey === 'designer' || agentRoleKey === 'analyst'
    ? agentRoleKey
    : DEFAULT_FEISHU_AGENT_ROLE_KEY;
}

export function resolveRuntimeFeishuApps(params: {
  configuredApps?: FeishuRuntimeAppConfig[] | null;
  envApp?: FeishuRuntimeAppConfig | null;
}): FeishuRuntimeAppConfig[] {
  const configuredApps = Array.isArray(params.configuredApps)
    ? params.configuredApps.filter((app): app is FeishuRuntimeAppConfig => Boolean(app && typeof app === 'object'))
    : [];
  const envApp = params.envApp;

  if (!envApp) {
    return configuredApps;
  }

  const existingIndex = configuredApps.findIndex((app) => app.appId === envApp.appId);
  if (existingIndex >= 0) {
    return configuredApps.map((app, index) => {
      if (index !== existingIndex) {
        return app;
      }
      return {
        ...app,
        appSecret: app.appSecret || envApp.appSecret,
        agentRoleKey: app.agentRoleKey || envApp.agentRoleKey,
        enabled: app.enabled ?? true,
      };
    });
  }

  return [...configuredApps, envApp];
}

export function resolveFeishuAgentBinding(
  store: KvStore,
  app: FeishuRuntimeAppConfig
): FeishuAgentBinding {
  // {标记} P0-IDENTITY-BOUNDARY: 飞书入口保留原始 agentRoleKey 作为 session/thread/memory 身份；
  // 仅模型与运行时能力解析回落到 4 主角色槽位，避免把小 agent 归一化污染主线记忆。
  const agentRoleKey = (app.agentRoleKey || DEFAULT_FEISHU_AGENT_ROLE_KEY).trim() || DEFAULT_FEISHU_AGENT_ROLE_KEY;
  const runtimeRoleKey = resolveFeishuRuntimeRoleKey(agentRoleKey);
  const configData = store.get<Record<string, any>>('app_config');
  const config = (configData && typeof configData === 'object') ? configData : {};
  const agentRoleConfig = config.agentRoles?.[runtimeRoleKey];

  if (!agentRoleConfig?.enabled || !agentRoleConfig.apiUrl || !agentRoleConfig.modelId) {
    throw new Error(`Runtime role "${runtimeRoleKey}" is not configured properly for Feishu binding "${agentRoleKey}"`);
  }

  return {
    agentRoleKey,
    modelId: agentRoleConfig.modelId,
    roleLabel: FEISHU_ROLE_LABELS[runtimeRoleKey] ?? agentRoleKey,
  };
}
