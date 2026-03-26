// ROUTE: Helper - 服务端路由辅助函数
// API: asyncHandler - 统一的异步路由错误处理
// CHECKPOINT: 验证错误处理完整性

import type { Request, Response, NextFunction } from 'express';

/**
 * 统一的异步路由错误处理包装器
 * 自动捕获异常并返回标准格式的错误响应
 * 
 * @param handler - 异步处理函数
 * @param errorMessage - 错误消息(可选)
 * @returns Express中间件函数
 * 
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await userService.getUsers();
 *   return users;
 * }, 'Failed to fetch users'));
 */
export function asyncHandler<T>(
  handler: (req: Request, res: Response) => Promise<T>,
  errorMessage: string = 'Operation failed'
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await handler(req, res);
      res.json({ success: true, data: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : errorMessage;
      console.error(`[${errorMessage}]`, error);
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  };
}

/**
 * 验证请求体是否包含必需字段
 * 
 * @param requiredFields - 必需字段名数组
 * @returns Express中间件函数
 * 
 * @example
 * router.post('/users', validateRequiredFields(['name', 'email']), asyncHandler(async (req, res) => {
 *   // req.body 已经验证包含 name 和 email
 * }));
 */
export function validateRequiredFields(requiredFields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missingFields = requiredFields.filter(field => !(field in req.body));
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }
    
    next();
  };
}
