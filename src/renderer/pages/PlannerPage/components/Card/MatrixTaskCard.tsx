import { useEffect, useRef, type CSSProperties, type MouseEvent } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { Check, Clock3 } from 'lucide-react'
import { PRIORITY_COLORS } from '@types'
import type { Project } from '@types'
import type { PlanningTask } from '../../types/planning.types'
import { MatrixTaskHoverCard } from './MatrixTaskHoverCard'

interface MatrixTaskCardProps {
  task: PlanningTask
  project?: Project
  isSelected?: boolean
  slotId: string
  previewDisabled?: boolean
  onEdit: () => void
  onSelectTask: (taskId: string) => void
  onToggleStatus?: (id: string) => void
}

type MatrixCardStyle = CSSProperties & {
  '--matrix-priority-color': string
}

/**
 * Reduz a fonte progressivamente conforme o tamanho do texto e presença do badge de horário,
 * priorizando encaixar sem corte e permitindo quebra de até 2 linhas.
 */
function getAutofitTitleStyle(title: string, hasTime: boolean): CSSProperties {
  const len = title.length
  let fontSize = '11px'
  let lineHeight = '1.24'

  if (hasTime) {
    if (len > 30) {
      fontSize = '8.5px'
      lineHeight = '1.14'
    } else if (len > 22) {
      fontSize = '9px'
      lineHeight = '1.16'
    } else if (len > 15) {
      fontSize = '9.8px'
      lineHeight = '1.18'
    }
  } else {
    if (len > 38) {
      fontSize = '8.5px'
      lineHeight = '1.14'
    } else if (len > 28) {
      fontSize = '9.2px'
      lineHeight = '1.16'
    } else if (len > 18) {
      fontSize = '10px'
      lineHeight = '1.2'
    }
  }

  return { fontSize, lineHeight }
}

export function MatrixTaskCard({
  task,
  project,
  isSelected = false,
  slotId,
  previewDisabled = false,
  onEdit,
  onSelectTask,
  onToggleStatus,
}: MatrixTaskCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({
    id: task.id,
    data: { type: 'Task', task, slotId },
  })
  const suppressOpenRef = useRef(false)

  useEffect(() => {
    if (isDragging) {
      suppressOpenRef.current = true
      return
    }
    if (!suppressOpenRef.current) return
    const timer = setTimeout(() => { suppressOpenRef.current = false }, 0)
    return () => clearTimeout(timer)
  }, [isDragging])

  const isDone = task.status === 'done'
  const priority = task.priority || 'P3'
  const style: MatrixCardStyle = {
    '--matrix-priority-color': PRIORITY_COLORS[priority] || '#3b82f6',
    transform: 'none',
    transition: 'none',
    opacity: isDragging ? 0.35 : 1,
  }

  const handleOpen = (event: MouseEvent) => {
    event.stopPropagation()
    if (suppressOpenRef.current) return
    if (event.ctrlKey || event.metaKey) {
      onSelectTask(task.id)
      return
    }
    onEdit()
  }

  const autofitStyle = getAutofitTitleStyle(task.title, Boolean(task.time))

  return (
    <article
      ref={setNodeRef}
      style={style}
      data-planning-task-id={task.id}
      {...attributes}
      {...listeners}
      onClick={handleOpen}
      className={`matrix-task-card ${isDone ? 'is-done' : ''} ${isSelected ? 'is-selected' : ''} ${isDragging ? 'is-dragging' : ''}`}
    >
      <button
        type="button"
        className="matrix-task-status-toggle"
        aria-label={isDone ? 'Marcar como pendente' : 'Marcar como concluída'}
        aria-pressed={isDone}
        onPointerDown={event => event.stopPropagation()}
        onClick={event => {
          event.stopPropagation()
          onToggleStatus?.(task.id)
        }}
      >
        {isDone && <Check size={10} strokeWidth={3} />}
      </button>

      <MatrixTaskHoverCard task={task} project={project} disabled={previewDisabled || isDragging}>
        <div className="matrix-task-card-copy">
          <span className="matrix-task-card-title" style={autofitStyle}>
            {task.title}
          </span>
          {task.time && (
            <time dateTime={task.time} className="matrix-task-card-time">
              <Clock3 size={9} />
              {task.time}
            </time>
          )}
        </div>
      </MatrixTaskHoverCard>
    </article>
  )
}
