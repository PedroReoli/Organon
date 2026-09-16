import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlanningTask } from '../../types/planning.types';

interface PlanningCardCompactProps {
  task: PlanningTask;
  onEdit: () => void;
  isSortable?: boolean;
  onToggleStatus?: (id: string) => void;
  onPostponeWeek?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const PlanningCardCompact = ({
  task,
  onEdit,
  isSortable,
  onToggleStatus,
  onPostponeWeek,
  onDelete: _onDelete,
}: PlanningCardCompactProps) => {
  const isDone = task.status === 'done';

  const priorityColor =
    task.priority === 'P1'
      ? '#ef4444'
      : task.priority === 'P2'
      ? '#f59e0b'
      : task.priority === 'P3'
      ? '#3b82f6'
      : '#6b7280';

  const cardContent = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        minWidth: 0,
      }}
    >
      {/* Checkbox discreto */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleStatus?.(task.id);
        }}
        title={isDone ? 'Marcar como pendente' : 'Marcar como concluída'}
        style={{
          width: '14px',
          height: '14px',
          borderRadius: '3px',
          border: isDone ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.2)',
          background: isDone ? 'var(--color-primary)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          flexShrink: 0,
          transition: 'all 0.12s ease',
        }}
      >
        {isDone && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#ffffff" strokeWidth="2">
            <polyline points="2.5 6 4.5 8.5 9.5 3.5" />
          </svg>
        )}
      </button>

      {/* Priority Dot */}
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: priorityColor,
          flexShrink: 0,
        }}
        title={`Prioridade: ${task.priority || 'normal'}`}
      />

      {/* Title */}
      <span
        onClick={onEdit}
        title={task.title}
        style={{
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          cursor: 'pointer',
          textDecoration: isDone ? 'line-through' : 'none',
          color: isDone ? 'var(--color-text-muted)' : 'var(--color-text)',
          fontSize: '12.5px',
          fontWeight: 450,
        }}
      >
        {task.title}
      </span>

      {/* Time Badge */}
      {task.time && (
        <span
          style={{
            fontSize: '10.5px',
            fontFamily: 'monospace',
            padding: '1px 4px',
            borderRadius: '4px',
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--color-text-muted)',
            flexShrink: 0,
          }}
        >
          {task.time}
        </span>
      )}

      {/* Quick Action: Jogar para Próxima Semana (+7d) */}
      {onPostponeWeek && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPostponeWeek(task.id);
          }}
          title="Jogar para a próxima semana (+7 dias)"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            opacity: 0.6,
            transition: 'opacity 0.15s ease, background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.6';
            e.currentTarget.style.background = 'none';
          }}
        >
          <span>+7d</span>
        </button>
      )}
    </div>
  );

  if (isSortable) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: task.id,
      data: { type: 'Task', task },
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.4 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={{
          ...style,
          minHeight: '32px',
          display: 'flex',
          alignItems: 'center',
          padding: '4px 8px',
          background: 'var(--color-surface)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '6px',
          cursor: 'grab',
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        }}
        {...attributes}
        {...listeners}
      >
        {cardContent}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '32px',
        display: 'flex',
        alignItems: 'center',
        padding: '4px 8px',
        background: 'var(--color-surface)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '6px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
      }}
    >
      {cardContent}
    </div>
  );
};

