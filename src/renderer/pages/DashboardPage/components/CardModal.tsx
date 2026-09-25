import React, { useState, useEffect, useRef, useMemo } from 'react'
import type { Card, CardPriority, CardStatus, Project, CardReminder } from '@types'
import { PRIORITY_LABELS, PRIORITY_COLORS, STATUS_LABELS, STATUS_COLORS, STATUS_ORDER } from '@types'
import { WysiwygEditor } from '@Notes/editor/WysiwygEditor'
import { getTodayISO } from '@utils'
import { Button } from '@shared/components/primitives'
import { Check } from 'lucide-react'
import { TaskReminderConfig } from '../../../components/planner/TaskReminderConfig'

interface CardModalProps {
  card: Card
  projects?: Project[]
  onClose: () => void
  onSave: (updates: Partial<Card> & {
    title: string
    descriptionHtml: string
    date: string | null
    time: string | null
    hasDate: boolean
    priority: CardPriority | null
    status: CardStatus
    projectId: string | null
    durationMinutes: number | null
    reminder?: CardReminder | null
  }) => void
  onDelete: () => void
}

function calcEndTime(startTime: string, durationMinutes: number | null): string {
  if (!startTime || !durationMinutes) return ''
  const [h, m] = startTime.split(':').map(Number)
  const totalMin = h * 60 + m + durationMinutes
  const endH = Math.floor(totalMin / 60) % 24
  const endM = totalMin % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

function calcDuration(startTime: string, endTime: string): number | null {
  if (!startTime || !endTime) return null
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return diff > 0 ? diff : null
}

const PRIORITIES: (CardPriority | null)[] = [null, 'P1', 'P2', 'P3', 'P4']

function formatDuration(durationMinutes: number | null): string {
  if (durationMinutes == null || durationMinutes <= 0) return ''
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`
  if (hours > 0) return `${hours}h`
  return `${minutes}min`
}

export const CardModal = ({ card, projects, onClose, onSave, onDelete }: CardModalProps) => {
  const [title,         setTitle]         = useState(card.title)
  const [descHtml,      setDescHtml]      = useState(card.descriptionHtml)
  const [hasDate,       setHasDate]       = useState(card.hasDate)
  const [date,          setDate]          = useState(card.date ?? getTodayISO())
  const [startTime,     setStartTime]     = useState(card.time ?? '')
  const [endTime,       setEndTime]       = useState(
    calcEndTime(card.time ?? '', card.durationMinutes)
  )
  const [priority,      setPriority]      = useState<CardPriority | null>(card.priority)
  const [status,        setStatus]        = useState<CardStatus>(card.status)
  const [projectId,     setProjectId]     = useState<string | null>(card.projectId ?? null)
  const [postponementCount, setPostponementCount] = useState<number>(card.postponementCount ?? 0)
  const [cancelReason] = useState<string>(card.cancelReason ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [reminderToast, setReminderToast] = useState<string | null>(null)
  const [showDesc,      setShowDesc]      = useState(
    !!(card.descriptionHtml && card.descriptionHtml !== '<p></p>')
  )

  const handleQuickPostpone = (minutesOrTomorrow: number | 'tomorrow') => {
    const nextCount = postponementCount + 1
    setPostponementCount(nextCount)
    setStatus('postponed')

    if (minutesOrTomorrow === 'tomorrow') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().slice(0, 10)
      setDate(dateStr)
      setHasDate(true)
      setReminderToast(`Tarefa adiada para amanhã! (Adiada ${nextCount}x)`)
    } else {
      const now = new Date()
      now.setMinutes(now.getMinutes() + minutesOrTomorrow)
      const hoursStr = String(now.getHours()).padStart(2, '0')
      const minsStr = String(now.getMinutes()).padStart(2, '0')
      setStartTime(`${hoursStr}:${minsStr}`)
      setReminderToast(`Tarefa adiada em +${minutesOrTomorrow} min! (Adiada ${nextCount}x)`)
    }
  }

    }
  }

  const [reminder, setReminder] = useState<CardReminder | null | undefined>(card.reminder)

  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { titleRef.current?.focus(); titleRef.current?.select() }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const isLocked = card.isLocked
  const duration = useMemo(() => calcDuration(startTime, endTime), [startTime, endTime])
  const isTimeRangeInvalid = Boolean(startTime && endTime && duration == null)
  const canSave = title.trim().length > 0 && !isTimeRangeInvalid

  const handleSave = () => {
    if (!canSave) return
    onSave({
      title: title.trim(),
      descriptionHtml: descHtml,
      date: hasDate ? date : null,
      time: startTime || null,
      hasDate,
      priority,
      status,
      projectId,
      durationMinutes: duration,
      postponementCount,
      cancelReason: status === 'cancelled' ? cancelReason : null,
      completedAt: status === 'done' ? (card.completedAt ?? new Date().toISOString()) : null,
      startedAt: status === 'in_progress' ? (card.startedAt ?? new Date().toISOString()) : null,
      reminder: reminder ?? null,
    })
  }

  const handleDelete = () => {
    if (confirmDelete) { onDelete(); return }
    setConfirmDelete(true)
    setTimeout(() => setConfirmDelete(false), 3000)
  }

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return
    if (isLocked) {
      onClose()
      return
    }
    if (!canSave) return
    handleSave()
  }

  const handleHasDateChange = (checked: boolean) => {
    setHasDate(checked)
    if (checked && !date) setDate(getTodayISO())
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div className="card-modal">
        <div className="card-modal-header">
          <div className="card-modal-header-main">
            <div className="card-modal-meta-group">
              <span className="card-modal-meta-label">Status</span>
              <div className="card-modal-meta-options">
                {STATUS_ORDER.map(s => (
                  <button
                    key={s}
                    className={`card-modal-status-btn ${status === s ? 'is-active' : ''}`}
                    style={{ '--status-color': STATUS_COLORS[s] } as React.CSSProperties}
                    onClick={() => !isLocked && setStatus(s)}
                    disabled={isLocked}
                    title={STATUS_LABELS[s]}
                    type="button"
                  >
                    <span className="card-modal-status-dot" style={{ background: STATUS_COLORS[s] }} />
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="card-modal-meta-group">
              <span className="card-modal-meta-label">Prioridade</span>
              <div className="card-modal-meta-options">
                {PRIORITIES.map(p => (
                  <button
                    key={p ?? 'none'}
                    className={`card-modal-priority-btn ${priority === p ? 'is-active' : ''}`}
                    style={priority === p && p
                      ? { background: PRIORITY_COLORS[p] + '22', borderColor: PRIORITY_COLORS[p], color: PRIORITY_COLORS[p] }
                      : undefined}
                    onClick={() => !isLocked && setPriority(p)}
                    disabled={isLocked}
                    title={p ? `${p} - ${PRIORITY_LABELS[p]}` : 'Sem prioridade'}
                    type="button"
                  >
                    {p ? (
                      <>
                        <span className="card-modal-priority-dot" style={{ background: PRIORITY_COLORS[p] }} />
                        {p}
                      </>
                    ) : 'Sem'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            className="card-modal-close"
            onClick={onClose}
            title="Fechar (Esc)"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 1l12 12M13 1L1 13" />
            </svg>
          </button>
        </div>

        <div className="card-modal-title-wrap">
          <div className="card-modal-title-meta">
            {isLocked && (
              <span className="card-modal-locked-badge">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11">
                  <rect x="2" y="7" width="12" height="8" rx="1.5" />
                  <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" />
                </svg>
                Travado
              </span>
            )}
            {projectId && projects?.find(project => project.id === projectId) && (
              <span className="card-modal-project-pill">
                {projects.find(project => project.id === projectId)?.name}
              </span>
            )}
          </div>
          <input
            ref={isLocked ? undefined : titleRef}
            type="text"
            className="card-modal-title-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            placeholder="Título do card…"
            disabled={isLocked}
          />
        </div>

        <div className="card-modal-body">
          <div className="card-modal-section">
            <div className="card-modal-section-heading">
              <div className="card-modal-section-label">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
                  <circle cx="8" cy="8" r="6" />
                  <polyline points="8 4 8 8 10.5 10.5" />
                </svg>
                Agenda
              </div>
              {duration != null && (
                <span className="card-modal-duration-badge">
                  {formatDuration(duration)}
                </span>
              )}
            </div>

            <div className="card-modal-time-range">
              <label className="card-modal-time-field">
                <span className="card-modal-time-label">Início</span>
                <input
                  type="time"
                  className="card-modal-time-input"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  disabled={isLocked}
                />
              </label>

              <span className="card-modal-time-sep">-</span>

              <label className="card-modal-time-field">
                <span className="card-modal-time-label">Fim</span>
                <input
                  type="time"
                  className="card-modal-time-input"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  disabled={isLocked || !startTime}
                />
              </label>
            </div>

            {isTimeRangeInvalid && (
              <div className="card-modal-error">
                O horário final precisa ser maior que o horário inicial.
              </div>
            )}

            <div className="card-modal-date-panel">
              <label className="card-modal-date-check">
                <input
                  type="checkbox"
                  checked={hasDate}
                  onChange={e => handleHasDateChange(e.target.checked)}
                  disabled={isLocked}
                />
                <span>Fixar em data</span>
              </label>
              {hasDate && (
                <div className="card-modal-date-field">
                  <span className="card-modal-time-label">Data</span>
                  <input
                    type="date"
                    className="card-modal-date-input"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    disabled={isLocked}
                  />
                </div>
              )}
            </div>

            {hasDate && (
              <p className="card-modal-hint">Cards fixos são removidos no reset semanal.</p>
            )}
          </div>

          {projects && projects.length > 0 && (
            <div className="card-modal-section">
              <div className="card-modal-section-label">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
                  <path d="M2 4h12v10H2zM5 4V2h6v2" />
                </svg>
                Projeto
              </div>
              <select
                className="card-modal-select"
                value={projectId ?? ''}
                onChange={e => setProjectId(e.target.value || null)}
                disabled={isLocked}
              >
                <option value="">Nenhum projeto</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="card-modal-section">
            <div className="card-modal-section-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Adiar Tarefa {postponementCount > 0 && <span style={{ fontSize: '10px', background: '#a855f722', color: '#a855f7', padding: '1px 6px', borderRadius: '8px', fontWeight: 600 }}>Adiado {postponementCount}x</span>}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              <Button size="sm" variant="secondary" onClick={() => handleQuickPostpone(10)} type="button">+ 10 min</Button>
              <Button size="sm" variant="secondary" onClick={() => handleQuickPostpone(30)} type="button">+ 30 min</Button>
              <Button size="sm" variant="secondary" onClick={() => handleQuickPostpone(60)} type="button">+ 1 hora</Button>
              <Button size="sm" variant="secondary" onClick={() => handleQuickPostpone('tomorrow')} type="button">Amanhã</Button>
            </div>
          </div>

          <TaskReminderConfig
            reminder={reminder}
            onChange={setReminder}
            taskDate={hasDate ? date : null}
            taskTime={startTime || null}
          />

          <div className="card-modal-section">
            <button
              className="card-modal-section-label card-modal-desc-toggle"
              onClick={() => setShowDesc(v => !v)}
              type="button"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
                <path d="M2 4h12M2 8h8M2 12h6" />
              </svg>
              Descrição
              <svg
                className={`card-modal-desc-chevron ${showDesc ? 'is-open' : ''}`}
                viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"
              >
                <polyline points="4 6 8 10 12 6" />
              </svg>
            </button>
            {showDesc && (
              <div className="card-modal-editor">
                <WysiwygEditor
                  content={descHtml}
                  onChange={setDescHtml}
                  mode="full"
                  placeholder="Adicione detalhes, notas ou instruções…"
                  readOnly={isLocked}
                />
              </div>
            )}
          </div>
        </div>

        <div className="card-modal-footer">
          <button
            className={`card-modal-delete ${confirmDelete ? 'is-confirm' : ''}`}
            onClick={handleDelete}
            type="button"
          >
            {confirmDelete ? 'Confirmar exclusão' : 'Excluir'}
          </button>

          <div className="card-modal-actions">
            {isLocked ? (
              <Button variant="primary" onClick={onClose} type="button">Fechar</Button>
            ) : (
              <>
                <Button variant="secondary" onClick={onClose} type="button">Cancelar</Button>
                <Button variant="primary" onClick={handleSave} disabled={!canSave} type="button">
                  Salvar
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
