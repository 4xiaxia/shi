import type { AgentRoleKey } from './contracts';

export interface DailySummaryRoleInput {
  agentRoleKey: AgentRoleKey;
  threadMessageCount: number;
}

export interface DailySummaryRoleResult {
  agentRoleKey: AgentRoleKey;
  status: 'skipped' | 'written' | 'write_failed';
  threadMessageCount: number;
  durableWriteCompleted: boolean;
  clearedHotCache: boolean;
  error?: string;
}

export interface DailySummaryPipelineDeps<TThread, TSummary> {
  scanActiveRoles(): Promise<DailySummaryRoleInput[]> | DailySummaryRoleInput[];
  loadThread(agentRoleKey: AgentRoleKey): Promise<TThread | null> | TThread | null;
  buildSummary(agentRoleKey: AgentRoleKey, thread: TThread): Promise<TSummary | null> | TSummary | null;
  writeDurableSummary(agentRoleKey: AgentRoleKey, summary: TSummary): Promise<void> | void;
  clearHotCache(agentRoleKey: AgentRoleKey): Promise<void> | void;
  logger?: {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
  };
}

export async function runDailySummaryPipeline<TThread, TSummary>(
  deps: DailySummaryPipelineDeps<TThread, TSummary>
): Promise<DailySummaryRoleResult[]> {
  const log = deps.logger || console;
  const roles = await deps.scanActiveRoles();
  const results: DailySummaryRoleResult[] = [];

  for (const role of roles) {
    let durableWriteCompleted = false;
    let clearedHotCache = false;

    try {
      const thread = await deps.loadThread(role.agentRoleKey);
      if (!thread) {
        results.push({
          agentRoleKey: role.agentRoleKey,
          status: 'skipped',
          threadMessageCount: role.threadMessageCount,
          durableWriteCompleted,
          clearedHotCache,
        });
        continue;
      }

      const summary = await deps.buildSummary(role.agentRoleKey, thread);
      if (!summary) {
        results.push({
          agentRoleKey: role.agentRoleKey,
          status: 'skipped',
          threadMessageCount: role.threadMessageCount,
          durableWriteCompleted,
          clearedHotCache,
        });
        continue;
      }

      await deps.writeDurableSummary(role.agentRoleKey, summary);
      durableWriteCompleted = true;
      log.info(`[DailySummaryPipeline] durable write completed for ${role.agentRoleKey}`);

      await deps.clearHotCache(role.agentRoleKey);
      clearedHotCache = true;
      log.info(`[DailySummaryPipeline] hot cache cleared for ${role.agentRoleKey}`);

      results.push({
        agentRoleKey: role.agentRoleKey,
        status: 'written',
        threadMessageCount: role.threadMessageCount,
        durableWriteCompleted,
        clearedHotCache,
      });
    } catch (error) {
      log.error(
        `[DailySummaryPipeline] ${role.agentRoleKey} failed: ${error instanceof Error ? error.message : String(error)}`
      );
      results.push({
        agentRoleKey: role.agentRoleKey,
        status: 'write_failed',
        threadMessageCount: role.threadMessageCount,
        durableWriteCompleted,
        clearedHotCache,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}
