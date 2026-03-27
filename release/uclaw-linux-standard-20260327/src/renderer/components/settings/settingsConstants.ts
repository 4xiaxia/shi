/**
 * Settings 组件常量
 * 
 * FLOW: 设置常量 步骤1: 定义设置页面所需的常量
 * 
 * @module components/settings/settingsConstants
 */

/**
 * 提供商密钥配置
 */
export const providerKeys = [
  'anthropic',
  'openai',
  'gemini',
  'deepseek',
  'moonshot',
  'zhipu',
  'minimax',
  'youdao_zhiyun',
  'qwen',
  'xiaomi',
  'stepfun',
  'volcengine',
  'openrouter',
  'ollama',
  'custom',
] as const;

/**
 * 提供商类型
 */
export type ProviderType = (typeof providerKeys)[number];

/**
 * 提供商切换默认 Base URLs
 */
export const providerSwitchableDefaultBaseUrls: Partial<
  Record<ProviderType, { anthropic: string; openai: string }>
> = {
  openai: {
    anthropic: 'https://api.openai.com/v1',
    openai: 'https://api.openai.com/v1',
  },
  gemini: {
    anthropic: 'https://generativelanguage.googleapis.com/v1beta',
    openai: 'https://generativelanguage.googleapis.com/v1beta',
  },
  deepseek: {
    anthropic: 'https://api.deepseek.com/v1',
    openai: 'https://api.deepseek.com/v1',
  },
  moonshot: {
    anthropic: 'https://api.moonshot.cn/v1',
    openai: 'https://api.moonshot.cn/v1',
  },
  zhipu: {
    anthropic: 'https://open.bigmodel.cn/api/paas/v4',
    openai: 'https://open.bigmodel.cn/api/paas/v4',
  },
  minimax: {
    anthropic: 'https://api.minimax.chat/v1',
    openai: 'https://api.minimax.chat/v1',
  },
  qwen: {
    anthropic: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    openai: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
  xiaomi: {
    anthropic: 'https://api.ai.srv.mi.com/v1',
    openai: 'https://api.ai.srv.mi.com/v1',
  },
  stepfun: {
    anthropic: 'https://api.stepfun.com/v1',
    openai: 'https://api.stepfun.com/v1',
  },
  volcengine: {
    anthropic: 'https://ark.cn-beijing.volces.com/api/v3',
    openai: 'https://ark.cn-beijing.volces.com/api/v3',
  },
  openrouter: {
    anthropic: 'https://openrouter.ai/api/v1',
    openai: 'https://openrouter.ai/api/v1',
  },
};

/**
 * 默认提供商配置
 */
export interface ProvidersConfig {
  activeProvider: ProviderType;
  providers: Partial<Record<ProviderType, { apiKey?: string; baseUrl?: string }>>;
}

/**
 * 获取默认提供商配置
 */
export function getDefaultProviders(): ProvidersConfig {
  return {
    activeProvider: 'anthropic',
    providers: {},
  };
}

/**
 * 获取默认活跃提供商
 */
export function getDefaultActiveProvider(): ProviderType {
  return 'anthropic';
}

/**
 * 获取提供商的默认 Base URL
 */
export function getProviderDefaultBaseUrl(
  provider: ProviderType,
  apiFormat: 'anthropic' | 'openai' = 'anthropic'
): string {
  const baseUrl = providerSwitchableDefaultBaseUrls[provider];
  if (baseUrl && baseUrl[apiFormat]) {
    return baseUrl[apiFormat];
  }
  
  // Ollama 默认使用本地地址
  if (provider === 'ollama') {
    return 'http://localhost:11434/v1';
  }
  
  // 默认 Anthropic
  return 'https://api.anthropic.com/v1';
}

/**
 * 解析 Base URL
 */
export function resolveBaseUrl(
  provider: ProviderType,
  userBaseUrl: string | undefined,
  apiFormat: 'anthropic' | 'openai'
): string {
  if (userBaseUrl && userBaseUrl.trim()) {
    return userBaseUrl.trim().replace(/\/+$/, '');
  }
  return getProviderDefaultBaseUrl(provider, apiFormat);
}

/**
 * 是否应自动切换提供商 Base URL
 */
export function shouldAutoSwitchProviderBaseUrl(
  provider: ProviderType,
  currentBaseUrl: string
): boolean {
  const switchable = providerSwitchableDefaultBaseUrls[provider];
  if (!switchable) return false;
  
  const normalized = currentBaseUrl.toLowerCase().replace(/\/+$/, '');
  const anthropicUrl = switchable.anthropic.replace(/\/+$/, '');
  const openaiUrl = switchable.openai.replace(/\/+$/, '');
  
  return normalized === anthropicUrl || normalized === openaiUrl;
}
