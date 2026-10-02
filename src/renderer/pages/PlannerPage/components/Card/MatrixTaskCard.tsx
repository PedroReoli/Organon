import { useEffect, useRef, type CSSProperties, type MouseEvent } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { Check, ChevronRight, Clock3 } from 'lucide-react'
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
  const contextLabel = project?.name || 'Sem projeto'
  const style: MatrixCardStyle = {
    '--matrix-priority-color': PRIORITY_COLORS[priority],
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

  return (
    <article
      ref={setNodeRef}
      style={style}
      data-planning-task-id={task.id}
      {...attributes}
      {...listeners}
      onClick={handleOpen}
      className={`matrix-task-card ${isDone ? 'is-done' : ''} ${isSelected ? 'is-selected' : ''}`}
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

      <div className="matrix-task-card-copy">
        <strong>{task.title}</strong>
        <span>
          <b>{priority}</b>
          {task.time && (
            <time dateTime={task.time}>
              <Clock3 size={10} />
              {task.time}
            </time>
          )}
          <em title={contextLabel}>{contextLabel}</em>
        </span>
      </div>

      <MatrixTaskHoverCard task={task} project={project} disabled={previewDisabled || isDragging}>
        <button
          type="button"
          className="matrix-task-details-trigger"
          aria-label={`Ver descrição de ${task.title}`}
          onPointerDown={event => event.stopPropagation()}
          onClick={handleOpen}
        >
          <ChevronRight size={15} />
        </button>
      </MatrixTaskHoverCard>
    </article>
  )
}
