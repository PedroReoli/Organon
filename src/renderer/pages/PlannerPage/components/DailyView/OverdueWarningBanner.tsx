import { PlanningTask } from '../../types/planning.types';

export const OverdueWarningBanner = ({ tasks, onReschedule }: { tasks: PlanningTask[], onReschedule: () => void }) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const overdueTasks = tasks.filter(t => t.hasDate && t.date && t.date < todayStr && t.status !== 'done' && t.status !== 'archived');

    if (overdueTasks.length === 0) return null;

    return (
        <div style={{
            background: 'rgba(245, 158, 11, 0.1)', // Amber glow
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#f59e0b', fontSize: '18px' }}>⚠️</span>
                <span style={{ fontWeight: 500, color: '#f59e0b' }}>
                    You have {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}.
                </span>
            </div>
            <button
                onClick={onReschedule}
                style={{
                    background: '#f59e0b',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'transform 120ms ease-out'
                }}
            >
                Reschedule to Today
            </button>
        </div>
    )
}
