import { useState } from 'react';
import { PlanningTask } from '../../types/planning.types';

export const CompletedTodayLog = ({
  tasks,
  onToggleStatus,
}: {
  tasks: PlanningTask[];
  onToggleStatus?: (id: string) => void;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const todayStr = new Date().toISOString().slice(0, 10);

  const completedToday = tasks.filter(
    (t) => t.status === 'done' && (t.date === todayStr || (t.updatedAt && t.updatedAt.startsWith(todayStr)))
  );

  if (completedToday.length === 0) return null;

  return (
    <div
      style={{
        marginTop: '20px',
        background: 'var(--color-surface)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <div
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          background: 'rgba(0,0,0,0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="2">
            <polyline points="3 8.5 6.5 12 13 4.5" />
          </svg>
          <span>Concluídas Hoje ({completedToday.length})</span>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.15s ease' }}
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </div>

      {!isCollapsed && (
        <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {completedToday.map((task) => (
            <div
              key={task.id}
              style={{
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '6px',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--color-text-muted)',
              }}
            >
              <button
                type="button"
                onClick={() => onToggleStatus?.(task.id)}
                title="Desmarcar tarefa"
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '3px',
                  border: '1px solid var(--color-primary)',
                  background: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#ffffff" strokeWidth="2">
                  <polyline points="2.5 6 4.5 8.5 9.5 3.5" />
                </svg>
              </button>
              <span style={{ textDecoration: 'line-through' }}>{task.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

