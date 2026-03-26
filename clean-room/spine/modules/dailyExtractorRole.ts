import type { AgentRoleKey, KvStore } from './contracts';

export interface DailyExtractorRoleBinding {
  agentRoleKey: AgentRoleKey;
  apiUrl: string;
  apiKey: string;
  modelId: string;
  apiFormat: 'openai' | 'anthropic';
}

export function selectDailyExtractorRole(store: KvStore): DailyExtractorRoleBinding | null {
  const appConfig = store.get<Record<string, any>>('app_config') || {};
  const agentRoles = appConfig.agentRoles || {};
  const preferredOrder = ['organizer', 'writer', 'analyst', 'designer'];

  for (const preferredRoleKey of preferredOrder) {
    const config = agentRoles[preferredRoleKey];
    if (!config?.enabled || !config.apiUrl || !config.apiKey || !config.modelId) {
      continue;
    }
    return {
      agentRoleKey: preferredRoleKey,
      apiUrl: String(config.apiUrl),
      apiKey: String(config.apiKey),
      modelId: String(config.modelId),
      apiFormat: config.apiFormat === 'anthropic' ? 'anthropic' : 'openai',
    };
  }

  for (const [agentRoleKey, roleConfig] of Object.entries(agentRoles)) {
    const config = roleConfig as Record<string, any>;
    if (!config?.enabled || !config.apiUrl || !config.apiKey || !config.modelId) {
      continue;
    }
    return {
      agentRoleKey,
      apiUrl: String(config.apiUrl),
      apiKey: String(config.apiKey),
      modelId: String(config.modelId),
      apiFormat: config.apiFormat === 'anthropic' ? 'anthropic' : 'openai',
    };
  }

  return null;
}
