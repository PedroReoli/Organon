import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FolderKanban,
  ListChecks,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { PRIORITY_LABELS, STATUS_LABELS } from '@types'
import type { Project } from '@types'
import type { PlanningTask } from '../../types/planning.types'
import { Popover } from '../../../shared/components/primitives/Popover'

interface MatrixTaskHoverCardProps {
  task: PlanningTask
  project?: Project
  disabled?: boolean
  children: ReactNode
  onEdit: () => void
  onToggleStatus?: (id: string) => void
  onPostponeWeek?: (id: string) => void
}

const normalizeDescription = (task: PlanningTask) => {
  const source = task.description || task.descriptionHtml || ''
  return source.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

const formatDuration = (minutes: number | null) => {
  if (!minutes) return null
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}min` : `${hours}h`
}

export function MatrixTaskHoverCard({
  task,
  project,
  disabled = false,
  children,
  onEdit,
  onToggleStatus,
  onPostponeWeek,
}: MatrixTaskHoverCardProps) {
  const [open, setOpen] = useState(false)
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  const clearTimer = (timer: typeof openTimerRef) => {
    if (!timer.current) return
    clearTimeout(timer.current)
    timer.current = null
  }

  const cancelOpen = () => clearTimer(openTimerRef)
  const cancelClose = () => clearTimer(closeTimerRef)

  const openSoon = () => {
    if (disabled || open) return
    cancelClose()
    cancelOpen()
    openTimerRef.current = setTimeout(() => setOpen(true), 180)
  }

  const closeSoon = () => {
    cancelOpen()
    cancelClose()
    closeTimerRef.current = setTimeout(() => setOpen(false), 140)
  }

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  useEffect(() => () => {
    cancelOpen()
    cancelClose()
  }, [])

  const handleBlur = () => {
    setTimeout(() => {
      const activeElement = document.activeElement
      if (
        activeElement
        && (anchorRef.current?.contains(activeElement) || previewRef.current?.contains(activeElement))
      ) {
        return
      }
      setOpen(false)
    }, 0)
  }

  const runAction = (action: () => void) => {
    action()
    setOpen(false)
  }

  const priority = task.priority || 'P3'
  const description = normalizeDescription(task)
  const duration = formatDuration(task.durationMinutes)
  const checklistTotal = task.checklist?.length || 0
  const checklistDone = task.checklist?.filter(item => item.done || item.completed).length || 0
  const tags = (task.tags || []).filter(Boolean).slice(0, 4)
  const isDone = task.status === 'done'

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div
          ref={anchorRef}
          className="matrix-task-card-anchor"
          onPointerEnter={(event) => {
            if (event.pointerType === 'mouse') openSoon()
          }}
          onPointerLeave={closeSoon}
          onFocusCapture={() => {
            cancelOpen()
            cancelClose()
            if (!disabled) setOpen(true)
          }}
          onBlurCapture={handleBlur}
        >
          {children}
        </div>
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          ref={previewRef}
          side="right"
          align="start"
          sideOffset={9}
          collisionPadding={12}
          sticky="always"
          className="matrix-task-preview"
          aria-label={`Prévia da tarefa ${task.title}`}
          onOpenAutoFocus={event => event.preventDefault()}
          onCloseAutoFocus={event => event.preventDefault()}
          onPointerEnter={cancelClose}
          onPointerLeave={closeSoon}
          onFocusCapture={cancelClose}
          onBlurCapture={handleBlur}
          onPointerDown={event => event.stopPropagation()}
        >
          <div className="matrix-task-preview-heading">
            <div className="matrix-task-preview-kicker">
              <span className={`matrix-task-preview-priority is-${priority.toLowerCase()}`}>
                {priority} · {PRIORITY_LABELS[priority]}
              </span>
              <span className="matrix-task-preview-status">{STATUS_LABELS[task.status]}</span>
            </div>
            <h3>{task.title}</h3>
          </div>

          <p className={`matrix-task-preview-description ${description ? '' : 'is-empty'}`}>
            {description || 'Sem descrição adicionada.'}
          </p>

          <div className="matrix-task-preview-facts">
            {project && (
              <span>
                <FolderKanban size={13} />
                {project.name}
              </span>
            )}
            {(task.time || duration) && (
              <span>
                <Clock3 size={13} />
                {[task.time, duration].filter(Boolean).join(' · ')}
              </span>
            )}
            {checklistTotal > 0 && (
              <span>
                <ListChecks size={13} />
                {checklistDone}/{checklistTotal} itens
              </span>
            )}
            {Boolean(task.storyPoints) && (
              <span>
                <Sparkles size={13} />
                {task.storyPoints} {task.storyPoints === 1 ? 'ponto' : 'pontos'}
              </span>
            )}
          </div>

          {tags.length > 0 && (
            <div className="matrix-task-preview-tags" aria-label="Tags">
              {tags.map(tag => <span key={tag}>{tag}</span>)}
            </div>
          )}

          <div className="matrix-task-preview-actions">
            <button type="button" onClick={() => runAction(onEdit)}>
              <ArrowUpRight size={14} />
              Abrir
            </button>
            {onToggleStatus && (
              <button type="button" onClick={() => runAction(() => onToggleStatus(task.id))}>
                {isDone ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
                {isDone ? 'Reabrir' : 'Concluir'}
              </button>
            )}
            {task.date && onPostponeWeek && (
              <button type="button" onClick={() => runAction(() => onPostponeWeek(task.id))}>
                <CalendarClock size={14} />
                +7 dias
              </button>
            )}
          </div>
          <Popover.Arrow className="matrix-task-preview-arrow" width={12} height={6} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
