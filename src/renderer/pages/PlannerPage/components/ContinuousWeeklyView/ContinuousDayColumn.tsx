import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import type { Project } from '@types';
import type { PlanningTask } from '../../types/planning.types';
import { ContinuousTaskCard } from './ContinuousTaskCard';
import { ShiftOverviewPopover } from '../Card/ShiftOverviewPopover';
import { useState } from 'react';

interface ContinuousDayColumnProps {
  id: string;
  label: string;
  dayNumber: number;
  isToday: boolean;
  tasks: PlanningTask[];
  projects: Project[];
  onEdit: (id: string) => void;
  onAdd: () => void;
  onUpdateTask: (id: string, updates: Partial<PlanningTask>) => void;
}

const formatTotal = (tasks: PlanningTask[]) => {
  const total = tasks.reduce((sum, task) => sum + (task.durationMinutes || 0), 0);
  if (!total) return 'Sem estimativa';
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return [hours ? `${hours}h` : '', minutes ? `${minutes}min` : ''].filter(Boolean).join(' ');
};

export const ContinuousDayColumn = ({
  id,
  label,
  dayNumber,
  isToday,
  tasks,
  projects,
  onEdit,
  onAdd,
  onUpdateTask,
}: ContinuousDayColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [showOverview, setShowOverview] = useState(false);
  const completed = tasks.filter((task) => task.status === 'done').length;
  const progress = tasks.length ? (completed / tasks.length) * 100 : 0;

  return (
    <ShiftOverviewPopover
      title={`${label} ${dayNumber}`}
      tasks={tasks}
      projects={projects}
      slotId={id}
      open={showOverview}
      onOpenChange={setShowOverview}
      onEdit={onEdit}
      onToggleStatus={(taskId) => {
        const t = tasks.find((item) => item.id === taskId);
        if (t) {
          onUpdateTask(taskId, {
            status: t.status === 'done' ? 'todo' : 'done',
            completedAt: t.status === 'done' ? null : new Date().toISOString(),
          });
        }
      }}
      onOpenAdd={onAdd}
    >
      <section
        ref={setNodeRef}
        className={`relative flex h-full min-h-[420px] w-[248px] shrink-0 flex-col overflow-hidden rounded-2xl border transition-colors duration-150 2xl:w-auto 2xl:min-w-0 2xl:flex-1 ${
          isOver ? 'border-indigo-400/70 bg-indigo-950/25' : isToday ? 'border-indigo-400/20 bg-[#162036]' : 'border-white/5 bg-[#0e1526]'
        }`}
      >
        {isToday && <div className="h-1 shrink-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />}
        <header className={`border-b px-3 py-3 ${isToday ? 'border-indigo-500/25 bg-indigo-500/[.07]' : 'border-white/5'}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`truncate text-[11px] font-bold tracking-[.08em] ${isToday ? 'text-indigo-300' : 'text-slate-300'}`}>
                {label}
              </span>
              <span className={`flex h-6 min-w-6 items-center justify-center rounded-lg px-1.5 text-xs font-bold ${
                isToday ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-300'
              }`}>
                {dayNumber}
              </span>
              {isToday && <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[8px] font-bold tracking-wider text-violet-200">HOJE</span>}
            </div>
            <button
              type="button"
              onClick={onAdd}
              aria-label={`Criar tarefa em ${label}`}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-white/[.03] text-slate-500 hover:border-indigo-400/40 hover:text-indigo-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
            <span>{completed}/{tasks.length} concluídas</span>
            <span>{formatTotal(tasks)}</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-150" style={{ width: `${progress}%` }} /></div>
          {tasks.length > 0 && <button type="button" onClick={() => setShowOverview(true)} className="mt-2 w-full rounded-lg border border-indigo-400/25 bg-indigo-400/10 px-2 py-1.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Ver {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}</button>}
        </header>

        <div className="flex-1 overflow-y-auto p-2.5">
          <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
            <div className="flex min-h-full flex-col gap-2.5">
              {tasks.map((task) => (
                <ContinuousTaskCard
                  key={task.id}
                  task={task}
                  project={projects.find((project) => project.id === task.projectId)}
                  onEdit={onEdit}
                  onUpdateTask={onUpdateTask}
                />
              ))}
              {tasks.length === 0 && (
                <button
                  type="button"
                  onClick={onAdd}
                  className="flex min-h-28 flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 text-[11px] text-slate-600 hover:border-indigo-400/35 hover:bg-indigo-500/[.04] hover:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  <Plus className="h-4 w-4" />
                  Criar tarefa
                </button>
              )}
            </div>
          </SortableContext>
        </div>
      </section>
    </ShiftOverviewPopover>
  );
};
