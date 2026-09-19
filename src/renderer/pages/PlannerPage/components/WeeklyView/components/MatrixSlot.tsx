import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { PlanningTask } from '../../../types/planning.types';
import { PlanningCardCompact } from '../../Card/PlanningCardCompact';
import { Plus } from 'lucide-react';
import type { Project } from '@types';

export interface MatrixSlotProps {
  id: string;
  isBacklog?: boolean;
  tasks: PlanningTask[];
  projects?: Project[];
  selectedTaskId: string | null;
  activeTask?: PlanningTask | null;
  onSelectTask: (taskId: string) => void;
  onSlotClick: (slotId: string) => void;
  onEdit: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onPostponeWeek: (id: string) => void;
  onOpenAdd: () => void;
  onQuickCreate?: (title: string) => void;
}

export const MatrixSlot: React.FC<MatrixSlotProps> = ({
  id,
  isBacklog,
  tasks,
  projects = [],
  selectedTaskId,
  activeTask,
  onSelectTask,
  onSlotClick,
  onEdit,
  onToggleStatus,
  onPostponeWeek,
  onOpenAdd,
  onQuickCreate,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
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
      onClick={() => {
        if (selectedTaskId) {
          onSlotClick(id);
        }
      }}
      style={{
        background: isOver
          ? 'color-mix(in srgb, var(--color-primary, #6366f1) 18%, #0f172a)'
          : isBacklog
          ? '#0c1220'
          : '#0e1526',
        borderColor: isOver
          ? 'var(--color-primary, #6366f1)'
          : selectedTaskId
          ? 'rgba(99,102,241,0.5)'
          : 'rgba(255,255,255,0.06)',
      }}
      className={`relative flex-1 h-full min-h-[90px] rounded-lg border p-1.5 flex flex-col justify-between transition-all group/slot ${
        isOver ? 'ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-950/40' : ''
      } ${
        selectedTaskId ? 'cursor-pointer hover:border-indigo-400 hover:bg-[#141e34]' : ''
      }`}
    >
      {/* Task List */}
      <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-full">
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => {
            const project = projects.find((p) => p.id === task.projectId);
            return (
              <div
                key={task.id}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    e.stopPropagation();
                    onSelectTask(task.id);
                  }
                }}
                className={`transition-all rounded-md ${
                  selectedTaskId === task.id ? 'ring-2 ring-indigo-500 bg-indigo-950/50' : ''
                }`}
              >
                <PlanningCardCompact
                  task={task}
                  project={project}
                  isSortable
                  onEdit={() => onEdit(task.id)}
                  onToggleStatus={onToggleStatus}
                  onPostponeWeek={onPostponeWeek}
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
            <span className="text-[9px] font-mono text-indigo-300/80 shrink-0 uppercase tracking-wider">Soltar aqui</span>
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
              placeholder="Nome da tarefa..."
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

        {/* Empty State Prompt */}
        {tasks.length === 0 && !isInlineAdding && (!isOver || !activeTask) && (
          <div
            onClick={(e) => {
              if (!selectedTaskId) {
                e.stopPropagation();
                setIsInlineAdding(true);
              }
            }}
            className="flex-1 flex flex-col items-center justify-center text-center p-2 cursor-pointer select-none text-slate-500 hover:text-slate-300 transition-colors group/empty"
          >
            <div className="w-5 h-5 rounded border border-slate-700/60 flex items-center justify-center mb-1 text-slate-500 group-hover/slot:border-slate-400 group-hover/slot:text-slate-300 transition-colors">
              <Plus className="w-3 h-3" />
            </div>
            <span className="text-[9.5px] font-bold tracking-wider uppercase text-slate-500/90 group-hover/slot:text-slate-400 leading-tight">
              {selectedTaskId ? 'CLIQUE PARA MOVER' : '+ CRIAR TAREFA OU ARRASTE'}
            </span>
          </div>
        )}
      </div>

      {/* Quick Add Button at bottom when cards exist */}
      {tasks.length > 0 && !isInlineAdding && (
        <div className="pt-1 mt-1 border-t border-white/5 opacity-0 group-hover/slot:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsInlineAdding(true);
            }}
            className="w-full py-0.5 text-[9.5px] font-semibold flex items-center justify-center gap-1 rounded bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <Plus className="w-2.5 h-2.5" />
            <span>Adicionar</span>
          </button>
        </div>
      )}
    </div>
  );
};
