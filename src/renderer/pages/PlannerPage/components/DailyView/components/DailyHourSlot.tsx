import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { PlanningTask } from '../../../types/planning.types';
import { PlanningCardCompact } from '../../Card/PlanningCardCompact';
import { Plus } from 'lucide-react';
import type { Project } from '@types';

export interface DailySlotProps {
  id: string;
  hour?: number;
  tasks: PlanningTask[];
  projects?: Project[];
  activeTask?: PlanningTask | null;
  onEdit: (id: string) => void;
  onToggleStatus?: (id: string) => void;
  onOpenAdd: () => void;
  onQuickCreate?: (title: string) => void;
}

export const DailyHourSlot: React.FC<DailySlotProps> = ({
  id,
  hour,
  tasks,
  projects = [],
  activeTask,
  onEdit,
  onToggleStatus,
  onOpenAdd,
  onQuickCreate,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  const hourLabel = hour !== undefined ? `${hour.toString().padStart(2, '0')}:00` : '';
  const [isInlineAdding, setIsInlineAdding] = React.useState(false);
  const [inlineTitle, setInlineTitle] = React.useState('');
  const inlineInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isInlineAdding) {
      inlineInputRef.current?.focus();
    }
  }, [isInlineAdding]);

  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver
          ? 'color-mix(in srgb, var(--color-primary, #6366f1) 18%, #0f172a)'
          : '#0d1424',
        borderColor: isOver ? 'var(--color-primary, #6366f1)' : 'rgba(255,255,255,0.05)',
      }}
      className={`group/slot relative flex items-start min-h-[48px] border-b transition-all ${
        isOver ? 'ring-2 ring-indigo-500/50 bg-indigo-950/30' : ''
      }`}
    >
      {/* Time Label */}
      <div className="w-16 px-3 py-2 text-right text-xs font-mono font-bold text-slate-500 select-none shrink-0 border-r border-white/5 bg-[#0b1120]">
        {hourLabel}
      </div>

      {/* Task Content Container */}
      <div className="flex-1 p-1.5 flex flex-col gap-1 min-w-0">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => {
            const project = projects.find((p) => p.id === task.projectId);
            return (
              <div key={task.id} className="transition-all">
                <PlanningCardCompact
                  task={task}
                  project={project}
                  isSortable
                  onEdit={() => onEdit(task.id)}
                  onToggleStatus={onToggleStatus}
                />
              </div>
            );
          })}
        </SortableContext>

        {/* Ghost Drop Placeholder */}
        {isOver && activeTask && !tasks.some((t) => t.id === activeTask.id) && (
          <div className="w-full min-h-[32px] rounded-md border-2 border-dashed border-indigo-400/80 bg-indigo-950/40 p-1.5 flex items-center gap-2 text-xs text-indigo-300 animate-pulse select-none pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
            <span className="truncate font-medium flex-1 text-slate-200">{activeTask.title}</span>
            <span className="text-[9px] font-mono text-indigo-300/80 shrink-0 uppercase tracking-wider">
              Mover para {hourLabel}
            </span>
          </div>
        )}

        {/* Inline Quick Add Form */}
        {isInlineAdding && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inlineTitle.trim()) {
                if (onQuickCreate) {
                  onQuickCreate(inlineTitle.trim());
                } else {
                  onOpenAdd();
                }
                setInlineTitle('');
              }
              setIsInlineAdding(false);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full p-1.5 rounded-lg bg-[#0a0f1d] border border-indigo-500/80 shadow-lg shadow-indigo-950/50 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150"
          >
            <input
              ref={inlineInputRef}
              type="text"
              value={inlineTitle}
              onChange={(e) => setInlineTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  setIsInlineAdding(false);
                  setInlineTitle('');
                }
              }}
              placeholder={`Tarefa às ${hourLabel}...`}
              className="w-full bg-slate-900/80 border border-slate-700/60 rounded px-2 py-1 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-400 transition-colors"
            />
            <div className="flex items-center justify-between text-[9px] text-slate-400 px-0.5">
              <span className="font-mono text-indigo-300/80">↵ Enter salva</span>
              <button
                type="button"
                onClick={() => {
                  setIsInlineAdding(false);
                  onOpenAdd();
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline underline-offset-2"
              >
                Mais campos...
              </button>
            </div>
          </form>
        )}

        {/* Empty Slot Hover Add Button */}
        {tasks.length === 0 && !isInlineAdding && (!isOver || !activeTask) && (
          <div
            onClick={() => setIsInlineAdding(true)}
            className="h-8 flex items-center justify-between px-3 rounded-md text-xs text-slate-600 opacity-0 group-hover/slot:opacity-100 hover:bg-white/5 hover:text-slate-300 transition-all cursor-pointer select-none"
          >
            <span className="text-[11px] font-medium">+ Adicionar tarefa às {hourLabel}</span>
            <Plus className="w-3.5 h-3.5 text-slate-400" />
          </div>
        )}
      </div>

      {/* Add button on the right when tasks already exist */}
      {tasks.length > 0 && !isInlineAdding && (
        <div className="px-2 py-1 opacity-0 group-hover/slot:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => setIsInlineAdding(true)}
            title={`Adicionar tarefa às ${hourLabel}`}
            className="w-6 h-6 rounded border border-slate-700/60 bg-[#121b2f] hover:bg-[#18243e] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
