import type { QuickActionsConfig, QuickAction, Prompt, LocalizedQuickAction } from '../types/quickAction';

const CONFIG_PATH = './quick-actions.json';

class QuickActionService {
  private config: QuickActionsConfig | null = null;
  private listeners = new Set<() => void>();

  /**
   * 加载快捷操作配置
   */
  async loadConfig(): Promise<QuickActionsConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      const response = await fetch(CONFIG_PATH);
      if (!response.ok) {
        throw new Error(`Failed to load quick actions config: ${response.status}`);
      }
      const data = await response.json();
      this.config = data as QuickActionsConfig;
      return this.config;
    } catch (error) {
      console.error('Failed to load quick actions config:', error);
      return { version: 1, actions: [] };
    }
  }

  /**
   * 获取所有快捷操作（硬编码中文，不再加载i18n）
   */
  async getLocalizedActions(): Promise<LocalizedQuickAction[]> {
    const config = await this.loadConfig();

    return config.actions.map(action => ({
      ...action,
      label: action.label || action.id,
      prompts: action.prompts.map(prompt => ({
        id: prompt.id,
        label: prompt.label || prompt.id,
        description: prompt.description,
        prompt: prompt.prompt || '',
      })),
    }));
  }

  /**
   * 获取所有快捷操作（原始数据）
   */
  async getActions(): Promise<QuickAction[]> {
    const config = await this.loadConfig();
    return config.actions;
  }

  /**
   * 根据 ID 获取快捷操作（已本地化）
   */
  async getLocalizedActionById(id: string): Promise<LocalizedQuickAction | undefined> {
    const actions = await this.getLocalizedActions();
    return actions.find(action => action.id === id);
  }

  /**
   * 根据 ID 获取快捷操作（原始数据）
   */
  async getActionById(id: string): Promise<QuickAction | undefined> {
    const actions = await this.getActions();
    return actions.find(action => action.id === id);
  }

  /**
   * 根据 actionId 和 promptId 获取提示词（原始数据）
   */
  async getPrompt(actionId: string, promptId: string): Promise<Prompt | undefined> {
    const action = await this.getActionById(actionId);
    if (!action) return undefined;
    return action.prompts.find(prompt => prompt.id === promptId);
  }

  /**
   * 根据 skillMapping 获取对应的快捷操作（已本地化）
   */
  async getLocalizedActionBySkillMapping(skillMapping: string): Promise<LocalizedQuickAction | undefined> {
    const actions = await this.getLocalizedActions();
    return actions.find(action => action.skillMapping === skillMapping);
  }

  /**
   * 根据 skillMapping 获取对应的快捷操作（原始数据）
   */
  async getActionBySkillMapping(skillMapping: string): Promise<QuickAction | undefined> {
    const actions = await this.getActions();
    return actions.find(action => action.skillMapping === skillMapping);
  }

  /**
   * 订阅语言变化事件
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 通知所有订阅者
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * 清除缓存（用于重新加载）
   */
  clearCache(): void {
    this.config = null;
    this.notifyListeners();
  }

  /**
   * 初始化服务
   */
  initialize(): void {
    // No-op: language is always zh
  }
}

export const quickActionService = new QuickActionService();
