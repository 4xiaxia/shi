import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { scheduledTaskService } from '../../services/scheduledTask';
import { ClockIcon } from '@heroicons/react/24/outline';
import TaskRunHistory from './TaskRunHistory';
import { AGENT_ROLE_SHORT_LABELS } from '../../../shared/agentRoleConfig';

const AllRunsHistory: React.FC = () => {
  const tasks = useSelector((state: RootState) => state.scheduledTask.tasks);
  const runsByTask = useSelector((state: RootState) => state.scheduledTask.runs);
  const [runCounts, setRunCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    void scheduledTaskService.loadTasks();
  }, []);

  useEffect(() => {
    if (tasks.length === 0) {
      setRunCounts({});
      return;
    }

    let cancelled = false;
    void Promise.all(
      tasks.map(async (task) => {
        await scheduledTaskService.loadRuns(task.id, 3, 0);
        const count = await scheduledTaskService.countRuns(task.id);
        return { taskId: task.id, count };
      })
    ).then((results) => {
      if (cancelled) return;
      setRunCounts(Object.fromEntries(results.map((item) => [item.taskId, item.count])));
    });

    return () => {
      cancelled = true;
    };
  }, [tasks]);

  const abnormalTasks = useMemo(
    () => tasks.filter((task) => task.state.lastStatus === 'error' || Boolean(task.state.lastError)),
    [tasks]
  );

  const scrollToTaskCard = (taskId: string) => {
    const target = document.getElementById(`scheduled-task-history-card-${taskId}`);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <ClockIcon className="h-12 w-12 dark:text-claude-darkTextSecondary/40 text-claude-textSecondary/40 mb-4" />
        <p className="text-sm font-medium dark:text-claude-darkTextSecondary text-claude-textSecondary">
          {'暂无定时任务'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-3">
      {abnormalTasks.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-4 dark:border-red-900/40 dark:bg-red-950/20">
          <div className="text-sm font-semibold text-red-700 dark:text-red-300">
            {'定时执行异常'}
          </div>
          <div className="mt-3 space-y-2">
            {abnormalTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-red-200/80 bg-white/80 px-3 py-3 dark:border-red-900/30 dark:bg-black/10"
              >
                <div className="text-sm font-medium text-red-700 dark:text-red-300">
                  {task.name}
                </div>
                <div className="mt-1 text-xs text-red-600/90 dark:text-red-300/80">
                  {`任务ID：${task.id}`}
                </div>
                <button
                  type="button"
                  onClick={() => scrollToTaskCard(task.id)}
                  className="mt-3 inline-flex items-center rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/30 dark:text-red-300 dark:hover:bg-red-900/20"
                >
                  {'点击查看异常报错问题'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks.map((task) => {
        const runs = runsByTask[task.id] ?? [];
        const totalCount = runCounts[task.id];
        const roleLabel = task.agentRoleKey
          ? (AGENT_ROLE_SHORT_LABELS[task.agentRoleKey] ?? task.agentRoleKey)
          : '未设置';

        return (
          <section
            key={task.id}
            id={`scheduled-task-history-card-${task.id}`}
            className="rounded-2xl border dark:border-claude-darkBorder border-claude-border bg-white/65 dark:bg-white/[0.05] px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold dark:text-claude-darkText text-claude-text">
                  {task.name}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs dark:text-claude-darkTextSecondary text-claude-textSecondary">
                  <span>{`任务ID：${task.id}`}</span>
                  <span>·</span>
                  <span>{`角色：${roleLabel}`}</span>
                  {typeof totalCount === 'number' && (
                    <>
                      <span>·</span>
                      <span>{`历史记录：${totalCount} 条`}</span>
                    </>
                  )}
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                task.state.runningAtMs
                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
                  : task.state.lastStatus === 'error'
                    ? 'bg-red-500/10 text-red-700 dark:text-red-300'
                    : 'bg-green-500/10 text-green-700 dark:text-green-300'
              }`}>
                {task.state.runningAtMs ? '运行中' : task.state.lastStatus === 'error' ? '异常' : '正常'}
              </span>
            </div>

            {task.state.lastError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                <div className="font-medium">{'异常报错'}</div>
                <div className="mt-1 whitespace-pre-wrap break-words">{task.state.lastError}</div>
              </div>
            )}

            <div className="mt-4">
              <TaskRunHistory
                taskId={task.id}
                runs={runs}
                totalCount={totalCount}
                loadStep={20}
                compactHint={
                  '当前 1.0 版本：一个定时任务只支持绑定一个 Agent 身份。若需多个角色分别执行，请分别创建多个定时任务。此处历史记录按定时任务为锚点展示，不按角色拆分。'
                }
              />
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default AllRunsHistory;
