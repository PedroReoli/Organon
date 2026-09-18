import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, CheckSquare, Sparkles, Plus } from 'lucide-react';

export interface DailyViewHeaderProps {
  dayOffset: number;
  formattedDateTitle: string;
  isToday: boolean;
  completedCount: number;
  totalTasksCount: number;
  completionPercentage: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  onSetDayOffset: (fn: (d: number) => number) => void;
  onOpenQuickAdd: () => void;
}

export const DailyViewHeader: React.FC<DailyViewHeaderProps> = ({
  dayOffset,
  formattedDateTitle,
  isToday,
  completedCount,
  totalTasksCount,
  completionPercentage,
  totalStoryPoints,
  completedStoryPoints,
  onSetDayOffset,
  onOpenQuickAdd,
}) => {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/5 bg-[#0d1424] shrink-0 gap-4">
      {/* Date Navigator Controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSetDayOffset((d) => d - 1)}
            title="Dia Anterior"
            className="w-7 h-7 rounded-lg border border-slate-700/60 bg-[#121b2f] text-slate-300 hover:text-white hover:border-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onSetDayOffset(() => 0)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              dayOffset === 0
                ? 'border-indigo-500/60 bg-indigo-950/40 text-indigo-300 shadow-xs'
                : 'border-slate-700/60 bg-[#121b2f] text-slate-300 hover:border-slate-500 hover:text-white'
            }`}
          >
            Hoje
          </button>

          <button
            type="button"
            onClick={() => onSetDayOffset((d) => d + 1)}
            title="Próximo Dia"
            className="w-7 h-7 rounded-lg border border-slate-700/60 bg-[#121b2f] text-slate-300 hover:text-white hover:border-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 pl-2">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>{formattedDateTitle}</span>
          </h2>
          {isToday && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-[10px] font-bold uppercase tracking-wider">
              Hoje
            </span>
          )}
        </div>
      </div>

      {/* Day Stats Pill & Quick Add Button */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-3 px-3 py-1 rounded-xl bg-[#090e1a] border border-white/5 text-xs">
          <div className="flex items-center gap-1.5 font-mono text-slate-300">
            <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {completedCount}/{totalTasksCount} concluídas
            </span>
          </div>

          <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>

          <span className="font-mono text-indigo-400 font-bold">{completionPercentage}%</span>

          {totalStoryPoints > 0 && (
            <>
              <span className="w-px h-3 bg-white/10" />
              <div className="flex items-center gap-1 font-mono text-amber-400">
                <Sparkles className="w-3 h-3" />
                <span>
                  {completedStoryPoints}/{totalStoryPoints} pts
                </span>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenQuickAdd}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-950/50 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Tarefa</span>
        </button>
      </div>
    </div>
  );
};
