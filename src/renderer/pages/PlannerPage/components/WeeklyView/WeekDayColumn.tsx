import { PlanningTask } from '../../types/planning.types';
import { PlanningCardCompact } from '../Card/PlanningCardCompact';

export const WeekDayColumn = ({ date, dayName, tasks, onEdit }: { date: string, dayName: string, tasks: PlanningTask[], onEdit: (id: string) => void }) => {
    const plannedMinutes = tasks.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
    const capacityHours = 6;
    const plannedHours = (plannedMinutes / 60).toFixed(1);

    return (
        <div className="weekday-column" style={{ flex: 1, minWidth: '200px', background: 'var(--color-surface)', borderRadius: '8px', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="column-header" style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontWeight: 600 }}>{dayName}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{date}</div>
                <div style={{ fontSize: '11px', marginTop: '8px', color: plannedMinutes / 60 > capacityHours ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
                    {plannedHours}h / {capacityHours}h capacity
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', marginTop: '4px', borderRadius: '2px' }}>
                    <div style={{ width: `${Math.min(100, (plannedMinutes / 60 / capacityHours) * 100)}%`, height: '100%', background: plannedMinutes / 60 > capacityHours ? 'var(--color-danger)' : 'var(--color-primary)', borderRadius: '2px' }} />
                </div>
            </div>
            <div className="column-content" style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                {tasks.map(task => (
                    <PlanningCardCompact key={task.id} task={task} onEdit={() => onEdit(task.id)} />
                ))}
            </div>
        </div>
    )
}
