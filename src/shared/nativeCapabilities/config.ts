import {
  AGENT_ROLE_ORDER,
  type AgentRoleKey,
  type AppConfigLike,
} from '../agentRoleConfig';

export type NativeCapabilityId = 'ima-native-addon' | 'browser-eyes-native-addon';

export type NativeCapabilityRoleConfig = Record<AgentRoleKey, boolean>;

export type NativeCapabilityEntryConfig = {
  enabled: boolean;
  priority: number;
  roles: NativeCapabilityRoleConfig;
};

export type NativeCapabilitiesConfig = Record<NativeCapabilityId, NativeCapabilityEntryConfig>;

export const NATIVE_CAPABILITY_ORDER: NativeCapabilityId[] = [
  'ima-native-addon',
  'browser-eyes-native-addon',
];

export const NATIVE_CAPABILITY_LABELS: Record<NativeCapabilityId, { title: string; description: string }> = {
  'ima-native-addon': {
    title: 'IMA 笔记',
    description: '腾讯 IMA 的搜索、读取和新建笔记能力。',
  },
  'browser-eyes-native-addon': {
    title: '小眼睛外挂',
    description: '先用轻量 DOM 观察看页面，再决定要不要上重浏览器。',
  },
};

function buildRoleConfig(enabledRoles: AgentRoleKey[]): NativeCapabilityRoleConfig {
  return AGENT_ROLE_ORDER.reduce((acc, roleKey) => {
    acc[roleKey] = enabledRoles.includes(roleKey);
    return acc;
  }, {} as NativeCapabilityRoleConfig);
}

export function createDefaultNativeCapabilitiesConfig(): NativeCapabilitiesConfig {
  return {
    'ima-native-addon': {
      enabled: true,
      priority: 80,
      roles: buildRoleConfig(['organizer', 'writer', 'designer', 'analyst']),
    },
    'browser-eyes-native-addon': {
      enabled: true,
      priority: 60,
      roles: buildRoleConfig(['organizer', 'writer', 'designer', 'analyst']),
    },
  };
}

function isLegacyBrowserEyesRoleConfig(value: NativeCapabilityRoleConfig): boolean {
  return value.organizer === true
    && value.writer === false
    && value.designer === true
    && value.analyst === false;
}

function normalizeRoleConfig(
  value: unknown,
  fallback: NativeCapabilityRoleConfig
): NativeCapabilityRoleConfig {
  const record = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

  return AGENT_ROLE_ORDER.reduce((acc, roleKey) => {
    const raw = record[roleKey];
    acc[roleKey] = typeof raw === 'boolean' ? raw : fallback[roleKey];
    return acc;
  }, {} as NativeCapabilityRoleConfig);
}

function normalizeEntryConfig(
  value: unknown,
  fallback: NativeCapabilityEntryConfig
): NativeCapabilityEntryConfig {
  const record = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

  const priority = Number(record.priority);

  return {
    enabled: typeof record.enabled === 'boolean' ? record.enabled : fallback.enabled,
    priority: Number.isFinite(priority) ? Math.max(-999, Math.min(999, Math.round(priority))) : fallback.priority,
    roles: normalizeRoleConfig(record.roles, fallback.roles),
  };
}

export function normalizeNativeCapabilitiesConfig(
  value?: unknown
): NativeCapabilitiesConfig {
  const defaults = createDefaultNativeCapabilitiesConfig();
  const record = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

  const normalized = {
    'ima-native-addon': normalizeEntryConfig(record['ima-native-addon'], defaults['ima-native-addon']),
    'browser-eyes-native-addon': normalizeEntryConfig(record['browser-eyes-native-addon'], defaults['browser-eyes-native-addon']),
  };

  // 兼容旧配置：早期把小眼睛只开放给 organizer/designer。
  // 现在它属于底层公共能力，需要所有 agent 都能接到这条链。
  if (isLegacyBrowserEyesRoleConfig(normalized['browser-eyes-native-addon'].roles)) {
    normalized['browser-eyes-native-addon'] = {
      ...normalized['browser-eyes-native-addon'],
      roles: buildRoleConfig(['organizer', 'writer', 'designer', 'analyst']),
    };
  }

  return normalized;
}

export function resolveNativeCapabilitiesConfigFromAppConfig(
  appConfig?: AppConfigLike | null
): NativeCapabilitiesConfig {
  return normalizeNativeCapabilitiesConfig(
    appConfig && typeof appConfig === 'object'
      ? (appConfig as Record<string, unknown>).nativeCapabilities
      : undefined
  );
}

export function isNativeCapabilityEnabledForRole(
  config: NativeCapabilitiesConfig,
  capabilityId: NativeCapabilityId,
  roleKey: AgentRoleKey
): boolean {
  const entry = config[capabilityId];
  return Boolean(entry?.enabled && entry.roles[roleKey]);
}

export function sortNativeCapabilityIdsByPriority(
  config: NativeCapabilitiesConfig,
  capabilityIds: NativeCapabilityId[]
): NativeCapabilityId[] {
  return [...capabilityIds].sort((a, b) => config[b].priority - config[a].priority);
}
