import type { ActivePlanningReminder } from '../../pages/PlannerPage/hooks/usePlanningReminders'
import { BellRing, Check, Clock3, Repeat2, X } from 'lucide-react'

interface TaskAlarmAlertModalProps {
  alarm: ActivePlanningReminder | null
  onDismiss: () => void
  onSnooze: (minutes: number) => void
  onComplete: () => void
}

export const TaskAlarmAlertModal = ({ alarm, onDismiss, onSnooze, onComplete }: TaskAlarmAlertModalProps) => {
  if (!alarm) return null
  const recurring = alarm.reminder.repeatEveryMinutes

  return (
    <aside
      role="status"
      aria-live="assertive"
      className="fixed left-1/2 top-5 z-[999999] w-[min(680px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-amber-400/25 bg-[#111827]/95 p-3 shadow-[0_20px_65px_rgba(0,0,0,.55)] backdrop-blur-xl animate-in slide-in-from-top-3 duration-200"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/12 text-amber-300">
          <BellRing className="h-5 w-5 animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{alarm.task.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
            {alarm.reminder.label || 'Lembrete programado'}
            {recurring ? <><span>·</span><Repeat2 className="h-3 w-3" /> a cada {recurring} min</> : null}
          </p>
        </div>
        <button type="button" onClick={() => onSnooze(10)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
          <Clock3 className="h-3.5 w-3.5" /> +10 min
        </button>
        <button type="button" onClick={onComplete} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
          <Check className="h-3.5 w-3.5" /> Concluir
        </button>
        <button type="button" onClick={onDismiss} aria-label="Dispensar lembrete" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}
