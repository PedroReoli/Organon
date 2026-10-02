import { useEffect, useId, useRef, useState } from 'react'
import { ChevronRight, Tag } from 'lucide-react'
import { PRIORITY_COLORS } from '@types'
import type { Project } from '@types'
import type { PlanningTask } from '../../types/planning.types'
import { Popover } from '../../../shared/components/primitives/Popover'
import { MatrixTaskCard } from './MatrixTaskCard'

interface MatrixTagGroupProps {
  label: string
  tasks: PlanningTask[]
  projects: Project[]
  slotId: string
  activeTask?: PlanningTask | null
  selectedTaskId: string | null
  onSelectTask: (taskId: string) => void
  onEdit: (id: string) => void
  onToggleStatus: (id: string) => void
}

export function MatrixTagGroup({
  label,
  tasks,
  projects,
  slotId,
  activeTask,
  selectedTaskId,
  onSelectTask,
  onEdit,
  onToggleStatus,
}: MatrixTagGroupProps) {
  const [open, setOpen] = useState(false)
  const contentId = useId()
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const draggedFromGroupRef = useRef(false)
  const isDraggingFromGroup = Boolean(activeTask && tasks.some(task => task.id === activeTask.id))
  const doneCount = tasks.filter(task => task.status === 'done').length
  const openCount = tasks.length - doneCount
  const priorities = Array.from(new Set(tasks.map(task => task.priority || 'P3'))).slice(0, 4)

  const clearTimer = (timer: typeof openTimerRef) => {
    if (!timer.current) return
    clearTimeout(timer.current)
    timer.current = null
  }

  const cancelOpen = () => clearTimer(openTimerRef)
  const cancelClose = () => clearTimer(closeTimerRef)

  const openSoon = () => {
    cancelClose()
    if (open) return
    cancelOpen()
    openTimerRef.current = setTimeout(() => setOpen(true), 130)
  }

  const closeSoon = () => {
    cancelOpen()
    if (isDraggingFromGroup) return
    cancelClose()
    closeTimerRef.current = setTimeout(() => setOpen(false), 180)
  }

  useEffect(() => {
    if (isDraggingFromGroup) {
      draggedFromGroupRef.current = true
      cancelClose()
      setOpen(true)
      return
    }
    if (draggedFromGroupRef.current) {
      draggedFromGroupRef.current = false
      setOpen(false)
    }
  }, [isDraggingFromGroup])

  useEffect(() => () => {
    cancelOpen()
    cancelClose()
  }, [])

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <button
          type="button"
          className="matrix-tag-group"
          aria-expanded={open}
          aria-controls={contentId}
          onPointerEnter={event => {
            if (event.pointerType === 'mouse') openSoon()
          }}
          onPointerLeave={closeSoon}
          onFocus={() => {
            cancelOpen()
            cancelClose()
            setOpen(true)
          }}
          onBlur={closeSoon}
          onClick={event => {
            event.stopPropagation()
            setOpen(true)
          }}
        >
          <span className="matrix-tag-group-icon"><Tag size={12} /></span>
          <span className="matrix-tag-group-copy">
            <strong title={label}>{label}</strong>
            <small>{openCount ? `${openCount} em aberto` : 'Tudo concluído'}</small>
          </span>
          <span className="matrix-tag-group-priorities" aria-label="Prioridades do grupo">
            {priorities.map(priority => (
              <i key={priority} style={{ backgroundColor: PRIORITY_COLORS[priority] }} title={priority} />
            ))}
          </span>
          <span className="matrix-tag-group-count">{tasks.length}</span>
          <ChevronRight className="matrix-tag-group-arrow" size={13} />
        </button>
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          id={contentId}
          side="right"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          sticky="always"
          className="matrix-tag-popover"
          onOpenAutoFocus={event => event.preventDefault()}
          onCloseAutoFocus={event => event.preventDefault()}
          onPointerEnter={cancelClose}
          onPointerLeave={closeSoon}
          onFocusCapture={cancelClose}
          onPointerDown={event => event.stopPropagation()}
          onInteractOutside={event => {
            if (isDraggingFromGroup) event.preventDefault()
          }}
        >
          <header className="matrix-tag-popover-header">
            <span><Tag size={13} /></span>
            <div>
              <strong>{label}</strong>
              <small>{tasks.length} {tasks.length === 1 ? 'demanda' : 'demandas'}</small>
            </div>
          </header>

          <div className="matrix-tag-task-list">
            {tasks.map(task => (
              <MatrixTaskCard
                key={task.id}
                task={task}
                project={projects.find(project => project.id === task.projectId)}
                slotId={slotId}
                previewDisabled={Boolean(activeTask)}
                isSelected={selectedTaskId === task.id}
                onEdit={() => onEdit(task.id)}
                onSelectTask={onSelectTask}
                onToggleStatus={onToggleStatus}
              />
            ))}
          </div>
          <p className="matrix-tag-popover-hint">Arraste uma demanda ou use a seta para ver a descrição.</p>
          <Popover.Arrow className="matrix-tag-popover-arrow" width={12} height={6} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
