import { PlanningTask } from '../../types/planning.types';

export const PriorityQueue = ({ tasks, onEdit }: { tasks: PlanningTask[]; onEdit: (id: string) => void }) => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const priorities = tasks
    .filter(
      (t) =>
        (t.priority === 'P1' || t.priority === 'P2') &&
        t.status !== 'done' &&
        (!t.date || t.date === todayStr)
    )
    .slice(0, 3);

  return (
    <div className="priority-queue" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)' }} />
        <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: 'var(--color-text)' }}>
          Top 3 Prioridades do Dia
        </h3>
      </div>

      {priorities.length === 0 ? (
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--color-surface)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.04)',
            color: 'var(--color-text-muted)',
            fontSize: '12.5px',
          }}
        >
          Nenhuma prioridade urgente para hoje.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          {priorities.map((task) => (
            <div
              key={task.id}
              onClick={() => onEdit(task.id)}
              style={{
                padding: '12px 14px',
                background: 'var(--color-surface)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: `3px solid ${task.priority === 'P1' ? '#ef4444' : '#f59e0b'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text)' }}>
                {task.title}
              </div>
              {task.projectId && (
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  Projeto: {task.projectId}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

