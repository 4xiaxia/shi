// ROUTE: Helper - API调用辅助函数
// API: safeApiCall - 安全的API调用包装器
// CHECKPOINT: 验证API调用错误处理

/**
 * 安全的API调用包装器
 * 统一处理API调用的成功/失败状态
 * 
 * @param apiCall - API调用函数
 * @param errorMessage - 错误消息
 * @returns API响应数据
 * @throws Error 如果API调用失败
 * 
 * @example
 * const result = await safeApiCall(
 *   () => apiClient.get('/users'),
 *   'Failed to fetch users'
 * );
 * console.log('Users:', result);
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<{ success: boolean; data?: T; error?: string }>,
  errorMessage: string = 'API call failed'
): Promise<T> {
  try {
    const result = await apiCall();
    
    if (result.success && result.data !== undefined) {
      return result.data;
    }
    
    throw new Error(result.error || errorMessage);
  } catch (error) {
    console.error(`[${errorMessage}]`, error);
    throw error;
  }
}

/**
 * 带重试的API调用
 * 在失败时自动重试指定次数
 * 
 * @param apiCall - API调用函数
 * @param maxRetries - 最大重试次数(默认3)
 * @param retryDelay - 重试延迟(ms,默认1000)
 * @returns API响应数据
 * 
 * @example
 * const result = await safeApiCallWithRetry(
 *   () => apiClient.get('/data'),
 *   3,
 *   1000
 * );
 */
export async function safeApiCallWithRetry<T>(
  apiCall: () => Promise<{ success: boolean; data?: T; error?: string }>,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await safeApiCall(apiCall, `Attempt ${attempt}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  throw lastError || new Error('API call failed after retries');
}
