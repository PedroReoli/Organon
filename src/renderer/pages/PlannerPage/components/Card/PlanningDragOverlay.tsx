import { Clock3, GripVertical } from 'lucide-react'
import { PRIORITY_COLORS } from '@types'
import type { Project } from '@types'
import type { PlanningTask } from '../../types/planning.types'

interface PlanningDragOverlayProps {
  task: PlanningTask
  project?: Project
}

export function PlanningDragOverlay({ task, project }: PlanningDragOverlayProps) {
  const priority = task.priority || 'P3'
  const context = project?.name || task.tags?.find(Boolean) || 'Sem projeto'

  return (
    <div
      className="pointer-events-none relative w-64 overflow-hidden rounded-xl border border-indigo-400/60 bg-[#172139] px-3 py-2.5 text-left shadow-[0_22px_55px_rgba(2,6,23,0.72)]"
      style={{ borderLeftColor: PRIORITY_COLORS[priority], borderLeftWidth: 4 }}
    >
      <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold text-slate-400">
        <span style={{ color: PRIORITY_COLORS[priority] }}>{priority}</span>
        {task.time && (
          <span className="ml-auto inline-flex items-center gap-1">
            <Clock3 size={11} />
            {task.time}
          </span>
        )}
        <GripVertical size={14} className="text-indigo-300" />
      </div>
      <strong className="block line-clamp-2 text-xs leading-4 text-white">{task.title}</strong>
      <span className="mt-1.5 block truncate text-[10px] text-slate-400">Mover para outro dia ou turno · {context}</span>
    </div>
  )
}
