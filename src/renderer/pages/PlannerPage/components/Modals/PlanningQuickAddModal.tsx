import React, { useEffect, useRef } from 'react';
import { Plus, FolderKanban, Clock, Bell, Sparkles, Tag, X } from 'lucide-react';
import type { Project, Day, Period } from '@types';

export interface PlanningQuickAddState {
  isOpen: boolean;
  dayKey?: Day;
  shiftId?: Period;
  dateStr?: string;
  dayLabel?: string;
  title: string;
  projectId: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  hasTime: boolean;
  time: string;
  hasReminder: boolean;
  reminderOffset: number;
  storyPoints: number;
  tagsInput: string;
}

export interface PlanningQuickAddModalProps {
  modal: PlanningQuickAddState | null;
  projects?: Project[];
  contextTitle?: string;
  contextSubtitle?: string;
  onChange: (modal: PlanningQuickAddState | null) => void;
  onSubmit: () => void;
}

export const PlanningQuickAddModal: React.FC<PlanningQuickAddModalProps> = ({
  modal,
  projects = [],
  contextTitle = 'Nova Tarefa no Planejamento',
  contextSubtitle,
  onChange,
  onSubmit,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modal?.isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [modal?.isOpen]);

  if (!modal || !modal.isOpen) return null;

  const subtitle = contextSubtitle || (modal.dayLabel
    ? `Destino: ${modal.dayLabel}${modal.shiftId ? ` · ${modal.shiftId === 'morning' ? 'Manhã' : modal.shiftId === 'afternoon' ? 'Tarde' : 'Noite'}` : ''}`
    : modal.dateStr || undefined);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => onChange(null)}
    >
      <div
        className="w-full max-w-md p-5 rounded-xl border border-white/10 bg-[#0e1628] shadow-2xl space-y-4 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">{contextTitle}</h3>
              {subtitle && (
                <p className="text-[11px] text-slate-400 font-medium">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task Title Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Título da Tarefa *
          </label>
          <input
            ref={inputRef}
            type="text"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            placeholder="O que você precisa fazer?"
            value={modal.title}
            onChange={(e) => onChange({ ...modal, title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && modal.title.trim()) {
                onSubmit();
              } else if (e.key === 'Escape') {
                onChange(null);
              }
            }}
          />
        </div>

        {/* Project Selector */}
        {projects.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
              Projeto Associado
            </label>
            <select
              className="w-full px-3 py-1.5 rounded-lg bg-[#0b1120] border border-white/10 text-xs text-white focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              value={modal.projectId}
              onChange={(e) => onChange({ ...modal, projectId: e.target.value })}
            >
              <option value="">Nenhum Projeto (Geral)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Priority & Points Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Prioridade
            </label>
            <div className="grid grid-cols-4 gap-1">
              {(['P1', 'P2', 'P3', 'P4'] as const).map((p) => {
                const isSelected = modal.priority === p;
                const colors = {
                  P1: isSelected ? 'bg-rose-500/20 border-rose-500 text-rose-400 font-bold' : 'border-white/5 text-slate-400 hover:border-rose-500/30',
                  P2: isSelected ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold' : 'border-white/5 text-slate-400 hover:border-amber-500/30',
                  P3: isSelected ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 font-bold' : 'border-white/5 text-slate-400 hover:border-indigo-500/30',
                  P4: isSelected ? 'bg-slate-500/20 border-slate-500 text-slate-300 font-bold' : 'border-white/5 text-slate-500 hover:border-slate-500/30',
                };
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onChange({ ...modal, priority: p })}
                    className={`py-1 rounded border text-[11px] font-mono transition-all cursor-pointer text-center ${colors[p]}`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Story Points */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Story Points
            </label>
            <input
              type="number"
              min={0}
              max={100}
              className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-mono"
              placeholder="0"
              value={modal.storyPoints || ''}
              onChange={(e) =>
                onChange({ ...modal, storyPoints: parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>
        </div>

        {/* Time & Reminders */}
        <div className="space-y-2 pt-1 border-t border-white/5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={modal.hasTime}
                onChange={(e) =>
                  onChange({
                    ...modal,
                    hasTime: e.target.checked,
                    time: e.target.checked ? modal.time || '09:00' : '',
                  })
                }
                className="rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> Definir Horário
              </span>
            </label>

            {modal.hasTime && (
              <input
                type="time"
                value={modal.time}
                onChange={(e) => onChange({ ...modal, time: e.target.value })}
                className="px-2 py-0.5 rounded bg-[#0b1120] border border-white/10 text-xs text-white focus:outline-hidden font-mono"
              />
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={modal.hasReminder}
                onChange={(e) =>
                  onChange({
                    ...modal,
                    hasReminder: e.target.checked,
                  })
                }
                className="rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1">
                <Bell className="w-3 h-3 text-slate-400" /> Notificação / Alarme
              </span>
            </label>

            {modal.hasReminder && (
              <select
                value={modal.reminderOffset}
                onChange={(e) =>
                  onChange({ ...modal, reminderOffset: parseInt(e.target.value, 10) })
                }
                className="px-2 py-0.5 rounded bg-[#0b1120] border border-white/10 text-[11px] text-white focus:outline-hidden cursor-pointer"
              >
                <option value={-10}>🔁 A cada 10 min (até concluir)</option>
                <option value={-15}>🔁 A cada 15 min (até concluir)</option>
                <option value={-30}>🔁 A cada 30 min (até concluir)</option>
                <option value={-60}>🔁 A cada 1 hora (até concluir)</option>
                <option value={0}>🔔 Na hora exata</option>
                <option value={5}>⏰ 5 min antes</option>
                <option value={10}>⏰ 10 min antes</option>
                <option value={15}>⏰ 15 min antes</option>
                <option value={30}>⏰ 30 min antes</option>
              </select>
            )}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            Tags (separadas por vírgula)
          </label>
          <input
            type="text"
            className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            placeholder="frontend, bug, urgente"
            value={modal.tagsInput}
            onChange={(e) => onChange({ ...modal, tagsInput: e.target.value })}
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => onChange(null)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!modal.title.trim()}
            onClick={onSubmit}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/20 cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Criar Tarefa
          </button>
        </div>
      </div>
    </div>
  );
};
