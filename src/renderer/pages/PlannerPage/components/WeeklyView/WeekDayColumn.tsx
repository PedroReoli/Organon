import { useDroppable } from '@dnd-kit/core';
import { PlanningTask } from '../../types/planning.types';
import { PlanningCardCompact } from '../Card/PlanningCardCompact';
import { WeekCapacityBar } from './WeekCapacityBar';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface WeekDayColumnProps {
  date: string;
  dayName: string;
  isToday?: boolean;
  tasks: PlanningTask[];
  onEdit: (id: string) => void;
  onToggleStatus?: (id: string) => void;
  onPostponeWeek?: (id: string) => void;
  onAddTask?: (date: string) => void;
}

export const WeekDayColumn = ({
  date,
  dayName,
  isToday = false,
  tasks,
  onEdit,
  onToggleStatus,
  onPostponeWeek,
  onAddTask,
}: WeekDayColumnProps) => {
  const plannedMinutes = tasks.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
  const capacityMinutes = 6 * 60; // 6h por dia como padrão

  const { setNodeRef } = useDroppable({
    id: date,
    data: { type: 'Column', date },
  });

  // Format date like "16 Set"
  const formattedDay = (() => {
    try {
      const parts = date.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      }
    } catch {
      // fallback
    }
    return date;
  })();

  return (
    <div
      style={{
        flex: 1,
        minWidth: '220px',
        maxWidth: '320px',
        background: 'var(--color-surface)',
        borderRadius: '10px',
        display: 'flex',
        flexDirection: 'column',
        border: isToday ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.06)',
        boxShadow: isToday ? '0 0 12px rgba(var(--color-primary-rgb, 59, 130, 246), 0.15)' : 'none',
        overflow: 'hidden',
      }}
    >
      {/* Column Header */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: isToday
            ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))'
            : 'rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontWeight: 600,
                fontSize: '13.5px',
                color: isToday ? 'var(--color-primary)' : 'var(--color-text)',
              }}
            >
              {dayName}
            </span>
            {isToday && (
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '1px 5px',
                  borderRadius: '4px',
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                }}
              >
                Hoje
              </span>
            )}
          </div>
          <span style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
            {formattedDay}
          </span>
        </div>

        <div style={{ marginTop: '8px' }}>
          <WeekCapacityBar plannedMinutes={plannedMinutes} capacityMinutes={capacityMinutes} />
        </div>
      </div>

      {/* Cards List Drop Zone */}
      <div
        ref={setNodeRef}
        style={{
          padding: '10px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          overflowY: 'auto',
          minHeight: '160px',
        }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <PlanningCardCompact
              key={task.id}
              task={task}
              onEdit={() => onEdit(task.id)}
              onToggleStatus={onToggleStatus}
              onPostponeWeek={onPostponeWeek}
              isSortable={true}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div
            style={{
              padding: '24px 8px',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
              fontSize: '12px',
              border: '1px dashed rgba(255,255,255,0.06)',
              borderRadius: '6px',
              margin: 'auto 0',
            }}
          >
            Nenhuma tarefa agendada
          </div>
        )}
      </div>

      {/* Column Footer: Quick Add */}
      {onAddTask && (
        <button
          type="button"
          onClick={() => onAddTask(date)}
          style={{
            padding: '8px',
            border: 'none',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--color-primary)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--color-text-muted)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 2v12M2 8h12" />
          </svg>
          <span>Nova Tarefa</span>
        </button>
      )}
    </div>
  );
};

