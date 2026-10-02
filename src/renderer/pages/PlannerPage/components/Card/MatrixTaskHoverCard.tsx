import type { ReactElement } from 'react'
import { Clock3, FolderKanban, ListChecks, Sparkles } from 'lucide-react'
import { PRIORITY_LABELS, STATUS_LABELS } from '@types'
import type { Project } from '@types'
import type { PlanningTask } from '../../types/planning.types'
import { Tooltip } from '../../../shared/components/primitives/Tooltip'

interface MatrixTaskHoverCardProps {
  task: PlanningTask
  project?: Project
  disabled?: boolean
  children: ReactElement
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
}: MatrixTaskHoverCardProps) {
  const priority = task.priority || 'P3'
  const description = normalizeDescription(task)
  const duration = formatDuration(task.durationMinutes)
  const checklistTotal = task.checklist?.length || 0
  const checklistDone = task.checklist?.filter(item => item.done || item.completed).length || 0
  const tags = (task.tags || []).filter(Boolean).slice(0, 4)

  if (disabled) return children

  return (
    <Tooltip.Provider delayDuration={160} skipDelayDuration={80}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="right"
            sideOffset={8}
            collisionPadding={12}
            className="matrix-task-preview"
            aria-label={`Detalhes da tarefa ${task.title}`}
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
            <Tooltip.Arrow className="matrix-task-preview-arrow" width={12} height={6} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
