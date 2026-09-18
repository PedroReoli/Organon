import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { PlanningTask } from '../../../types/planning.types';

export interface MonthWeekDroppableProps {
  id: string;
  weekLabel: string;
  datesLabel: string;
  taskCount: number;
  isCurrentWeek: boolean;
  activeTask?: PlanningTask | null;
  onClick: () => void;
}

export const MonthWeekDroppable: React.FC<MonthWeekDroppableProps> = ({
  id,
  weekLabel,
  datesLabel,
  taskCount,
  isCurrentWeek,
  activeTask,
  onClick,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      style={{
        background: isOver
          ? 'color-mix(in srgb, var(--color-primary, #6366f1) 22%, #0f172a)'
          : isCurrentWeek
          ? '#15213b'
          : '#0d1424',
        borderColor: isOver
          ? 'var(--color-primary, #6366f1)'
          : isCurrentWeek
          ? 'rgba(99,102,241,0.5)'
          : 'rgba(255,255,255,0.06)',
      }}
      className={`flex-1 min-w-[140px] p-2 rounded-lg border transition-all cursor-pointer flex flex-col justify-between group select-none ${
        isOver ? 'ring-2 ring-indigo-500/60 shadow-lg shadow-indigo-950/50 scale-[1.02]' : ''
      } hover:border-indigo-500/40 hover:bg-[#121c32]`}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={`text-[11px] font-bold uppercase tracking-wider ${
            isCurrentWeek ? 'text-indigo-300' : 'text-slate-300'
          }`}
        >
          {weekLabel}
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/5 text-slate-400 border border-white/5">
          {taskCount} {taskCount === 1 ? 'tarefa' : 'tarefas'}
        </span>
      </div>

      <div className="text-[10px] font-mono text-slate-400 mt-1">{datesLabel}</div>

      {/* Ghost Drop Placeholder */}
      {isOver && activeTask && (
        <div className="mt-1.5 py-1 px-1.5 rounded border border-dashed border-indigo-400/80 bg-indigo-950/60 text-[10px] text-indigo-200 font-semibold flex items-center gap-1 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
          <span className="truncate">Mover para esta semana</span>
        </div>
      )}
    </div>
  );
};
