import { useEffect, useMemo, useState } from 'react';
import { Bell, Check, Copy, FileText, Plus, Trash2, X } from 'lucide-react';
import type { Project } from '@types';
import type { PlanningTask } from '../../types/planning.types';
import { ReminderManager } from './ReminderManager';

interface TaskEditModalProps {
  task: PlanningTask | null;
  projects?: Project[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<PlanningTask>) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (task: PlanningTask) => void;
}

const STATUS_OPTIONS: Array<{ value: PlanningTask['status']; label: string }> = [
  { value: 'todo', label: 'A fazer' },
  { value: 'in_progress', label: 'Em progresso' },
  { value: 'blocked', label: 'Bloqueado' },
  { value: 'done', label: 'Concluído' },
  { value: 'postponed', label: 'Adiado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const htmlToText = (html: string) => {
  if (!html) return '';
  const element = document.createElement('div');
  element.innerHTML = html;
  return element.innerText;
};

const MarkdownPreview = ({ value }: { value: string }) => {
  const lines = value.split('\n');
  return (
    <div className="min-h-[150px] space-y-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
      {lines.map((line, index) => {
        if (/^#{1,3}\s/.test(line)) {
          return <h4 key={index} className="pt-1 text-base font-semibold text-slate-100">{line.replace(/^#{1,3}\s/, '')}</h4>;
        }
        if (/^[-*]\s/.test(line)) {
          return <div key={index} className="flex gap-2 pl-1"><span className="text-indigo-400">•</span><span>{line.replace(/^[-*]\s/, '')}</span></div>;
        }
        const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          const [before, after = ''] = line.split(urlMatch[0]);
          return <p key={index}>{before}<a className="text-indigo-300 underline underline-offset-2" href={urlMatch[0]} target="_blank" rel="noreferrer">{urlMatch[0]}</a>{after}</p>;
        }
        return line ? <p key={index}>{line}</p> : <div key={index} className="h-2" />;
      })}
    </div>
  );
};

const inputClass = 'w-full rounded-lg border border-white/10 bg-[#111a2d] px-3 py-2 text-sm text-slate-100 outline-none transition-colors focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-500/15';

export const TaskEditModal = ({ task, projects = [], isOpen, onClose, onSave, onDelete, onDuplicate }: TaskEditModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [status, setStatus] = useState<PlanningTask['status']>('todo');
  const [priority, setPriority] = useState<PlanningTask['priority']>('P3');
  const [projectId, setProjectId] = useState('');
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [storyPoints, setStoryPoints] = useState(0);
  const [checklist, setChecklist] = useState<PlanningTask['checklist']>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [reminders, setReminders] = useState<PlanningTask['reminders']>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'reminders'>('details');

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description || htmlToText(task.descriptionHtml || ''));
    setStatus(task.status || 'todo');
    setPriority(task.priority || 'P3');
    setProjectId(task.projectId || '');
    setTime(task.time || '');
    setDate(task.date || '');
    setDurationMinutes(task.durationMinutes || 30);
    setStoryPoints(task.storyPoints || 0);
    setChecklist(task.checklist || []);
    setShowPreview(false);
    setNewChecklistItem('');
    setReminders(task.reminders || []);
    setActiveTab('details');
  }, [task]);

  const checklistDone = useMemo(() => checklist.filter((item) => item.done || item.completed).length, [checklist]);
  const checklistProgress = checklist.length ? (checklistDone / checklist.length) * 100 : 0;

  const save = (updates: Partial<PlanningTask> = {}) => {
    if (!task) return;
    onSave(task.id, {
      title: title.trim() || task.title,
      description,
      descriptionHtml: description ? `<p>${description.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</p>` : '',
      status,
      priority,
      projectId: projectId || null,
      time: time || null,
      date: date || null,
      hasDate: Boolean(date),
      durationMinutes: durationMinutes || null,
      storyPoints: storyPoints || null,
      checklist,
      reminders,
      ...updates,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') save();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!isOpen || !task) return null;

  const moveToTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    save({ date: nextDate, hasDate: true });
  };

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end bg-black/65 backdrop-blur-[2px]" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes da tarefa"
        onMouseDown={(event) => event.stopPropagation()}
        className="flex h-full w-[min(620px,96vw)] flex-col border-l border-white/10 bg-[#0B0F17] shadow-[-24px_0_70px_rgba(0,0,0,.45)] animate-in slide-in-from-right duration-200"
      >
        <header className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold text-indigo-300">Detalhes da tarefa</p>
            <p className="mt-0.5 text-[10px] text-slate-500">Ctrl + Enter salva as alterações</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"><X className="h-4 w-4" /></button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <textarea autoFocus rows={2} value={title} onChange={(event) => setTitle(event.target.value)} className="w-full resize-none border-0 bg-transparent p-0 text-xl font-semibold leading-7 text-white outline-none placeholder:text-slate-600" placeholder="Título da tarefa" />

          <nav className="flex gap-1 rounded-xl border border-white/5 bg-[#0d1423] p-1" aria-label="Seções da tarefa">
            <button type="button" onClick={() => setActiveTab('details')} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${activeTab === 'details' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-200'}`}><FileText className="h-3.5 w-3.5" />Detalhes</button>
            <button type="button" onClick={() => setActiveTab('reminders')} className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${activeTab === 'reminders' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-200'}`}><Bell className="h-3.5 w-3.5" />Lembretes & Alarmes{reminders.length > 0 && <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px]">{reminders.length}</span>}</button>
          </nav>

          {activeTab === 'details' ? <>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="text-[10px] font-medium text-slate-500">Status<select value={status} onChange={(event) => setStatus(event.target.value as PlanningTask['status'])} className={`${inputClass} mt-1 text-xs`}>{STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="text-[10px] font-medium text-slate-500">Prioridade<select value={priority || 'P3'} onChange={(event) => setPriority(event.target.value as PlanningTask['priority'])} className={`${inputClass} mt-1 text-xs`}><option value="P1">P1 Crítico</option><option value="P2">P2 Alto</option><option value="P3">P3 Médio</option><option value="P4">P4 Baixo</option></select></label>
            <label className="text-[10px] font-medium text-slate-500">Data<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={`${inputClass} mt-1 text-xs`} /></label>
            <label className="text-[10px] font-medium text-slate-500">Horário<input type="time" value={time} onChange={(event) => setTime(event.target.value)} className={`${inputClass} mt-1 text-xs`} /></label>
          </div>

          <div className="grid grid-cols-[1fr_120px_120px] gap-3">
            <label className="text-[10px] font-medium text-slate-500">Projeto<select value={projectId} onChange={(event) => setProjectId(event.target.value)} className={`${inputClass} mt-1 text-xs`}><option value="">Sem projeto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
            <label className="text-[10px] font-medium text-slate-500">Estimativa (min)<input type="number" min="0" step="15" value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} className={`${inputClass} mt-1 text-xs`} /></label>
            <label className="text-[10px] font-medium text-slate-500">Story points<input type="number" min="0" max="100" value={storyPoints} onChange={(event) => setStoryPoints(Number(event.target.value))} className={`${inputClass} mt-1 text-xs`} /></label>
          </div>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-200">Descrição</h3>
              <button type="button" onClick={() => setShowPreview((value) => !value)} className="rounded-md px-2 py-1 text-[10px] font-medium text-indigo-300 hover:bg-indigo-500/10">{showPreview ? 'Editar' : 'Visualizar Markdown'}</button>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#101827] p-4">
              {showPreview ? <MarkdownPreview value={description} /> : <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={8} placeholder="Adicione contexto, listas, links e notas..." className="min-h-[170px] w-full resize-y bg-transparent text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-600" />}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between text-xs"><h3 className="font-semibold text-slate-200">Checklist</h3><span className="text-slate-500">{checklistDone}/{checklist.length}</span></div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-indigo-500 transition-[width] duration-150" style={{ width: `${checklistProgress}%` }} /></div>
            <div className="space-y-2">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-[#111a2d] px-3 py-2">
                  <button type="button" onClick={() => setChecklist((items) => items.map((current) => current.id === item.id ? { ...current, done: !current.done, completed: !current.done } : current))} className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${item.done || item.completed ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-600'}`}>{(item.done || item.completed) && <Check className="h-3 w-3" />}</button>
                  <span className={`flex-1 text-xs ${item.done || item.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{item.text}</span>
                  <button type="button" aria-label="Remover item" onClick={() => setChecklist((items) => items.filter((current) => current.id !== item.id))} className="text-slate-600 hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
              <form onSubmit={(event) => { event.preventDefault(); if (!newChecklistItem.trim()) return; setChecklist((items) => [...items, { id: `check-${Date.now()}`, text: newChecklistItem.trim(), done: false }]); setNewChecklistItem(''); }} className="flex gap-2">
                <input value={newChecklistItem} onChange={(event) => setNewChecklistItem(event.target.value)} placeholder="Adicionar subtarefa" className={`${inputClass} text-xs`} />
                <button type="submit" aria-label="Adicionar subtarefa" className="flex w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:bg-indigo-600 hover:text-white"><Plus className="h-4 w-4" /></button>
              </form>
            </div>
          </section>
          </> : <ReminderManager reminders={reminders} onChange={setReminders} />}
        </div>

        <footer className="border-t border-white/5 bg-[#0d1320] px-6 py-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => save({ status: 'done', completedAt: new Date().toISOString() })} className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/15">Concluir tarefa</button>
            {onDuplicate && <button type="button" onClick={() => onDuplicate({ ...task, title, description, checklist, reminders })} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"><Copy className="h-3.5 w-3.5" />Duplicar</button>}
            <button type="button" onClick={moveToTomorrow} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5">Mover para amanhã</button>
            {onDelete && <button type="button" onClick={() => { if (window.confirm(`Excluir a tarefa "${task.title}"?`)) onDelete(task.id); }} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" />Excluir</button>}
          </div>
          <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-white">Cancelar</button><button type="button" onClick={() => save()} className="rounded-lg bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">Salvar alterações</button></div>
        </footer>
      </aside>
    </div>
  );
};
