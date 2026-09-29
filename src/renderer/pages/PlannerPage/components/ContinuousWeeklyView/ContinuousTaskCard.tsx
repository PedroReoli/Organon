import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Bell, BellPlus, Check, CheckSquare, Clock3, GripVertical } from 'lucide-react'
import type { CardReminderItem, Project } from '@types'
import type { PlanningTask } from '../../types/planning.types'
import { AutoFitTitle } from '../Card/AutoFitTitle'

interface ContinuousTaskCardProps {
  task: PlanningTask
  project?: Project
  onEdit: (id: string) => void
  onUpdateTask: (id: string, updates: Partial<PlanningTask>) => void
}

const PRIORITY_META = {
  P1: { label: 'P1 Crítico', color: '#ef4444', background: 'rgba(239,68,68,.12)' },
  P2: { label: 'P2 Alto', color: '#f97316', background: 'rgba(249,115,22,.12)' },
  P3: { label: 'P3 Médio', color: '#3b82f6', background: 'rgba(59,130,246,.12)' },
  P4: { label: 'P4 Baixo', color: '#94a3b8', background: 'rgba(148,163,184,.1)' },
} as const

const formatDuration = (minutes?: number | null) => {
  if (!minutes) return null
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}min` : `${hours}h`
}

const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const ContinuousTaskCard = ({ task, project, onEdit, onUpdateTask }: ContinuousTaskCardProps) => {
  const [showReminderMenu, setShowReminderMenu] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'continuous-task', task },
  })
  const priority = PRIORITY_META[task.priority || 'P3']
  const checklistTotal = task.checklist?.length || 0
  const checklistDone = task.checklist?.filter((item) => item.done || item.completed).length || 0
  const duration = formatDuration(task.durationMinutes)
  const now = Date.now()
  const nextReminder = (task.reminders || [])
    .filter((reminder) => !reminder.hasFired || Boolean(reminder.repeatEveryMinutes))
    .sort((a, b) => new Date(a.snoozedUntil || a.triggerAt).getTime() - new Date(b.snoozedUntil || b.triggerAt).getTime())[0]
  const reminderMs = nextReminder ? new Date(nextReminder.snoozedUntil || nextReminder.triggerAt).getTime() : 0
  const reminderIsImminent = reminderMs > now && reminderMs - now <= 15 * 60_000

  let deadlineLabel: string | null = null
  let deadlineOverdue = false
  if (task.date === localDate(new Date()) && task.time && task.status !== 'done') {
    const delta = Math.round((new Date(`${task.date}T${task.time}:00`).getTime() - now) / 60_000)
    deadlineOverdue = delta < 0
    deadlineLabel = delta < 0 ? `Atrasado ${Math.abs(delta)}m` : `Em ${delta}m`
  }

  const addQuickReminder = (minutes: number) => {
    const createdAt = new Date().toISOString()
    const reminder: CardReminderItem = {
      id: `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: `Lembrete rápido (+${minutes} min)`,
      triggerAt: new Date(Date.now() + minutes * 60_000).toISOString(),
      sound: 'gentle-chime',
      channel: 'all',
      hasFired: false,
      createdAt,
    }
    onUpdateTask(task.id, { reminders: [...(task.reminders || []), reminder] })
    setShowReminderMenu(false)
  }

  return (
    <article
      ref={setNodeRef}
      data-planning-task-id={task.id}
      tabIndex={0}
      aria-label={`Tarefa ${task.title}`}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1, borderTopColor: project?.color || priority.color }}
      onClick={() => onEdit(task.id)}
      className="group relative min-h-[120px] rounded-xl border border-white/5 border-t-2 bg-[#131B2E] p-3 shadow-[0_8px_24px_rgba(0,0,0,.16)] transition-colors duration-150 hover:border-indigo-400/35 hover:bg-[#172139] focus-within:border-indigo-400/50"
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label={task.status === 'done' ? 'Reabrir tarefa' : 'Concluir tarefa'}
          onClick={(event) => { event.stopPropagation(); onUpdateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done', completedAt: task.status === 'done' ? null : new Date().toISOString() }) }}
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${task.status === 'done' ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-slate-600 text-transparent opacity-50 group-hover:opacity-100 hover:border-emerald-400'}`}
        >
          <Check className="h-3 w-3" />
        </button>
        <AutoFitTitle title={task.title} minFontSize={9.5} maxFontSize={12} className={`flex-1 ${task.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-100'}`} />
        <div className="relative">
          <button type="button" aria-label="Adicionar lembrete rápido" onClick={(event) => { event.stopPropagation(); setShowReminderMenu((value) => !value) }} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 opacity-0 transition-opacity hover:bg-amber-400/10 hover:text-amber-300 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
            <BellPlus className="h-3.5 w-3.5" />
          </button>
          {showReminderMenu && (
            <div onClick={(event) => event.stopPropagation()} className="absolute right-0 top-8 z-20 w-32 rounded-lg border border-white/10 bg-[#0d1423] p-1.5 shadow-2xl">
              {[30, 60, 120].map((minutes) => <button key={minutes} type="button" onClick={() => addQuickReminder(minutes)} className="w-full rounded-md px-2 py-1.5 text-left text-[11px] text-slate-300 hover:bg-white/5 hover:text-white">+{minutes < 60 ? `${minutes} min` : `${minutes / 60}h`}</button>)}
            </div>
          )}
        </div>
        <button type="button" aria-label={`Arrastar ${task.title}`} onClick={(event) => event.stopPropagation()} className="-mr-1 flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-md text-slate-600 hover:bg-white/5 hover:text-slate-300 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className="rounded-full border px-2 py-1 font-semibold" style={{ color: priority.color, background: priority.background, borderColor: `${priority.color}45` }}>{priority.label}</span>
        {project && <span className="max-w-[130px] truncate rounded-full border px-2 py-1 font-medium" style={{ color: project.color || '#a5b4fc', borderColor: project.color ? `${project.color}55` : 'rgba(99,102,241,.35)', background: project.color ? `${project.color}18` : 'rgba(99,102,241,.12)' }} title={project.name}>{project.name}</span>}
        {(task.time || duration) && <span className="inline-flex items-center gap-1 rounded-full border border-white/5 bg-black/15 px-2 py-1 text-slate-400"><Clock3 className="h-3 w-3" />{task.time || duration}</span>}
        {checklistTotal > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-white/5 bg-black/15 px-2 py-1 text-slate-400"><CheckSquare className="h-3 w-3" />{checklistDone}/{checklistTotal}</span>}
        {nextReminder && <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${reminderIsImminent ? 'animate-pulse border-amber-400/35 bg-amber-400/10 text-amber-300' : 'border-white/5 bg-black/15 text-slate-400'}`}><Bell className="h-3 w-3" />{new Date(reminderMs).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
        {deadlineLabel && <span className={`rounded-full border px-2 py-1 font-semibold ${deadlineOverdue ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-amber-400/25 bg-amber-400/10 text-amber-300'}`}>{deadlineOverdue ? '🔴' : '⏰'} {deadlineLabel}</span>}
      </div>
    </article>
  )
}
