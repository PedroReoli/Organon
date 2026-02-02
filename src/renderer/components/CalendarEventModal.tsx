import { useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarEvent, CalendarRecurrenceFrequency, Period } from '../types'
import { PERIOD_LABELS } from '../types'
import { getPeriodFromTime, normalizeTime } from '../utils'

const defaultTimeForPeriod = (period: Period): string => {
  if (period === 'morning') return '09:00'
  if (period === 'afternoon') return '14:00'
  return '20:00'
}

interface CalendarEventModalProps {
  event: CalendarEvent
  defaultPeriod: Period
  onClose: () => void
  onSave: (updates: Partial<Pick<CalendarEvent, 'title' | 'description' | 'date' | 'time' | 'color' | 'recurrence' | 'reminder'>>) => void
  onDelete: () => void
}

export const CalendarEventModal = ({ event, defaultPeriod, onClose, onSave, onDelete }: CalendarEventModalProps) => {
  const [title, setTitle] = useState(event.title)
  const [date, setDate] = useState(event.date)
  const [time, setTime] = useState(event.time ?? '')
  const [color, setColor] = useState(event.color)
  const [description, setDescription] = useState(event.description ?? '')
  const [reminderEnabled, setReminderEnabled] = useState(event.reminder?.enabled ?? false)
  const [reminderOffset, setReminderOffset] = useState<number>(event.reminder?.offsetMinutes ?? 0)
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<CalendarRecurrenceFrequency>(() => {
    const freq = event.recurrence?.frequency ?? 'none'
    return freq ?? 'none'
  })
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(() => Math.max(1, event.recurrence?.interval ?? 1))
  const [recurrenceUntil, setRecurrenceUntil] = useState<string>(() => event.recurrence?.until ?? '')
  const [period, setPeriod] = useState<Period>(() => {
    if (event.time) return getPeriodFromTime(event.time)
    return defaultPeriod
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const titleInputRef = useRef<HTMLInputElement>(null)
  const timeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleInputRef.current?.focus()
    titleInputRef.current?.select()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const normalizedTime = useMemo(() => normalizeTime(time), [time])
  const timePeriod = useMemo(() => (normalizedTime ? getPeriodFromTime(normalizedTime) : null), [normalizedTime])
  const hasTime = !!normalizedTime

  const basePeriod = useMemo<Period>(() => {
    if (event.time) return getPeriodFromTime(event.time)
    return defaultPeriod
  }, [event.time, defaultPeriod])

  const movedBetweenPeriods = useMemo(() => period !== basePeriod, [period, basePeriod])

  const requiresTimeForPeriod = useMemo(() => {
    if (!hasTime) return false
    return timePeriod !== period
  }, [hasTime, timePeriod, period])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleSave()
    }
  }

  const handleSave = () => {
    setValidationError(null)

    const nextTitle = title.trim()
    if (!nextTitle) {
      onClose()
      return
    }

    if (movedBetweenPeriods && !normalizedTime) {
      setValidationError('Ao trocar de periodo, defina uma nova hora para salvar.')
      timeInputRef.current?.focus()
      return
    }

    if (reminderEnabled && !normalizedTime) {
      setValidationError('Para ativar lembrete, defina uma hora para o evento.')
      timeInputRef.current?.focus()
      return
    }

    if (normalizedTime) {
      const computed = getPeriodFromTime(normalizedTime)
      if (computed !== period) {
        setValidationError('A hora definida nao corresponde ao periodo selecionado. Ajuste a hora para salvar.')
        timeInputRef.current?.focus()
        return
      }
    }

    const nextRecurrence = recurrenceFrequency === 'none'
      ? null
      : {
        frequency: recurrenceFrequency,
        interval: Math.max(1, Number.isFinite(recurrenceInterval) ? recurrenceInterval : 1),
        until: recurrenceUntil.trim() ? recurrenceUntil.trim() : null,
      }

    const nextReminder = reminderEnabled
      ? { enabled: true, offsetMinutes: reminderOffset }
      : null

    onSave({
      title: nextTitle,
      date,
      time: normalizedTime,
      color,
      description,
      recurrence: nextRecurrence,
      reminder: nextReminder,
    })
  }

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete()
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  const handlePeriodChange = (next: Period) => {
    if (next === period) return
    setPeriod(next)

    const nextTime = defaultTimeForPeriod(next)
    setTime(nextTime)

    // "Pede para definir a nova hora": ao trocar de periodo, preenche uma sugestao e foca no campo.
    setTimeout(() => {
      timeInputRef.current?.focus()
      timeInputRef.current?.select()
    }, 0)
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Editar Evento</h2>
          <button className="modal-close-btn" onClick={handleSave} title="Fechar (Esc)">
            &times;
          </button>
        </header>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Titulo</label>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              placeholder="Nome do evento"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Quando</label>
            <div className="form-date-time">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input form-input-date"
              />
              <input
                ref={timeInputRef}
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="form-input form-input-time"
                title="Hora (opcional)"
              />
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                title="Cor"
                style={{ width: 44, height: 44, padding: 0 }}
              />
            </div>
            <div className="period-toggle" role="group" aria-label="Periodo">
              {(['morning', 'afternoon', 'night'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  className={`period-toggle-btn ${period === p ? 'is-active' : ''}`}
                  onClick={() => handlePeriodChange(p)}
                  title={`Mover para ${PERIOD_LABELS[p]}`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
            <p className="form-hint">
              {normalizedTime
                ? `Periodo pela hora: ${PERIOD_LABELS[getPeriodFromTime(normalizedTime)]}.`
                : 'Sem hora = Dia todo (aparece em Manha no planejamento).'}
            </p>
            {validationError && (
              <div className="form-error">{validationError}</div>
            )}
            {!validationError && requiresTimeForPeriod && (
              <div className="form-error">
                Defina uma nova hora para este periodo.
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Recorrencia</label>
            <div className="form-date-time">
              <select
                className="form-input"
                value={recurrenceFrequency}
                onChange={(e) => setRecurrenceFrequency(e.target.value as CalendarRecurrenceFrequency)}
              >
                <option value="none">Nao repetir</option>
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </select>

              <input
                type="number"
                min={1}
                className="form-input"
                value={recurrenceInterval}
                onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value)))}
                disabled={recurrenceFrequency === 'none'}
                title="Intervalo"
                style={{ width: 120 }}
              />

              <input
                type="date"
                className="form-input form-input-date"
                value={recurrenceUntil}
                onChange={(e) => setRecurrenceUntil(e.target.value)}
                disabled={recurrenceFrequency === 'none'}
                title="Ate (opcional)"
              />
            </div>
            <p className="form-hint">
              {recurrenceFrequency === 'none'
                ? 'Evento unico.'
                : `Repete ${recurrenceFrequency === 'daily' ? 'a cada' : 'a cada'} ${recurrenceInterval} ${recurrenceFrequency === 'daily' ? 'dia(s)' : recurrenceFrequency === 'weekly' ? 'semana(s)' : 'mes(es)'}${recurrenceUntil.trim() ? ` ate ${recurrenceUntil}` : ''}.`}
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Lembrete</label>
            <div className="form-date-time">
              <label className="form-checkbox" style={{ gap: 10 }}>
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                />
                <span className="form-checkbox-label">Lembrar este evento</span>
              </label>

              <select
                className="form-input"
                value={reminderOffset}
                onChange={(e) => setReminderOffset(Number(e.target.value))}
                disabled={!reminderEnabled}
              >
                <option value={0}>Na hora</option>
                <option value={60}>1 hora antes</option>
                <option value={120}>2 horas antes</option>
                <option value={1440}>1 dia antes</option>
              </select>
            </div>
            <p className="form-hint">Lembrete so funciona com hora definida.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Descricao</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input"
              rows={4}
              placeholder="Opcional"
            />
          </div>
        </div>

        <footer className="modal-footer">
          <button
            onClick={handleDelete}
            className={`btn btn-danger ${confirmDelete ? 'btn-confirm' : ''}`}
          >
            {confirmDelete ? 'Clique para confirmar' : 'Excluir'}
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="btn btn-primary"
            >
              Salvar
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
