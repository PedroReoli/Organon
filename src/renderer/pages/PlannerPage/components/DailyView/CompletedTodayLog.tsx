import { useState } from 'react';
import { PlanningTask } from '../../types/planning.types';

export const CompletedTodayLog = ({ tasks }: { tasks: PlanningTask[] }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const todayStr = new Date().toISOString().slice(0, 10);

    // Assume tasks completed today either have date=today and status=done, or a separate completedAt field.
    // Since we only have updatedAt and status, we'll approximate:
    const completedToday = tasks.filter(t => t.status === 'done' && t.updatedAt && t.updatedAt.startsWith(todayStr));

    if (completedToday.length === 0) return null;

    return (
        <div style={{
            marginTop: '24px',
            background: 'var(--color-surface)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            overflow: 'hidden'
        }}>
            <div
                onClick={() => setIsCollapsed(!isCollapsed)}
                style={{
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: 'var(--color-text-secondary)',
                    background: 'rgba(0,0,0,0.2)'
                }}
            >
                <span>✅ Completed Today ({completedToday.length})</span>
                <span>{isCollapsed ? '▼' : '▲'}</span>
            </div>
            {!isCollapsed && (
                <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {completedToday.map(task => (
                        <div key={task.id} style={{
                            padding: '8px 12px',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            textDecoration: 'line-through',
                            color: 'var(--color-text-muted)'
                        }}>
                            {task.iconEmoji} {task.title}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
