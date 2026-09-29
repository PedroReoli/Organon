import React, { useEffect, useRef, useState } from 'react';
import {
  Plus,
  FolderKanban,
  Clock,
  Bell,
  Sparkles,
  Tag,
  X,
  FileText,
  Volume2,
  Repeat,
} from 'lucide-react';
import type { Project, Day, Period } from '@types';
import type { ReminderMode, ReminderSound } from '../../../../types/domain/planner.types';
import { playSound } from '../../../../utils/audioAlert';

export interface PlanningQuickAddState {
  isOpen: boolean;
  dayKey?: Day;
  shiftId?: Period;
  dateStr?: string;
  dayLabel?: string;
  title: string;
  description: string;
  projectId: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  hasTime: boolean;
  time: string;
  hasReminder: boolean;
  reminderMode: ReminderMode;
  reminderInterval: number;
  reminderOffset: number;
  reminderSound: ReminderSound;
  repeatUntilDone: boolean;
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

const SOUND_OPTIONS: { id: ReminderSound; label: string; icon: string }[] = [
  { id: 'bell', label: 'Sino Harmônico', icon: '🔔' },
  { id: 'alarm', label: 'Alarme Insistente', icon: '🚨' },
  { id: 'digital', label: 'Beep Digital', icon: '⏰' },
  { id: 'chime', label: 'Chime Suave', icon: '✨' },
  { id: 'gentle', label: 'Tom Sereno', icon: '🎵' },
  { id: 'none', label: 'Silencioso', icon: '🔕' },
];

export const PlanningQuickAddModal: React.FC<PlanningQuickAddModalProps> = ({
  modal,
  projects = [],
  contextTitle = 'Nova Tarefa no Planejamento',
  contextSubtitle,
  onChange,
  onSubmit,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showDescription, setShowDescription] = useState(false);

  useEffect(() => {
    if (modal?.isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      if (modal.description && modal.description.trim()) {
        setShowDescription(true);
      }
    }
  }, [modal?.isOpen]);

  if (!modal || !modal.isOpen) return null;

  const subtitle =
    contextSubtitle ||
    (modal.dayLabel
      ? `Destino: ${modal.dayLabel}${
          modal.shiftId
            ? ` · ${
                modal.shiftId === 'morning'
                  ? 'Manhã'
                  : modal.shiftId === 'afternoon'
                  ? 'Tarde'
                  : 'Noite'
              }`
            : ''
        }`
      : modal.dateStr || undefined);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => onChange(null)}
    >
      <div
        className="w-full max-w-lg p-5 rounded-2xl border border-white/10 bg-[#0e1628] shadow-2xl space-y-4 text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{contextTitle}</h3>
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
            placeholder="Ex: Reunião com equipe, Revisar deploy..."
            value={modal.title}
            onChange={(e) => onChange({ ...modal, title: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && modal.title.trim() && !showDescription) {
                onSubmit();
              } else if (e.key === 'Escape') {
                onChange(null);
              }
            }}
          />
        </div>

