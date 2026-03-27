import React from 'react';
import { scheduledTaskService } from '../../services/scheduledTask';
import type { ScheduledTaskRun } from '../../types/scheduledTask';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface TaskRunHistoryProps {
  taskId: string;
  runs: ScheduledTaskRun[];
  totalCount?: number;
  loadStep?: number;
  compactHint?: React.ReactNode;
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}m`;
}

const statusConfig: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  success: {
    label: '成功',
    badgeClass: 'bg-green-500/10 text-green-700 dark:text-green-300',
    dotClass: 'bg-green-500',
  },
  error: {
    label: '失败',
    badgeClass: 'bg-red-500/10 text-red-700 dark:text-red-300',
    dotClass: 'bg-red-500',
  },
  running: {
    label: '运行中',
    badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    dotClass: 'bg-blue-500',
  },
};

const triggerLabelMap: Record<string, string> = {
  manual: '手动触发',
  scheduled: '定时触发',
};

const TaskRunHistory: React.FC<TaskRunHistoryProps> = ({
  taskId,
  runs,
  totalCount,
  loadStep = 20,
  compactHint,
}) => {
  const handleLoadMore = async () => {
    const nextLimit = Math.max(runs.length + loadStep, loadStep);
    await scheduledTaskService.loadRuns(taskId, nextLimit, 0);
  };

  if (runs.length === 0) {
    return (
      <div className="text-center py-6 text-sm dark:text-claude-darkTextSecondary text-claude-textSecondary">
        {'暂无运行记录'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {compactHint && (
        <div className="rounded-xl border border-dashed dark:border-claude-darkBorder border-claude-border px-3 py-2 text-xs dark:text-claude-darkTextSecondary text-claude-textSecondary">
          {compactHint}
        </div>
      )}
      <div className="rounded-xl border border-dashed dark:border-claude-darkBorder border-claude-border px-3 py-2 text-xs dark:text-claude-darkTextSecondary text-claude-textSecondary">
        {'默认仅展示最近 3 条运行记录。需要查看更多时，再点击下方按钮继续从历史库加载。'}
      </div>
      {runs.map((run) => {
          const statusInfo = statusConfig[run.status] || {
            label: run.status,
            badgeClass: 'bg-black/5 text-claude-textSecondary dark:bg-white/10 dark:text-claude-darkTextSecondary',
            dotClass: 'bg-claude-textSecondary',
          };
          return (
            <div key={run.id} className="rounded-2xl border dark:border-claude-darkBorder border-claude-border bg-white/60 dark:bg-white/[0.05] px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${statusInfo.dotClass}`} />
                    <span className="text-sm dark:text-claude-darkText text-claude-text">
                      {new Date(run.startedAt).toLocaleString()}
                    </span>
                    {run.status === 'running' && (
                      <svg className="inline-block w-3 h-3 animate-spin text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-75" />
                      </svg>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs dark:text-claude-darkTextSecondary text-claude-textSecondary">
                    <span>{triggerLabelMap[run.trigger] ?? run.trigger}</span>
                    <span>·</span>
                    <span>{formatDuration(run.durationMs)}</span>
                    {run.finishedAt && (
                      <>
                        <span>·</span>
                        <span>结束于 {new Date(run.finishedAt).toLocaleString()}</span>
                      </>
                    )}
                  </div>
                  {run.status === 'error' && run.error && (
                    <div className="mt-2 text-xs text-red-500 break-words">
                      {run.error}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.badgeClass}`}>
                    {statusInfo.label}
                  </span>
                  {run.sessionId && (
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('scheduledTask:viewSession', {
                          detail: { sessionId: run.sessionId },
                        }));
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs dark:border-claude-darkBorder border-claude-border dark:text-claude-darkText text-claude-text hover:bg-claude-surfaceHover dark:hover:bg-claude-darkSurfaceHover transition-colors"
                    >
                      <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                      查看会话
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      {typeof totalCount === 'number' && totalCount > runs.length && (
        <button
          type="button"
          onClick={handleLoadMore}
          className="w-full rounded-2xl border border-dashed dark:border-claude-darkBorder border-claude-border py-3 text-sm text-claude-accent hover:text-claude-accentHover hover:bg-claude-surfaceHover/40 dark:hover:bg-claude-darkSurfaceHover/40 transition-colors"
        >
          {`查看更多历史运行记录（当前已加载 ${runs.length}/${totalCount} 条）`}
        </button>
      )}
    </div>
  );
};

export default TaskRunHistory;
