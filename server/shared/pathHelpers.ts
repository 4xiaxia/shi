// ROUTE: Helper - 路径处理辅助函数
// API: resolveExistingTaskWorkingDirectory - 验证任务工作目录
// CHECKPOINT: 验证路径存在性和可访问性

import path from 'path';
import fs from 'fs';

/**
 * 解析并验证任务工作目录
 * 确保目录存在且可访问
 * 
 * @param workspaceRoot - 工作目录路径
 * @returns 解析后的绝对路径
 * @throws Error 如果路径无效或目录不存在
 * 
 * @example
 * try {
 *   const resolvedPath = resolveExistingTaskWorkingDirectory('./my-project');
 *   console.log('Valid workspace:', resolvedPath);
 * } catch (error) {
 *   console.error('Invalid workspace:', error.message);
 * }
 */
export function resolveExistingTaskWorkingDirectory(workspaceRoot: string): string {
  const trimmed = workspaceRoot.trim();
  
  if (!trimmed) {
    throw new Error('Please select a task folder before submitting.');
  }
  
  const resolvedWorkspaceRoot = path.resolve(trimmed);
  
  if (!fs.existsSync(resolvedWorkspaceRoot)) {
    throw new Error(`Task folder does not exist: ${resolvedWorkspaceRoot}`);
  }
  
  if (!fs.statSync(resolvedWorkspaceRoot).isDirectory()) {
    throw new Error(`Path is not a directory: ${resolvedWorkspaceRoot}`);
  }
  
  return resolvedWorkspaceRoot;
}

/**
 * 安全地解析路径,防止目录遍历攻击
 * 
 * @param basePath - 基础路径
 * @param relativePath - 相对路径
 * @returns 安全的绝对路径
 * @throws Error 如果路径尝试遍历到基础路径之外
 */
export function safeResolvePath(basePath: string, relativePath: string): string {
  const resolved = path.resolve(basePath, relativePath);
  const normalizedBase = path.normalize(basePath);
  const normalized = path.normalize(resolved);
  
  if (!normalized.startsWith(normalizedBase)) {
    throw new Error('Path traversal detected');
  }
  
  return normalized;
}

/**
 * 检查路径是否在给定基础路径内
 * 
 * @param testPath - 要测试的路径
 * @param basePath - 基础路径
 * @returns 是否在基础路径内
 */
export function isPathWithin(testPath: string, basePath: string): boolean {
  try {
    const normalizedTest = path.normalize(path.resolve(testPath));
    const normalizedBase = path.normalize(path.resolve(basePath));
    return normalizedTest.startsWith(normalizedBase);
  } catch {
    return false;
  }
}