        {/* Description / Notes Toggle & Field */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              Anotações / Descrição Breve
            </label>
            {!showDescription && (
              <button
                type="button"
                onClick={() => setShowDescription(true)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              >
                + Adicionar detalhes
              </button>
            )}
          </div>
          {showDescription && (
            <textarea
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none font-sans"
              placeholder="Pauta, links, checklist ou observações da tarefa..."
              value={modal.description || ''}
              onChange={(e) => onChange({ ...modal, description: e.target.value })}
            />
          )}
        </div>

        {/* Project Selector & Priority */}
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
                  P1: isSelected
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400 font-bold'
                    : 'border-white/5 text-slate-400 hover:border-rose-500/30',
                  P2: isSelected
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold'
                    : 'border-white/5 text-slate-400 hover:border-amber-500/30',
                  P3: isSelected
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 font-bold'
                    : 'border-white/5 text-slate-400 hover:border-indigo-500/30',
                  P4: isSelected
                    ? 'bg-slate-500/20 border-slate-500 text-slate-300 font-bold'
                    : 'border-white/5 text-slate-500 hover:border-slate-500/30',
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

        {/* Time Configuration */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={modal.hasTime}
                onChange={(e) =>
                  onChange({
                    ...modal,
                    hasTime: e.target.checked,
                    time: e.target.checked ? modal.time || '10:00' : '',
                  })
                }
                className="rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" /> Definir Horário Específico
              </span>
            </label>

            {modal.hasTime && (
              <input
                type="time"
                value={modal.time}
                onChange={(e) => onChange({ ...modal, time: e.target.value })}
                className="px-2.5 py-1 rounded-md bg-[#0b1120] border border-white/15 text-xs text-white focus:outline-hidden font-mono"
              />
            )}
          </div>
        </div>

        {/* Advanced Multi-Reminder Configuration */}
        <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={modal.hasReminder}
                onChange={(e) =>
                  onChange({
                    ...modal,
                    hasReminder: e.target.checked,
                    reminderMode: modal.reminderMode || (modal.hasTime ? 'before' : 'interval'),
                  })
                }
                className="rounded border-indigo-400/40 bg-indigo-900/30 text-indigo-500 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-indigo-400" /> Lembrete & Alarme no Windows
              </span>
            </label>

            {modal.hasReminder && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Ativo
              </span>
            )}
          </div>

          {modal.hasReminder && (
            <div className="space-y-2.5 pt-2 border-t border-indigo-500/20 animate-in fade-in duration-150">
              {/* Reminder Mode Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Tipo de Alarme:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChange({ ...modal, reminderMode: 'interval' })}
                    className={`py-1.5 px-2 rounded-lg border text-left text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      modal.reminderMode === 'interval'
                        ? 'bg-indigo-600/30 border-indigo-400 text-white font-bold'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Repeat className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span>Intervalo Recorrente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChange({ ...modal, reminderMode: 'before' })}
                    className={`py-1.5 px-2 rounded-lg border text-left text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      modal.reminderMode === 'before'
                        ? 'bg-indigo-600/30 border-indigo-400 text-white font-bold'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Antes do Horário</span>
                  </button>
                </div>
              </div>

              {/* Interval details */}
              {modal.reminderMode === 'interval' && (
                <div className="flex items-center justify-between gap-2 bg-black/20 p-2 rounded-lg border border-white/5">
                  <span className="text-[11px] text-slate-300">Lembrar a cada:</span>
                  <select
                    value={modal.reminderInterval || 10}
                    onChange={(e) =>
                      onChange({ ...modal, reminderInterval: parseInt(e.target.value, 10) })
                    }
                    className="px-2 py-1 rounded bg-[#0b1120] border border-white/15 text-xs text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value={5}>🔁 A cada 5 minutos</option>
                    <option value={10}>🔁 A cada 10 minutos</option>
                    <option value={15}>🔁 A cada 15 minutos</option>
                    <option value={20}>🔁 A cada 20 minutos</option>
                    <option value={30}>🔁 A cada 30 minutos</option>
                    <option value={45}>🔁 A cada 45 minutos</option>
                    <option value={60}>🔁 A cada 1 hora</option>
                    <option value={120}>🔁 A cada 2 horas</option>
                  </select>
                </div>
              )}

              {/* Before details */}
              {modal.reminderMode === 'before' && (
                <div className="flex items-center justify-between gap-2 bg-black/20 p-2 rounded-lg border border-white/5">
                  <span className="text-[11px] text-slate-300">Avisar com antecedência:</span>
                  <select
                    value={modal.reminderOffset || 10}
                    onChange={(e) =>
                      onChange({ ...modal, reminderOffset: parseInt(e.target.value, 10) })
                    }
                    className="px-2 py-1 rounded bg-[#0b1120] border border-white/15 text-xs text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value={0}>🔔 Na hora exata do evento</option>
                    <option value={5}>⏰ 5 minutos antes</option>
                    <option value={10}>⏰ 10 minutos antes</option>
                    <option value={15}>⏰ 15 minutos antes</option>
                    <option value={30}>⏰ 30 minutos antes</option>
                    <option value={60}>⏰ 1 hora antes</option>
                  </select>
                </div>
              )}

              {/* Sound selector */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-slate-400" /> Efeito Sonoro:
                </span>
                <div className="flex items-center gap-1.5">
                  <select
                    value={modal.reminderSound || 'bell'}
                    onChange={(e) => {
                      const sound = e.target.value as ReminderSound;
                      onChange({ ...modal, reminderSound: sound });
                      playSound(sound);
                    }}
                    className="px-2 py-1 rounded bg-[#0b1120] border border-white/15 text-xs text-white focus:outline-hidden cursor-pointer"
                  >
                    {SOUND_OPTIONS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.icon} {s.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => playSound(modal.reminderSound || 'bell')}
                    title="Testar Som"
                    className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] text-slate-300 transition-colors"
                  >
                    Ouvir
                  </button>
                </div>
              </div>
            </div>
          )}
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
            placeholder="frontend, reunião, urgente"
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
