import React from 'react';
import { Plus, FolderKanban, Clock, Bell, Sparkles, Tag } from 'lucide-react';
import type { Project, Day, Period } from '@types';

export interface WeeklyQuickAddModalState {
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

export interface WeeklyQuickAddModalProps {
  modal: WeeklyQuickAddModalState | null;
  projects?: Project[];
  onChange: (modal: WeeklyQuickAddModalState | null) => void;
  onSubmit: () => void;
}

export const WeeklyQuickAddModal: React.FC<WeeklyQuickAddModalProps> = ({
  modal,
  projects = [],
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
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Criar Novo Card de Planejamento</h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Destino: {modal.dayLabel}{' '}
                {modal.shiftId
                  ? `· ${
                      modal.shiftId === 'morning'
                        ? 'Manhã'
                        : modal.shiftId === 'afternoon'
                        ? 'Tarde'
                        : 'Noite'
                    }`
                  : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {/* Title */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Título da Tarefa *
            </label>
            <input
              type="text"
              autoFocus
              placeholder="Ex: Entregar Módulo do Organon ou Alinhamento"
              value={modal.title}
              onChange={(e) => onChange({ ...modal, title: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSubmit();
              }}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-white/10 bg-[#131d33] text-white focus:border-indigo-500 outline-hidden"
            />
          </div>

          {/* Project & Priority */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                <FolderKanban className="w-3 h-3 text-indigo-400" />
                Projeto
              </label>
              <select
                value={modal.projectId}
                onChange={(e) => onChange({ ...modal, projectId: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-white/10 bg-[#131d33] text-white focus:border-indigo-500 outline-hidden"
              >
                <option value="">Nenhum Projeto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Prioridade
              </label>
              <select
                value={modal.priority}
                onChange={(e) => onChange({ ...modal, priority: e.target.value as any })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-white/10 bg-[#131d33] text-white focus:border-indigo-500 outline-hidden"
              >
                <option value="P1">P1 (Crítico)</option>
                <option value="P2">P2 (Alto)</option>
                <option value="P3">P3 (Médio)</option>
                <option value="P4">P4 (Baixo)</option>
              </select>
            </div>
          </div>

          {/* Horário Toggle */}
          <div className="p-2.5 rounded-lg border border-white/5 bg-[#121b2f] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Definir Horário Específico
              </label>
              <input
                type="checkbox"
                checked={modal.hasTime}
                onChange={(e) => onChange({ ...modal, hasTime: e.target.checked })}
                className="cursor-pointer accent-indigo-500"
              />
            </div>

            {modal.hasTime && (
              <div className="pt-1 flex items-center gap-2">
                <input
                  type="time"
                  value={modal.time}
                  onChange={(e) => onChange({ ...modal, time: e.target.value })}
                  className="px-2.5 py-1 text-xs rounded-md border border-white/10 bg-[#162138] text-white focus:border-indigo-500 outline-hidden"
                />
                <span className="text-[10px] text-slate-400">Exibido diretamente no turno do dia</span>
              </div>
            )}
          </div>

          {/* Lembrete Toggle */}
          <div className="p-2.5 rounded-lg border border-white/5 bg-[#121b2f] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <Bell className="w-3.5 h-3.5 text-amber-400" />
                Ativar Lembrete / Notificação
              </label>
              <input
                type="checkbox"
                checked={modal.hasReminder}
                onChange={(e) => onChange({ ...modal, hasReminder: e.target.checked })}
                className="cursor-pointer accent-amber-500"
              />
            </div>

            {modal.hasReminder && (
              <div className="pt-1 flex items-center gap-2">
                <select
                  value={modal.reminderOffset}
                  onChange={(e) => onChange({ ...modal, reminderOffset: parseInt(e.target.value, 10) })}
                  className="px-2.5 py-1 text-xs rounded-md border border-white/10 bg-[#162138] text-white focus:border-indigo-500 outline-hidden"
                >
                  <option value={0}>No horário exato</option>
                  <option value={10}>10 minutos antes</option>
                  <option value={15}>15 minutos antes</option>
                  <option value={30}>30 minutos antes</option>
                  <option value={60}>1 hora antes</option>
                </select>
                <span className="text-[10px] text-slate-400">Notificação nativa no app</span>
              </div>
            )}
          </div>

          {/* Story Points & Tags */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                Story Points
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 5, 8].map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...modal,
                        storyPoints: modal.storyPoints === pts ? 0 : pts,
                      })
                    }
                    className={`flex-1 py-1 text-[10px] font-mono font-bold rounded border cursor-pointer transition-colors ${
                      modal.storyPoints === pts
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-[#131d33] border-white/10 text-slate-400 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    {pts}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                <Tag className="w-3 h-3 text-indigo-400" />
                Tags
              </label>
              <input
                type="text"
                placeholder="dev, sprint, ui"
                value={modal.tagsInput}
                onChange={(e) => onChange({ ...modal, tagsInput: e.target.value })}
                className="w-full px-2.5 py-1 text-xs rounded-lg border border-white/10 bg-[#131d33] text-white focus:border-indigo-500 outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => onChange(null)}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg border border-white/10 bg-transparent cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!modal.title.trim()}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 cursor-pointer transition-colors"
          >
            Criar Card
          </button>
        </div>
      </div>
    </div>
  );
};
