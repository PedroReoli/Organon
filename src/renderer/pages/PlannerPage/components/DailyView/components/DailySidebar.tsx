import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PlanningCardCompact } from '../../Card/PlanningCardCompact';
import { AlertTriangle, RotateCcw, Flame, Clock, Plus, CheckCircle2, ChevronRight, Check } from 'lucide-react';
import type { PlanningTask } from '../../../types/planning.types';
import type { Project } from '@types';

export interface DailySidebarProps {
  overdueTasks: PlanningTask[];
  topPriorities: PlanningTask[];
  unassignedDayTasks: PlanningTask[];
  completedTodayTasks: PlanningTask[];
  projects?: Project[];
  isCompletedCollapsed: boolean;
  onRescheduleOverdue: () => void;
  onEdit: (id: string) => void;
  onToggleStatus?: (id: string) => void;
  onToggleCompletedCollapsed: () => void;
  onOpenQuickAdd: () => void;
}

export const DailySidebar: React.FC<DailySidebarProps> = ({
  overdueTasks,
  topPriorities,
  unassignedDayTasks,
  completedTodayTasks,
  projects = [],
  isCompletedCollapsed,
  onRescheduleOverdue,
  onEdit,
  onToggleStatus,
  onToggleCompletedCollapsed,
  onOpenQuickAdd,
}) => {
  return (
    <div className="w-80 min-w-[280px] max-w-[340px] flex flex-col gap-3 overflow-y-auto shrink-0 pr-1">
      {/* Overdue Tasks Alert Banner */}
      {overdueTasks.length > 0 && (
        <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-200 flex flex-col gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-amber-300">
              {overdueTasks.length} {overdueTasks.length === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}
            </span>
          </div>
          <p className="text-[11px] text-amber-200/80 leading-relaxed">
            Tarefas anteriores a hoje ainda não foram concluídas.
          </p>
          <button
            type="button"
            onClick={onRescheduleOverdue}
            className="w-full py-1 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reagendar para Hoje</span>
          </button>
        </div>
      )}

      {/* Top 3 Prioridades do Dia */}
      <div className="p-3 rounded-xl border border-white/5 bg-[#0c1220] flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Top Prioridades (P1 / P2)
            </span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/5 text-slate-400">
            {topPriorities.length}/3
          </span>
        </div>

        {topPriorities.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-500">
            Nenhuma prioridade urgente para hoje.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {topPriorities.map((task) => {
              const project = projects.find((p) => p.id === task.projectId);
              return (
                <div key={task.id}>
                  <PlanningCardCompact
                    task={task}
                    project={project}
                    onEdit={() => onEdit(task.id)}
                    onToggleStatus={onToggleStatus}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inbox / Tarefas Sem Horário Fixo */}
      <div className="flex-1 min-h-[160px] p-3 rounded-xl border border-white/5 bg-[#0c1220] flex flex-col justify-between gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Tarefas Livres de Hoje
            </span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/5 text-slate-400">
            {unassignedDayTasks.length}
          </span>
        </div>

        <div className="flex-1 flex flex-col gap-1 overflow-y-auto min-h-[60px]">
          <SortableContext
            items={unassignedDayTasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {unassignedDayTasks.map((task) => {
              const project = projects.find((p) => p.id === task.projectId);
              return (
                <div key={task.id}>
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

          {unassignedDayTasks.length === 0 && (
            <div
              onClick={onOpenQuickAdd}
              className="flex-1 flex flex-col items-center justify-center p-3 text-center text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg border border-dashed border-slate-700/50 transition-colors cursor-pointer select-none"
            >
              <Plus className="w-4 h-4 mb-1 text-slate-500" />
              <span className="text-[11px] font-medium">+ Adicionar tarefa sem horário fixo</span>
            </div>
          )}
        </div>
      </div>

      {/* Concluídas Hoje Accordion */}
      {completedTodayTasks.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-[#0c1220] overflow-hidden">
          <button
            type="button"
            onClick={onToggleCompletedCollapsed}
            className="w-full p-2.5 flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-slate-200 bg-[#0e1628] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Concluídas Hoje ({completedTodayTasks.length})</span>
            </div>
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isCompletedCollapsed ? '' : 'rotate-90'
              }`}
            />
          </button>

          {!isCompletedCollapsed && (
            <div className="p-2 flex flex-col gap-1 bg-[#0a0f1d]/50 max-h-48 overflow-y-auto">
              {completedTodayTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-1.5 rounded bg-white/5 text-xs text-slate-400"
                >
                  <span className="line-through truncate flex-1">{task.title}</span>
                  <button
                    type="button"
                    onClick={() => onToggleStatus?.(task.id)}
                    title="Desmarcar tarefa"
                    className="w-4 h-4 rounded border border-emerald-500 bg-emerald-600 text-white flex items-center justify-center cursor-pointer shrink-0 ml-2"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
