import React from 'react';
import { CalendarClock, Columns3, Grid3X3 } from 'lucide-react';
import { PlannerViewMode } from '../index';

interface PlannerNavbarProps {
  viewMode: PlannerViewMode;
  setViewMode: (viewMode: PlannerViewMode) => void;
}

const MODES: Array<{
  id: PlannerViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  featured?: boolean;
}> = [
  { id: 'matrix', label: 'Matriz de Turnos', icon: Grid3X3 },
  { id: 'continuous', label: 'Semana Contínua', icon: Columns3, featured: true },
  { id: 'daily', label: 'Foco Diário', icon: CalendarClock },
];

export const PlannerNavbar: React.FC<PlannerNavbarProps> = ({ viewMode, setViewMode }) => (
  <div className="flex items-center justify-between gap-4 px-5 py-2.5 border-b border-white/5 bg-[#0a0f1d] shrink-0">
    <div className="flex min-w-0 items-center gap-4">
      <div className="shrink-0">
        <h1 className="text-sm font-semibold text-slate-100">Planejamento</h1>
        <p className="text-[10px] text-slate-500">Organize a semana no seu ritmo</p>
      </div>

      <div
        role="tablist"
        aria-label="Visualização do planejamento"
        className="flex items-center gap-1 overflow-x-auto rounded-xl border border-white/5 bg-[#0e1628] p-1"
      >
        {MODES.map(({ id, label, icon: Icon, featured }) => {
          const isActive = viewMode === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setViewMode(id)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                  : featured
                    ? 'text-indigo-300 hover:bg-indigo-500/10 hover:text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>

    <div className="hidden shrink-0 items-center gap-2 text-xs text-slate-500 sm:flex">
      <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
      <span>Planner ativo</span>
    </div>
  </div>
);
