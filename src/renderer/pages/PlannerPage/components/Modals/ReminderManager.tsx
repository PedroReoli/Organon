import { useState } from 'react'
import { Bell, Play, Plus, Repeat2, Trash2 } from 'lucide-react'
import type { CardReminderItem, ReminderChannel, ReminderSoundType } from '@types'
import { soundSynthesizer } from '../../../../services/audio/SoundSynthesizer'

interface ReminderManagerProps {
  reminders: CardReminderItem[]
  onChange: (reminders: CardReminderItem[]) => void
}

const SOUNDS: Array<{ value: ReminderSoundType; label: string }> = [
  { value: 'gentle-chime', label: 'Sino suave' },
  { value: 'digital-beep', label: 'Bip digital' },
  { value: 'bell-focus', label: 'Foco prolongado' },
  { value: 'urgent-alarm', label: 'Alarme urgente' },
  { value: 'none', label: 'Sem som' },
]

const CHANNELS: Array<{ value: ReminderChannel; label: string }> = [
  { value: 'all', label: 'Som + toast + banner' },
  { value: 'toast-only', label: 'Somente toast do Windows' },
  { value: 'sound-only', label: 'Somente som' },
  { value: 'banner-only', label: 'Somente banner' },
]

const toDateTimeLocal = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const nextClockTime = (hours: number, minutes: number) => {
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1)
  return date
}

export const ReminderManager = ({ reminders, onChange }: ReminderManagerProps) => {
  const [label, setLabel] = useState('')
  const [sound, setSound] = useState<ReminderSoundType>('gentle-chime')
  const [channel, setChannel] = useState<ReminderChannel>('all')
  const [repeat, setRepeat] = useState(false)
  const [repeatMinutes, setRepeatMinutes] = useState(30)
  const [customAt, setCustomAt] = useState(toDateTimeLocal(new Date(Date.now() + 60 * 60_000)))

  const addReminder = (triggerAt: Date) => {
    const createdAt = new Date().toISOString()
    onChange([...reminders, {
      id: `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: label.trim() || undefined,
      triggerAt: triggerAt.toISOString(),
      sound,
      channel,
      repeatEveryMinutes: repeat ? Math.max(1, repeatMinutes) : undefined,
      hasFired: false,
      createdAt,
    }])
  }

  const updateReminder = (id: string, updates: Partial<CardReminderItem>) => {
    onChange(reminders.map((reminder) => reminder.id === id ? { ...reminder, ...updates } : reminder))
  }

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-white/10 bg-[#101827] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100"><Bell className="h-4 w-4 text-amber-300" />Novo lembrete</div>
        <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Rótulo opcional (ex.: preparar reunião)" className="mt-4 w-full rounded-lg border border-white/10 bg-[#111a2d] px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-400/70" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-[10px] font-medium text-slate-500">Som
            <div className="mt-1 flex gap-1.5"><select value={sound} onChange={(event) => setSound(event.target.value as ReminderSoundType)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#111a2d] px-2 py-2 text-xs text-slate-100 outline-none">{SOUNDS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button type="button" onClick={() => soundSynthesizer.play(sound)} aria-label="Ouvir prévia" className="flex w-9 items-center justify-center rounded-lg border border-white/10 text-indigo-300 hover:bg-indigo-500/10"><Play className="h-3.5 w-3.5" /></button></div>
          </label>
          <label className="text-[10px] font-medium text-slate-500">Canal<select value={channel} onChange={(event) => setChannel(event.target.value as ReminderChannel)} className="mt-1 w-full rounded-lg border border-white/10 bg-[#111a2d] px-2 py-2 text-xs text-slate-100 outline-none">{CHANNELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={repeat} onChange={(event) => setRepeat(event.target.checked)} className="accent-indigo-500" /><Repeat2 className="h-3.5 w-3.5 text-slate-500" />Repetir até concluir</label>
        {repeat && <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">A cada <input type="number" min="1" value={repeatMinutes} onChange={(event) => setRepeatMinutes(Number(event.target.value))} className="w-20 rounded-md border border-white/10 bg-[#111a2d] px-2 py-1 text-xs text-slate-100 outline-none" /> minutos</label>}
        <div className="mt-4 grid grid-cols-4 gap-2">
          <button type="button" onClick={() => addReminder(new Date(Date.now() + 15 * 60_000))} className="rounded-lg border border-white/10 px-2 py-2 text-xs text-slate-300 hover:bg-white/5">+15 min</button>
          <button type="button" onClick={() => addReminder(new Date(Date.now() + 60 * 60_000))} className="rounded-lg border border-white/10 px-2 py-2 text-xs text-slate-300 hover:bg-white/5">+1 hora</button>
          <button type="button" onClick={() => addReminder(nextClockTime(14, 0))} className="rounded-lg border border-white/10 px-2 py-2 text-xs text-slate-300 hover:bg-white/5">14:00</button>
          <button type="button" onClick={() => addReminder(nextClockTime(17, 30))} className="rounded-lg border border-white/10 px-2 py-2 text-xs text-slate-300 hover:bg-white/5">17:30</button>
        </div>
        <div className="mt-2 flex gap-2"><input type="datetime-local" value={customAt} onChange={(event) => setCustomAt(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#111a2d] px-3 py-2 text-xs text-slate-100 outline-none" /><button type="button" disabled={!customAt} onClick={() => addReminder(new Date(customAt))} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Adicionar</button></div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-semibold text-slate-200">Lembretes configurados</h3><span className="text-[10px] text-slate-500">{reminders.length}</span></div>
        <div className="space-y-2">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="rounded-xl border border-white/5 bg-[#111a2d] p-3">
              <div className="flex items-start gap-3"><Bell className={`mt-0.5 h-4 w-4 shrink-0 ${reminder.hasFired ? 'text-slate-600' : 'text-amber-300'}`} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-slate-200">{reminder.label || 'Lembrete da tarefa'}</p><p className="mt-1 text-[10px] text-slate-500">{new Date(reminder.snoozedUntil || reminder.triggerAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}{reminder.hasFired ? ' · disparado' : ''}</p></div><button type="button" aria-label="Excluir lembrete" onClick={() => onChange(reminders.filter((item) => item.id !== reminder.id))} className="text-slate-600 hover:text-red-400"><Trash2 className="h-4 w-4" /></button></div>
              <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2"><select value={reminder.sound} onChange={(event) => updateReminder(reminder.id, { sound: event.target.value as ReminderSoundType })} className="rounded-md border border-white/10 bg-[#0d1423] px-2 py-1.5 text-[10px] text-slate-300">{SOUNDS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><select value={reminder.channel} onChange={(event) => updateReminder(reminder.id, { channel: event.target.value as ReminderChannel })} className="rounded-md border border-white/10 bg-[#0d1423] px-2 py-1.5 text-[10px] text-slate-300">{CHANNELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button type="button" onClick={() => soundSynthesizer.play(reminder.sound)} className="rounded-md border border-white/10 px-2 text-indigo-300 hover:bg-indigo-500/10"><Play className="h-3 w-3" /></button></div>
            </div>
          ))}
          {reminders.length === 0 && <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-slate-600">Nenhum lembrete configurado.</div>}
        </div>
      </div>
    </section>
  )
}
