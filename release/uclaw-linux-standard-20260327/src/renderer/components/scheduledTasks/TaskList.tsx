import { showGlobalToast } from '../../services/toast';
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectTask, setViewMode } from '../../store/slices/scheduledTaskSlice';
import { scheduledTaskService } from '../../services/scheduledTask';
import type { ScheduledTask, Schedule } from '../../types/scheduledTask';
import { EllipsisVerticalIcon, ClockIcon } from '@heroicons/react/24/outline';
import { AGENT_ROLE_SHORT_LABELS } from '../../../shared/agentRoleConfig';

const weekdayLabels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function formatScheduleLabel(schedule: Schedule): string {
  if (schedule.type === 'at') {
    const dt = schedule.datetime ?? '';
    if (dt.includes('T')) {
      const date = new Date(dt);
      return `${'不重复'} · ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return '不重复';
  }

  if (schedule.type === 'cron' && schedule.expression) {
    const parts = schedule.expression.trim().split(/\s+/);
    if (parts.length >= 5) {
      const [min, hour, dom, , dow] = parts;
      const timeStr = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;

      if (dow !== '*' && dom === '*') {
        const dayNum = parseInt(dow) || 0;
        return `${'每周'} · ${weekdayLabels[dayNum] || '周日'} ${timeStr}`;
      }
      if (dom !== '*' && dow === '*') {
        return `${'每月'} · ${dom}${'日'} ${timeStr}`;
      }
      return `${'每天'} · ${timeStr}`;
    }
  }

  if (schedule.type === 'interval') {
    return '每天';
  }

  return '';
}

interface TaskListItemProps {
  task: ScheduledTask;
  onRequestDelete: (taskId: string, taskName: string) => void;
}

const TaskListItem: React.FC<TaskListItemProps> = ({ task, onRequestDelete }) => {
  const dispatch = useDispatch();
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const warning = await scheduledTaskService.toggleTask(task.id, !task.enabled);
    if (warning) {
      const msg = warning === 'TASK_AT_PAST'
        ? '该任务的执行时间已过，启用后将不会运行'
        : warning === 'TASK_EXPIRED'
          ? '该任务已过期，启用后将不会运行'
          : warning;
      showGlobalToast(msg);
    }
  };

  const handleRunNow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    try {
      await scheduledTaskService.runManually(task.id);
      showGlobalToast('任务已开始运行');
    } catch (error) {
      showGlobalToast(error instanceof Error ? error.message : '运行任务失败');
    }
  };

  const handleStop = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    try {
      await scheduledTaskService.stopTask(task.id);
      showGlobalToast('任务已停止');
    } catch (error) {
      showGlobalToast(error instanceof Error ? error.message : '停止任务失败');
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    dispatch(selectTask(task.id));
    dispatch(setViewMode('edit'));
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    onRequestDelete(task.id, task.name);
  };

  return (
    <div
      className="grid grid-cols-[1fr_1fr_80px_40px] items-center gap-3 px-4 py-3 rounded-xl bg-white/60 dark:bg-white/[0.05] border border-white/40 dark:border-white/10 backdrop-blur-sm shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)] hover:bg-white/80 dark:hover:bg-white/[0.09] hover:shadow-[0_3px_10px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_3px_10px_rgba(0,0,0,0.35)] cursor-pointer transition-all duration-200"
      onClick={() => dispatch(selectTask(task.id))}
    >
      {/* Title */}
      <div className={`text-sm truncate ${task.enabled ? 'dark:text-claude-darkText text-claude-text' : 'dark:text-claude-darkTextSecondary text-claude-textSecondary'}`}>
        {task.name}
      </div>

      {/* Schedule */}
      <div className="text-sm dark:text-claude-darkTextSecondary text-claude-textSecondary truncate">
        {formatScheduleLabel(task.schedule)}
      </div>

      {/* Status: toggle + running indicator */}
      <div className="flex items-center gap-1.5">
        {/* Running indicator */}
        {task.state.runningAtMs && (
          <span className="inline-flex items-center text-xs text-blue-500">
            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-75" />
            </svg>
          </span>
        )}

        {/* Toggle switch */}
        <button
          type="button"
          onClick={handleToggle}
          className={`relative shrink-0 w-7 h-4 rounded-full transition-colors ${
            task.enabled
              ? 'bg-claude-accent'
              : 'dark:bg-claude-darkSurfaceHover bg-claude-border'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${
              task.enabled ? 'translate-x-3' : 'translate-x-0'
            }`}
          />
        </button>

        {/* {标记} P0-新增：显示身份标签 */}
        {task.agentRoleKey && (
          <span className="rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-0.5 text-xs whitespace-nowrap">
            {AGENT_ROLE_SHORT_LABELS[task.agentRoleKey] ?? task.agentRoleKey}
          </span>
        )}
      </div>

      {/* More menu */}
      <div className="flex justify-center">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="p-1.5 rounded-md dark:text-claude-darkTextSecondary text-claude-textSecondary hover:bg-claude-surfaceHover dark:hover:bg-claude-darkSurfaceHover transition-colors"
          >
            <EllipsisVerticalIcon className="w-5 h-5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-32 rounded-lg shadow-lg dark:bg-claude-darkSurface bg-white border dark:border-claude-darkBorder border-claude-border z-50 py-1">
              <button
                type="button"
                onClick={task.state.runningAtMs ? handleStop : handleRunNow}
                className="w-full text-left px-3 py-1.5 text-sm dark:text-claude-darkText text-claude-text hover:bg-claude-surfaceHover dark:hover:bg-claude-darkSurfaceHover disabled:opacity-50"
              >
                {task.state.runningAtMs ? '停止' : '立即运行'}
              </button>
              <button
                type="button"
                onClick={handleEdit}
                className="w-full text-left px-3 py-1.5 text-sm dark:text-claude-darkText text-claude-text hover:bg-claude-surfaceHover dark:hover:bg-claude-darkSurfaceHover"
              >
                {'编辑'}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-claude-surfaceHover dark:hover:bg-claude-darkSurfaceHover"
              >
                {'删除'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface TaskListProps {
  onRequestDelete: (taskId: string, taskName: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({ onRequestDelete }) => {
  const tasks = useSelector((state: RootState) => state.scheduledTask.tasks);
  const loading = useSelector((state: RootState) => state.scheduledTask.loading);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="dark:text-claude-darkTextSecondary text-claude-textSecondary">
          {'加载中...'}
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <ClockIcon className="h-12 w-12 dark:text-claude-darkTextSecondary/40 text-claude-textSecondary/40 mb-4" />
        <p className="text-sm font-medium dark:text-claude-darkTextSecondary text-claude-textSecondary mb-1">
          {'暂无定时任务'}
        </p>
        <p className="text-xs dark:text-claude-darkTextSecondary/70 text-claude-textSecondary/70 text-center">
          {'创建定时任务，让 AI 按计划自动执行'}
        </p>
      </div>
    );
  }

  return (
    <div className="py-3 space-y-2">
      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_1fr_80px_40px] items-center gap-3 px-4 py-1.5">
        <div className="text-xs font-medium dark:text-claude-darkTextSecondary/60 text-claude-textSecondary/60 uppercase tracking-wide">
          {'标题'}
        </div>
        <div className="text-xs font-medium dark:text-claude-darkTextSecondary/60 text-claude-textSecondary/60 uppercase tracking-wide">
          {'计划于'}
        </div>
        <div className="text-xs font-medium dark:text-claude-darkTextSecondary/60 text-claude-textSecondary/60 uppercase tracking-wide">
          {'状态'}
        </div>
        <div className="text-xs font-medium dark:text-claude-darkTextSecondary/60 text-claude-textSecondary/60 uppercase tracking-wide text-center">
          {'更多'}
        </div>
      </div>
      {tasks.map((task) => (
        <TaskListItem key={task.id} task={task} onRequestDelete={onRequestDelete} />
      ))}
    </div>
  );
};

export default TaskList;
