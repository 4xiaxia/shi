import {
  AGENT_ROLE_LABELS,
  AGENT_ROLE_ORDER,
  type AgentRoleKey,
} from './agentRoleConfig';

export interface SkillsMcpAssistantRoleConfig {
  apiUrl: string;
  apiKey: string;
  modelId: string;
  prompt: string;
}

export type SkillsMcpAssistantByRole = Record<AgentRoleKey, SkillsMcpAssistantRoleConfig>;

export interface SkillsMcpAssistantHelpersConfig {
  skillsMcpAssistantApiKey?: string;
  skillsMcpAssistantByRole?: Partial<Record<AgentRoleKey, Partial<SkillsMcpAssistantRoleConfig>>>;
}

export function buildDefaultSkillsMcpAssistantPrompt(roleKey: AgentRoleKey): string {
  const roleLabel = AGENT_ROLE_LABELS[roleKey];

  return [
    `你是 ${roleLabel} 的 Skills / MCP 技能小帮手。`,
    '你只处理 Skills / MCP 的导入、绑定、配置、排障和轻量指导。',
    '先说结论，再说原因，再说下一步。',
    '不要在普通聊天里回显明文密钥，不要指导安装未知高风险内容。',
    `当前目标角色是 ${roleLabel}（${roleKey}）。`,
  ].join('\n');
}

export function createDefaultSkillsMcpAssistantByRole(): SkillsMcpAssistantByRole {
  return AGENT_ROLE_ORDER.reduce((result, roleKey) => {
    result[roleKey] = {
      apiUrl: '',
      apiKey: '',
      modelId: '',
      prompt: buildDefaultSkillsMcpAssistantPrompt(roleKey),
    };
    return result;
  }, {} as SkillsMcpAssistantByRole);
}

export function normalizeSkillsMcpAssistantByRole(
  helpers?: SkillsMcpAssistantHelpersConfig | null
): SkillsMcpAssistantByRole {
  const defaults = createDefaultSkillsMcpAssistantByRole();
  const byRole = helpers?.skillsMcpAssistantByRole ?? {};

  for (const roleKey of AGENT_ROLE_ORDER) {
    const current = byRole[roleKey] ?? {};
    defaults[roleKey] = {
      apiUrl: typeof current.apiUrl === 'string' ? current.apiUrl.trim().replace(/\/+$/, '') : '',
      apiKey: typeof current.apiKey === 'string' ? current.apiKey.trim() : '',
      modelId: typeof current.modelId === 'string' ? current.modelId.trim() : '',
      prompt:
        typeof current.prompt === 'string' && current.prompt.trim()
          ? current.prompt
          : defaults[roleKey].prompt,
    };
  }

  const legacyApiKey = typeof helpers?.skillsMcpAssistantApiKey === 'string'
    ? helpers.skillsMcpAssistantApiKey.trim()
    : '';
  if (legacyApiKey && !defaults.organizer.apiKey) {
    defaults.organizer.apiKey = legacyApiKey;
  }

  return defaults;
}

export function resolveSkillsMcpAssistantRoleConfig(
  helpers: SkillsMcpAssistantHelpersConfig | undefined | null,
  roleKey: AgentRoleKey
): SkillsMcpAssistantRoleConfig {
  return normalizeSkillsMcpAssistantByRole(helpers)[roleKey];
}
