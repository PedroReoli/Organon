import type { PlanningTask } from '../../types/planning.types';

interface TaskTagSummaryProps {
  task: PlanningTask;
  className?: string;
}

export const TaskTagSummary = ({ task, className = '' }: TaskTagSummaryProps) => {
  const tags = (task.tags || []).filter(Boolean);

  return (
    <span className={`flex min-w-0 flex-1 items-center gap-1 overflow-hidden ${className}`} title={task.title}>
      {tags.length ? (
        <span className="min-w-0 flex-1 truncate rounded border border-indigo-400/20 bg-indigo-400/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-200">
          {tags[0]}
        </span>
      ) : (
        <span className="truncate text-[10px] text-slate-300">{task.title}</span>
      )}
      {tags.length > 1 && <span className="shrink-0 text-[10px] text-slate-500">+{tags.length - 1}</span>}
    </span>
  );
};
