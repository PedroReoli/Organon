import { useEffect, useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { BellPlus, Check, GripVertical } from 'lucide-react';
import type { CardReminderItem, Project } from '@types';
import type { PlanningTask } from '../../types/planning.types';
import { TaskTagSummary } from '../Card/TaskTagSummary';

interface ContinuousTaskCardProps {
  task: PlanningTask;
  project?: Project;
  onEdit: (id: string) => void;
  onUpdateTask: (id: string, updates: Partial<PlanningTask>) => void;
}

const priorityColors: Record<string, string> = {
  P1: '#ef4444', P2: '#f59e0b', P3: '#3b82f6', P4: '#94a3b8',
};

export const ContinuousTaskCard = ({ task, onEdit, onUpdateTask }: ContinuousTaskCardProps) => {
  const [showReminderMenu, setShowReminderMenu] = useState(false);
  const suppressOpenRef = useRef(false);
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: task.id,
    data: { type: 'continuous-task', task },
  });

  useEffect(() => {
    if (isDragging) {
      suppressOpenRef.current = true;
      return;
    }
    if (!suppressOpenRef.current) return;
    const timer = setTimeout(() => { suppressOpenRef.current = false; }, 0);
    return () => clearTimeout(timer);
  }, [isDragging]);

  const addQuickReminder = (minutes: number) => {
    const createdAt = new Date().toISOString();
    const reminder: CardReminderItem = {
      id: `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: `Lembrete rápido (+${minutes} min)`,
      triggerAt: new Date(Date.now() + minutes * 60_000).toISOString(),
      sound: 'gentle-chime',
      channel: 'all',
      hasFired: false,
      createdAt,
    };
    onUpdateTask(task.id, { reminders: [...(task.reminders || []), reminder] });
    setShowReminderMenu(false);
  };

  return (
    <article
      ref={setNodeRef}
      data-planning-task-id={task.id}
      aria-label={`Tarefa ${task.title}`}
      {...attributes}
      {...listeners}
      className="group relative flex min-h-11 cursor-grab touch-none select-none items-center gap-2 rounded-lg border border-white/5 bg-[#151f33] px-2 py-1.5 hover:border-indigo-400/35 active:cursor-grabbing"
    >
      <button
        type="button"
        aria-label={task.status === 'done' ? 'Reabrir tarefa' : 'Concluir tarefa'}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => onUpdateTask(task.id, {
          status: task.status === 'done' ? 'todo' : 'done',
          completedAt: task.status === 'done' ? null : new Date().toISOString(),
        })}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${task.status === 'done' ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-slate-600 text-transparent hover:border-emerald-400'}`}
      >
        <Check className="h-3 w-3" />
      </button>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: priorityColors[task.priority || 'P3'] }} title={`Prioridade ${task.priority || 'P3'}`} />
      <button
        type="button"
        onClick={() => { if (!suppressOpenRef.current) onEdit(task.id); }}
        className="flex min-w-0 flex-1 items-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <TaskTagSummary task={task} className={task.status === 'done' ? 'opacity-50' : ''} />
      </button>
      <div className="relative">
        <button
          type="button"
          aria-label="Adicionar lembrete rápido"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setShowReminderMenu((value) => !value)}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-amber-400/10 hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <BellPlus className="h-3.5 w-3.5" />
        </button>
        {showReminderMenu && (
          <div className="absolute right-0 top-7 z-20 w-32 rounded-lg border border-white/10 bg-[#0d1423] p-1.5 shadow-2xl">
            {[30, 60, 120].map((minutes) => (
              <button
                key={minutes}
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => addQuickReminder(minutes)}
                className="w-full rounded-md px-2 py-1.5 text-left text-[11px] text-slate-300 hover:bg-white/5 hover:text-white"
              >
                +{minutes < 60 ? `${minutes} min` : `${minutes / 60}h`}
              </button>
            ))}
          </div>
        )}
      </div>
      <span aria-hidden="true" className="flex h-7 w-6 shrink-0 items-center justify-center rounded text-slate-500 group-hover:text-slate-300">
        <GripVertical className="h-4 w-4" />
      </span>
    </article>
  );
};
