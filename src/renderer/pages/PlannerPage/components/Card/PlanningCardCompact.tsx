import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlanningTask } from '../../types/planning.types';
import type { Project } from '@types';
import { CheckSquare, Clock } from 'lucide-react';

interface PlanningCardCompactProps {
  task: PlanningTask;
  project?: Project;
  onEdit: () => void;
  isSortable?: boolean;
  onToggleStatus?: (id: string) => void;
  onPostponeWeek?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const PlanningCardCompact: React.FC<PlanningCardCompactProps> = ({
  task,
  project,
  onEdit,
  isSortable,
  onToggleStatus,
  onPostponeWeek,
  onDelete: _onDelete,
}) => {
  const isDone = task.status === 'done';

  const priorityColor =
    task.priority === 'P1'
      ? '#ef4444'
      : task.priority === 'P2'
      ? '#f59e0b'
      : task.priority === 'P3'
      ? '#3b82f6'
      : '#6b7280';

  const checklistTotal = task.checklist?.length || 0;
  const checklistDone = task.checklist?.filter((c) => c.done).length || 0;

  const cardContent = (
    <div className="flex items-center gap-2 w-full min-w-0 select-none">
      {/* Checkbox */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleStatus?.(task.id);
        }}
        title={isDone ? 'Marcar como pendente' : 'Marcar como concluída'}
        className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
          isDone
            ? 'bg-indigo-600 border-indigo-500 text-white'
            : 'border-slate-600/70 bg-slate-900/40 hover:border-indigo-400'
        }`}
      >
        {isDone && (
          <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="2.5 6 4.5 8.5 9.5 3.5" />
          </svg>
        )}
      </button>

      {/* Priority Dot */}
      <span
        style={{ backgroundColor: priorityColor }}
        className="w-1.5 h-1.5 rounded-full shrink-0"
        title={`Prioridade: ${task.priority || 'P3'}`}
      />

      {/* Title (Clique simples abre modal, Ctrl+Clique não abre) */}
      <span
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.stopPropagation();
            return;
          }
          onEdit();
        }}
        title={task.title}
        className={`flex-1 truncate text-xs font-medium cursor-pointer transition-colors ${
          isDone ? 'line-through text-slate-500' : 'text-slate-200 hover:text-indigo-300'
        }`}
      >
        {task.title}
      </span>

      {/* Project Badge */}
      {project && (
        <span
          style={{
            borderColor: project.color ? `color-mix(in srgb, ${project.color} 35%, transparent)` : 'rgba(99,102,241,0.3)',
            color: project.color || '#a5b4fc',
            background: project.color ? `color-mix(in srgb, ${project.color} 15%, transparent)` : 'rgba(99,102,241,0.12)',
          }}
          className="text-[9px] font-bold px-1.5 py-0.2 rounded border truncate max-w-[70px] shrink-0"
          title={`Projeto: ${project.name}`}
        >
          {project.name}
        </span>
      )}

      {/* Checklist Progress */}
      {checklistTotal > 0 && (
        <span className="text-[9.5px] font-mono text-slate-400 flex items-center gap-0.5 shrink-0" title={`Checklist: ${checklistDone}/${checklistTotal}`}>
          <CheckSquare className="w-2.5 h-2.5 text-slate-500" />
          <span>{checklistDone}/{checklistTotal}</span>
        </span>
      )}

      {/* Story Points */}
      {task.storyPoints && task.storyPoints > 0 ? (
        <span className="text-[9.5px] font-mono font-bold px-1 py-0.2 rounded bg-white/5 text-slate-400 shrink-0" title="Story Points">
          {task.storyPoints}pt
        </span>
      ) : null}

      {/* Time Badge */}
      {task.time && (
        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/5 text-slate-400 shrink-0 flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5" />
          {task.time}
        </span>
      )}

      {/* Postpone Button (+7d) */}
      {onPostponeWeek && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPostponeWeek(task.id);
          }}
          title="Adiar para a próxima semana (+7 dias)"
          className="text-[10px] font-bold text-slate-500 hover:text-slate-200 hover:bg-white/10 px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
        >
          +7d
        </button>
      )}
    </div>
  );

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit();
  };

  if (isSortable) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: task.id,
      data: { type: 'Task', task },
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.3 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onContextMenu={handleContextMenu}
        className="group min-h-[30px] flex items-center px-2 py-1 bg-[#131b2e] hover:bg-[#18233c] border border-white/5 hover:border-indigo-500/40 rounded-md cursor-grab active:cursor-grabbing shadow-xs transition-all"
      >
        {cardContent}
      </div>
    );
  }

  return (
    <div
      onContextMenu={handleContextMenu}
      className="group min-h-[30px] flex items-center px-2 py-1 bg-[#131b2e] border border-white/5 rounded-md shadow-xs"
    >
      {cardContent}
    </div>
  );
};
