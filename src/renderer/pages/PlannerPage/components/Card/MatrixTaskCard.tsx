import type { CSSProperties, MouseEvent } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, Clock3, GripVertical, ListChecks } from 'lucide-react'
import { PRIORITY_COLORS, STATUS_LABELS } from '@types'
import type { Project } from '@types'
import type { PlanningTask } from '../../types/planning.types'
import { MatrixTaskHoverCard } from './MatrixTaskHoverCard'

interface MatrixTaskCardProps {
  task: PlanningTask
  project?: Project
  isSelected?: boolean
  onEdit: () => void
  onSelectTask: (taskId: string) => void
  onToggleStatus?: (id: string) => void
  onPostponeWeek?: (id: string) => void
}

type MatrixCardStyle = CSSProperties & {
  '--matrix-priority-color': string
}

export function MatrixTaskCard({
  task,
  project,
  isSelected = false,
  onEdit,
  onSelectTask,
  onToggleStatus,
  onPostponeWeek,
}: MatrixTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'Task', task },
  })

  const isDone = task.status === 'done'
  const priority = task.priority || 'P3'
  const checklistTotal = task.checklist?.length || 0
  const checklistDone = task.checklist?.filter(item => item.done || item.completed).length || 0
  const primaryTag = (task.tags || []).find(Boolean)
  const contextLabel = project?.name || primaryTag || STATUS_LABELS[task.status]

  const style: MatrixCardStyle = {
    '--matrix-priority-color': PRIORITY_COLORS[priority],
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.28 : 1,
  }

  const handleOpen = (event: MouseEvent) => {
    event.stopPropagation()
    if (event.ctrlKey || event.metaKey) {
      onSelectTask(task.id)
      return
    }
    onEdit()
  }

  return (
    <MatrixTaskHoverCard
      task={task}
      project={project}
      disabled={isDragging}
      onEdit={onEdit}
      onToggleStatus={onToggleStatus}
      onPostponeWeek={onPostponeWeek}
    >
      <article
        ref={setNodeRef}
        style={style}
        data-planning-task-id={task.id}
        className={`matrix-task-card ${isDone ? 'is-done' : ''} ${isSelected ? 'is-selected' : ''} ${isDragging ? 'is-dragging' : ''}`}
      >
        <div className="matrix-task-card-topline">
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

          <span className="matrix-task-priority">{priority}</span>

          {task.time && (
            <time className="matrix-task-time" dateTime={task.time}>
              <Clock3 size={10} />
              {task.time}
            </time>
          )}

          <button
            ref={setActivatorNodeRef}
            type="button"
            className="matrix-task-drag-handle"
            aria-label={`Arrastar tarefa ${task.title}`}
            onPointerDown={event => event.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical size={13} />
          </button>
        </div>

        <button type="button" className="matrix-task-title" onClick={handleOpen}>
          {task.title}
        </button>

        <div className="matrix-task-card-footer">
          <span className="matrix-task-context" title={contextLabel}>{contextLabel}</span>
          <span className="matrix-task-metrics">
            {checklistTotal > 0 && (
              <span title={`Checklist: ${checklistDone}/${checklistTotal}`}>
                <ListChecks size={10} />
                {checklistDone}/{checklistTotal}
              </span>
            )}
            {Boolean(task.storyPoints) && <span>{task.storyPoints}pt</span>}
          </span>
        </div>
      </article>
    </MatrixTaskHoverCard>
  )
}
