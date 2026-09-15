import { useEffect, useMemo, useRef, useState } from 'react'
import type { AgendaCategory, CalendarEvent, CalendarRecurrenceFrequency, Period } from '@types'
import { PERIOD_LABELS } from '@types'
import { getPeriodFromTime, normalizeTime } from '@utils'
import { Button, Input, Textarea } from '@shared/components/primitives'

const CAT_COLORS = ['var(--color-primary)', 'var(--color-primary)', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', 'var(--color-primary)', 'var(--color-primary)']

/* ── Campo de categoria com criacao inline ──────────────────── */

const CategoryField: React.FC<{
  categories: AgendaCategory[]
  categoryId: string | null
  selectedCat: AgendaCategory | null
  onSelect: (id: string | null) => void
  onAddCategory?: (name: string, color: string) => string | null
}> = ({ categories, categoryId, selectedCat, onSelect, onAddCategory }) => {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(CAT_COLORS[0])

  const handleAdd = () => {
    const name = newName.trim()
    if (!name || !onAddCategory) return
    const id = onAddCategory(name, newColor)
    if (id) onSelect(id)
    setNewName('')
    setAdding(false)
  }

  return (
    <div className="form-group">
      <label className="form-label">Categoria</label>
      <div className="form-date-time">
        <select
          className="form-input"
          value={categoryId ?? ''}
          onChange={e => onSelect(e.target.value || null)}
        >
          <option value="">Sem categoria</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        {selectedCat && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: selectedCat.color,
              padding: '4px 8px',
              borderRadius: 6,
              background: `color-mix(in srgb, ${selectedCat.color} 12%, transparent)`,
              border: `1px solid color-mix(in srgb, ${selectedCat.color} 30%, transparent)`,
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {selectedCat.name}
          </span>
        )}
        {onAddCategory && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-muted)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            + Nova
          </button>
        )}
      </div>
      {adding && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Nome da categoria..."
            value={newName}
            autoFocus
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
              if (e.key === 'Escape') setAdding(false)
            }}
            style={{ flex: 1, fontSize: 12 }}
          />
          <div style={{ display: 'flex', gap: 3 }}>
            {CAT_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  background: c,
                  border: newColor === c ? '2px solid var(--color-text)' : '2px solid transparent',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
          <Button size="sm" variant="primary" onClick={handleAdd}>Criar</Button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 14 }}
          >
            x
          </button>
        </div>
      )}
    </div>
  )
}

const defaultTimeForPeriod = (period: Period): string => {
  if (period === 'morning') return '09:00'
  if (period === 'afternoon') return '14:00'
  return '20:00'
}

interface CalendarEventModalProps {
  event: CalendarEvent
  defaultPeriod: Period
  categories?: AgendaCategory[]
  onClose: () => void
  onSave: (updates: Partial<Pick<CalendarEvent, 'title' | 'description' | 'date' | 'time' | 'color' | 'recurrence' | 'reminder' | 'categoryId'>>) => void
  onDelete: () => void
  onAddCategory?: (name: string, color: string) => string | null
}

