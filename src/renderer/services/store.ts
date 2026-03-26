// 删除重复的类型声明，使用全局类型定义
export interface LocalStore {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
}

class LocalStoreService implements LocalStore {
  // {埋点} 💾 KV读取 (ID: kv-read-001) window.electron.store.get(key) → GET /api/store/:key → SQLite kv表
  async getItem<T>(key: string): Promise<T | null> {
    const storeApi = window.electron?.store;
    if (!storeApi) {
      return null;
    }

    try {
      const value = await storeApi.get(key);
      if (value && typeof value === 'object' && 'success' in value) {
        const storeResult = value as { success: boolean; value?: T };
        if (!storeResult.success) {
          return null;
        }
        return storeResult.value ?? null;
      }
      return (value as T | null) ?? null;
    } catch (error) {
      console.error('Failed to get item from store:', error);
      return null;
    }
  }

  // {埋点} 💾 KV写入 (ID: kv-write-001) window.electron.store.set(key,value) → PUT /api/store/:key → SQLite kv表
  async setItem<T>(key: string, value: T): Promise<void> {
    const storeApi = window.electron?.store;
    if (!storeApi) {
      return;
    }

    try {
      await storeApi.set(key, value);
    } catch (error) {
      console.error('Failed to set item in store:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    const storeApi = window.electron?.store;
    if (!storeApi) {
      return;
    }

    try {
      await storeApi.remove(key);
    } catch (error) {
      console.error('Failed to remove item from store:', error);
      throw error;
    }
  }
}

export const localStore = new LocalStoreService(); 