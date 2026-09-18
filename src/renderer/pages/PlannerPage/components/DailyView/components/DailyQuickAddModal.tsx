import React from 'react';
import { Plus, FolderKanban, Sparkles, Clock, Bell, Tag } from 'lucide-react';
import type { Project } from '@types';

export interface DailyQuickAddModalState {
  isOpen: boolean;
  time: string;
  title: string;
  projectId: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  hasTime: boolean;
  hasReminder: boolean;
  reminderOffset: number;
  storyPoints: number;
  tagsInput: string;
}

export interface DailyQuickAddModalProps {
  modal: DailyQuickAddModalState | null;
  projects?: Project[];
  formattedDateTitle: string;
  onChange: (modal: DailyQuickAddModalState | null) => void;
  onSubmit: () => void;
}

export const DailyQuickAddModal: React.FC<DailyQuickAddModalProps> = ({
  modal,
  projects = [],
  formattedDateTitle,
  onChange,
  onSubmit,
}) => {
  if (!modal || !modal.isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
      onClick={() => onChange(null)}
    >
      <div
        className="w-full max-w-md p-5 rounded-xl border border-white/10 bg-[#0e1628] shadow-2xl space-y-4 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Nova Tarefa para o Dia</h3>
              <span className="text-xs text-slate-400">{formattedDateTitle}</span>
            </div>
          </div>
        </div>

        {/* Task Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Título da Tarefa *
          </label>
          <input
            type="text"
            autoFocus
            placeholder="Ex: Alinhar escopo com a diretoria"
            value={modal.title}
            onChange={(e) => onChange({ ...modal, title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSubmit();
            }}
            className="w-full px-3 py-2 rounded-lg bg-[#090e1a] border border-white/10 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        {/* Project Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
            <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
            <span>Projeto Vinculado</span>
          </label>
          <select
            value={modal.projectId}
            onChange={(e) => onChange({ ...modal, projectId: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-[#090e1a] border border-white/10 text-slate-100 text-xs focus:outline-hidden focus:border-indigo-500"
          >
            <option value="">Sem Projeto (Geral)</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name}
              </option>
            ))}
          </select>
        </div>

        {/* Priority & Story Points */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Prioridade</label>
            <div className="grid grid-cols-4 gap-1">
              {(['P1', 'P2', 'P3', 'P4'] as const).map((p) => {
                const isSelected = modal.priority === p;
                const color =
                  p === 'P1'
                    ? 'border-red-500 text-red-400 bg-red-950/40'
                    : p === 'P2'
                    ? 'border-amber-500 text-amber-400 bg-amber-950/40'
                    : p === 'P3'
                    ? 'border-blue-500 text-blue-400 bg-blue-950/40'
                    : 'border-slate-500 text-slate-400 bg-slate-900/40';

                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onChange({ ...modal, priority: p })}
                    className={`py-1 rounded text-xs font-bold border transition-all cursor-pointer ${
                      isSelected ? color : 'border-white/5 bg-[#090e1a] text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Story Points</span>
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={modal.storyPoints || ''}
              onChange={(e) =>
                onChange({
                  ...modal,
                  storyPoints: parseInt(e.target.value, 10) || 0,
                })
              }
              placeholder="0"
              className="w-full px-3 py-2 rounded-lg bg-[#090e1a] border border-white/10 text-slate-100 text-xs focus:outline-hidden focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        {/* Time Toggle */}
        <div className="p-3 rounded-lg border border-white/5 bg-[#090e1a] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-200">Definir Horário Fixo</span>
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...modal, hasTime: !modal.hasTime })}
              className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${
                modal.hasTime ? 'bg-indigo-600 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </button>
          </div>

          {modal.hasTime && (
            <div className="pt-2 border-t border-white/5 flex items-center gap-2">
              <input
                type="time"
                value={modal.time}
                onChange={(e) => onChange({ ...modal, time: e.target.value })}
                className="px-2.5 py-1.5 rounded bg-[#101726] border border-white/10 text-slate-100 text-xs font-mono focus:outline-hidden focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-400">Horário de início da atividade</span>
            </div>
          )}
        </div>

        {/* Reminders Toggle */}
        <div className="p-3 rounded-lg border border-white/5 bg-[#090e1a] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold text-slate-200">Lembrete / Alerta</span>
            </div>
            <button
              type="button"
              onClick={() => onChange({ ...modal, hasReminder: !modal.hasReminder })}
              className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${
                modal.hasReminder ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </button>
          </div>

          {modal.hasReminder && (
            <div className="pt-2 border-t border-white/5 flex items-center gap-2">
              <select
                value={modal.reminderOffset}
                onChange={(e) =>
                  onChange({
                    ...modal,
                    reminderOffset: parseInt(e.target.value, 10),
                  })
                }
                className="px-2.5 py-1 rounded bg-[#101726] border border-white/10 text-slate-100 text-xs font-mono"
              >
                <option value="5">5 minutos antes</option>
                <option value="15">15 minutos antes</option>
                <option value="30">30 minutos antes</option>
                <option value="60">1 hora antes</option>
              </select>
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <span>Tags (separadas por vírgula)</span>
          </label>
          <input
            type="text"
            placeholder="reunião, cliente, sprint"
            value={modal.tagsInput}
            onChange={(e) => onChange({ ...modal, tagsInput: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-[#090e1a] border border-white/10 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={() => onChange(null)}
            className="px-3.5 py-1.5 rounded-lg border border-slate-700/60 bg-[#121b2f] hover:bg-[#18233c] text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!modal.title.trim()}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Criar Card
          </button>
        </div>
      </div>
    </div>
  );
};