export const CalendarEventModal = ({
  event, defaultPeriod, categories = [], onClose, onSave, onDelete, onAddCategory,
}: CalendarEventModalProps) => {
  const [title,              setTitle]              = useState(event.title)
  const [date,               setDate]               = useState(event.date)
  const [time,               setTime]               = useState(event.time ?? '')
  const [color,              setColor]              = useState(event.color)
  const [description,        setDescription]        = useState(event.description ?? '')
  const [reminderEnabled,    setReminderEnabled]    = useState(event.reminder?.enabled ?? false)
  const [reminderOffset,     setReminderOffset]     = useState<number>(event.reminder?.offsetMinutes ?? 0)
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<CalendarRecurrenceFrequency>(() =>
    event.recurrence?.frequency ?? 'none'
  )
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(() =>
    Math.max(1, event.recurrence?.interval ?? 1)
  )
  const [recurrenceUntil,    setRecurrenceUntil]    = useState<string>(() => event.recurrence?.until ?? '')
  const [period,             setPeriod]             = useState<Period>(() => {
    if (event.time) return getPeriodFromTime(event.time)
    return defaultPeriod
  })
  const [categoryId,         setCategoryId]         = useState<string | null>(event.categoryId ?? null)
  const [confirmDelete,      setConfirmDelete]      = useState(false)
  const [validationError,    setValidationError]    = useState<string | null>(null)

  const titleInputRef = useRef<HTMLInputElement>(null)
  const timeInputRef  = useRef<HTMLInputElement>(null)

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

  const normalizedTime   = useMemo(() => normalizeTime(time), [time])
  const timePeriod       = useMemo(() => (normalizedTime ? getPeriodFromTime(normalizedTime) : null), [normalizedTime])
  const hasTime          = !!normalizedTime
  const basePeriod       = useMemo<Period>(() => {
    if (event.time) return getPeriodFromTime(event.time)
    return defaultPeriod
  }, [event.time, defaultPeriod])
  const movedBetweenPeriods  = useMemo(() => period !== basePeriod, [period, basePeriod])
  const requiresTimeForPeriod = useMemo(() => {
    if (!hasTime) return false
    return timePeriod !== period
  }, [hasTime, timePeriod, period])

  const selectedCat = useMemo(
    () => categories.find(c => c.id === categoryId) ?? null,
    [categories, categoryId],
  )

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleSave()
  }

  const handleSave = () => {
    setValidationError(null)
    const nextTitle = title.trim()
    if (!nextTitle) { onClose(); return }

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
        setValidationError('A hora definida nao corresponde ao periodo. Ajuste a hora.')
        timeInputRef.current?.focus()
        return
      }
    }

    const nextRecurrence = recurrenceFrequency === 'none'
      ? null
      : {
        frequency: recurrenceFrequency,
        interval:  Math.max(1, Number.isFinite(recurrenceInterval) ? recurrenceInterval : 1),
        until:     recurrenceUntil.trim() ? recurrenceUntil.trim() : null,
      }
    const nextReminder = reminderEnabled ? { enabled: true, offsetMinutes: reminderOffset } : null

    onSave({
      title: nextTitle,
      date,
      time: normalizedTime,
      color,
      description,
      recurrence: nextRecurrence,
      reminder:   nextReminder,
      categoryId,
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
    setTime(defaultTimeForPeriod(next))
    setTimeout(() => { timeInputRef.current?.focus(); timeInputRef.current?.select() }, 0)
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{event.id ? 'Editar Evento' : 'Novo Evento'}</h2>
          <button className="modal-close-btn" onClick={handleSave} title="Fechar (Esc)">&times;</button>
        </header>

        <div className="modal-body">
          {/* Título */}
          <div className="form-group">
            <label className="form-label">Titulo</label>
            <Input
              ref={titleInputRef}
              fullWidth
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nome do evento"
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            />
          </div>

          {/* Data e hora */}
          <div className="form-group">
            <label className="form-label">Quando</label>
            <div className="form-date-time">
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="form-input form-input-date"
              />
              <input
                ref={timeInputRef}
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="form-input form-input-time"
                title="Hora (opcional)"
              />
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
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
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
            <p className="form-hint">
              {normalizedTime
                ? `Periodo pela hora: ${PERIOD_LABELS[getPeriodFromTime(normalizedTime)]}.`
                : 'Sem hora = Dia todo.'}
            </p>
            {validationError && <div className="form-error">{validationError}</div>}
            {!validationError && requiresTimeForPeriod && (
              <div className="form-error">Defina uma nova hora para este periodo.</div>
            )}
          </div>

          {/* Categoria */}
          <CategoryField
            categories={categories}
            categoryId={categoryId}
            selectedCat={selectedCat}
            onSelect={setCategoryId}
            onAddCategory={onAddCategory}
          />

          {/* Recorrência */}
          <div className="form-group">
            <label className="form-label">Recorrencia</label>
            <div className="form-date-time">
              <select
                className="form-input"
                value={recurrenceFrequency}
                onChange={e => setRecurrenceFrequency(e.target.value as CalendarRecurrenceFrequency)}
              >
                <option value="none">Nao repetir</option>
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
              </select>
              <input
                type="number"
                min={1}
                className="form-input"
                value={recurrenceInterval}
                onChange={e => setRecurrenceInterval(Math.max(1, Number(e.target.value)))}
                disabled={recurrenceFrequency === 'none'}
                title="Intervalo"
                style={{ width: 120 }}
              />
              <input
                type="date"
                className="form-input form-input-date"
                value={recurrenceUntil}
                onChange={e => setRecurrenceUntil(e.target.value)}
                disabled={recurrenceFrequency === 'none'}
                title="Ate (opcional)"
              />
            </div>
            <p className="form-hint">
              {recurrenceFrequency === 'none'
                ? 'Evento unico.'
                : `Repete a cada ${recurrenceInterval} ${
                  recurrenceFrequency === 'daily' ? 'dia(s)'
                  : recurrenceFrequency === 'weekly' ? 'semana(s)'
                  : recurrenceFrequency === 'monthly' ? 'mes(es)'
                  : 'ano(s)'
                }${recurrenceUntil.trim() ? ` ate ${recurrenceUntil}` : ''}.`}
            </p>
          </div>

          {/* Lembrete */}
          <div className="form-group">
            <label className="form-label">Lembrete</label>
            <div className="form-date-time">
              <label className="form-checkbox" style={{ gap: 10 }}>
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={e => setReminderEnabled(e.target.checked)}
                />
                <span className="form-checkbox-label">Lembrar este evento</span>
              </label>
              <select
                className="form-input"
                value={reminderOffset}
                onChange={e => setReminderOffset(Number(e.target.value))}
                disabled={!reminderEnabled}
              >
                <option value={0}>Na hora</option>
                <option value={15}>15 minutos antes</option>
                <option value={30}>30 minutos antes</option>
                <option value={60}>1 hora antes</option>
                <option value={120}>2 horas antes</option>
                <option value={1440}>1 dia antes</option>
              </select>
            </div>
            <p className="form-hint">Lembrete so funciona com hora definida.</p>
          </div>

          {/* Descrição */}
          <div className="form-group">
            <label className="form-label">Descricao</label>
            <Textarea
              fullWidth
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Opcional"
            />
          </div>
        </div>

        <footer className="modal-footer">
          <Button
            variant="danger"
            onClick={handleDelete}
            className={confirmDelete ? 'btn-confirm' : ''}
          >
            {confirmDelete ? 'Clique para confirmar' : 'Excluir'}
          </Button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} disabled={!title.trim()}>
              Salvar
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}
