import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, X } from 'lucide-react';
import type { PlanningTask } from '../../types/planning.types';

interface TurnOverviewModalProps {
  title: string;
  tasks: PlanningTask[];
  onClose: () => void;
  onEdit: (id: string) => void;
}

const priorityColors: Record<string, string> = {
  P1: '#ef4444', P2: '#f59e0b', P3: '#3b82f6', P4: '#94a3b8',
};

export const TurnOverviewModal = ({ title, tasks, onClose, onEdit }: TurnOverviewModalProps) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6" onMouseDown={onClose} onClick={(event) => event.stopPropagation()}>
      <section role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()} className="flex max-h-[min(780px,92vh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101827] shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="mt-1 text-xs text-slate-400">{tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'} neste período</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"><X className="h-4 w-4" /></button>
        </header>
        <div className="space-y-2 overflow-y-auto p-3 sm:p-5">
          {tasks.map((task) => (
            <article key={task.id} className="rounded-xl border border-white/10 bg-[#151f33] p-4">
              <div className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: priorityColors[task.priority || 'P3'] }} aria-label={`Prioridade ${task.priority || 'P3'}`} />
                <div className="min-w-0 flex-1">
                  <h3 className={`break-words text-sm font-semibold ${task.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{task.title}</h3>
                  {(task.description || task.descriptionHtml) && <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-5 text-slate-400">{task.description || task.descriptionHtml?.replace(/<[^>]*>/g, ' ')}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {(task.tags || []).map((tag) => <span key={tag} className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2 py-0.5 text-[10px] text-indigo-200">{tag}</span>)}
                    {task.time && <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-400">{task.time}</span>}
                  </div>
                </div>
                <button type="button" onClick={() => { onClose(); onEdit(task.id); }} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-indigo-400/30 px-2.5 py-1.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Ver tarefa <ArrowUpRight className="h-3 w-3" /></button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>,
    document.body,
  );
};
