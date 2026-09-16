import { PlanningTask } from '../../types/planning.types';

export const PriorityQueue = ({ tasks, onEdit }: { tasks: PlanningTask[], onEdit: (id: string) => void }) => {
    const priorities = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').slice(0, 3);

    return (
        <div className="priority-queue">
            <h3 style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="priority-dot" style={{ backgroundColor: 'var(--color-primary)', width: '8px', height: '8px', borderRadius: '50%' }}></span>
                Top 3 Daily Priorities
            </h3>
            {priorities.length === 0 ? (
                <div style={{ padding: '12px', color: 'var(--color-text-muted)' }}>No urgent priorities for today.</div>
            ) : (
                <div className="priority-list" style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    {priorities.map(task => (
                        <div key={task.id}
                             className="priority-card"
                             onClick={() => onEdit(task.id)}
                             style={{ flex: 1, padding: '16px', background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', cursor: 'pointer', transition: 'transform 0.12s' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600 }}>{task.title}</div>
                            {task.projectId && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Project: {task.projectId}</div>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
