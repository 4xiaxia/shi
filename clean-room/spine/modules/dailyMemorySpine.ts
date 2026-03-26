import type { AgentRoleKey } from './contracts';

export interface DailyExtractionDeps<TIdentity = unknown, TResult = unknown> {
  listActiveRoles(): AgentRoleKey[];
  readThread(roleKey: AgentRoleKey): TIdentity | null;
  writeDurableMemory(roleKey: AgentRoleKey, threadData: TIdentity): Promise<TResult>;
  clearSharedThread(roleKey: AgentRoleKey): void;
  log(message: string): void;
}

export interface DailyExtractionSummary {
  rolesSeen: number;
  rolesWritten: string[];
  rolesCleared: string[];
  rolesSkipped: string[];
}

export async function runDailyExtraction<TIdentity = unknown, TResult = unknown>(
  deps: DailyExtractionDeps<TIdentity, TResult>
): Promise<DailyExtractionSummary> {
  const roles = deps.listActiveRoles();
  const summary: DailyExtractionSummary = {
    rolesSeen: roles.length,
    rolesWritten: [],
    rolesCleared: [],
    rolesSkipped: [],
  };

  deps.log('[DailyExtraction] 开始执行');

  for (const roleKey of roles) {
    const threadData = deps.readThread(roleKey);
    if (!threadData) {
      deps.log(`[DailyExtraction] [${roleKey}] 无共享白板数据，跳过`);
      summary.rolesSkipped.push(roleKey);
      continue;
    }

    deps.log(`[DailyExtraction] [${roleKey}] 读取到共享白板`);
    await deps.writeDurableMemory(roleKey, threadData);
    deps.log(`[DailyExtraction] [${roleKey}] 写入完成`);
    deps.clearSharedThread(roleKey);
    deps.log(`[DailyExtraction] [${roleKey}] 已清空 24h 热缓存画板`);

    summary.rolesWritten.push(roleKey);
    summary.rolesCleared.push(roleKey);
  }

  deps.log('[DailyExtraction] 完成');
  return summary;
}
