import React from 'react';
import { PlannerViewMode } from '../index';
import { LayoutGrid, CalendarClock } from 'lucide-react';

interface PlannerNavbarProps {
  viewMode: PlannerViewMode;
  setViewMode: (v: PlannerViewMode) => void;
}

export const PlannerNavbar: React.FC<PlannerNavbarProps> = ({ viewMode, setViewMode }) => {
  return (
    <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/5 bg-[#0a0f1d] shrink-0">
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0e1628] border border-white/5">
        <button
          type="button"
          onClick={() => setViewMode('weekly')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            viewMode === 'weekly'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Visão Semanal</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('daily')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            viewMode === 'daily'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <CalendarClock className="w-3.5 h-3.5" />
          <span>Visão Diária</span>
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
        <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
        <span>Planner Ativo</span>
      </div>
    </div>
  );
};

