import React from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, FolderKanban, Clock, Sparkles } from 'lucide-react';

export interface WeeklyViewHeaderProps {
  weekOffset: number;
  showMonthWeeks: boolean;
  activeTaskId: string | null;
  rangeFormatted: string;
  onSetWeekOffset: (fn: (w: number) => number) => void;
  onToggleMonthWeeks: () => void;
}

export const WeeklyViewHeader: React.FC<WeeklyViewHeaderProps> = ({
  weekOffset,
  showMonthWeeks,
  activeTaskId,
  rangeFormatted,
  onSetWeekOffset,
  onToggleMonthWeeks,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#0d1424] shrink-0 gap-3">
      {/* Navigation Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onSetWeekOffset((w) => w - 1)}
          title="Semana Anterior (Alt + ←)"
          className="w-7 h-7 rounded border border-slate-700/60 bg-[#121b2f] text-slate-300 hover:text-white hover:border-slate-500 flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onSetWeekOffset(() => 0)}
          className={`px-3 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
            weekOffset === 0
              ? 'border-indigo-500/50 bg-indigo-950/40 text-indigo-300'
              : 'border-slate-700/60 bg-[#121b2f] text-slate-300 hover:border-slate-500 hover:text-white'
          }`}
        >
          Esta semana
        </button>

        <button
          type="button"
          onClick={() => onSetWeekOffset((w) => w + 1)}
          title="Próxima Semana (Alt + →)"
          className="w-7 h-7 rounded border border-slate-700/60 bg-[#121b2f] text-slate-300 hover:text-white hover:border-slate-500 flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <span className="w-px h-4 bg-white/10 mx-1" />

        {/* Toggle Month Weeks */}
        <button
          type="button"
          onClick={onToggleMonthWeeks}
          className={`px-2.5 py-1 rounded text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
            showMonthWeeks || activeTaskId !== null
              ? 'border-indigo-500/60 bg-indigo-950/50 text-indigo-300 shadow-xs'
              : 'border-slate-700/60 bg-[#121b2f] text-slate-300 hover:border-slate-500 hover:text-white'
          }`}
          title="Visualizar e Mover entre as Semanas do Mês"
        >
          <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
          <span>Semanas do Mês</span>
        </button>
      </div>

      {/* Legend Pills */}
      <div className="hidden lg:flex items-center gap-3 px-3 py-1 rounded-full border border-white/5 bg-[#0b101e] text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-300">Prioridade:</span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> P1
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> P2
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> P3
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" /> P4
          </span>
        </div>
        <span className="w-px h-3 bg-white/10" />
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex items-center gap-1">
            <FolderKanban className="w-3 h-3 text-indigo-400" /> Projeto
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" /> Horário
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> Points
          </span>
        </div>
      </div>

      {/* Date Range Display */}
      <div className="text-xs font-mono font-medium text-slate-400 tracking-wider shrink-0">
        {rangeFormatted}
      </div>
    </div>
  );
};
