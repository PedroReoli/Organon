import { PlanningTask } from '../../types/planning.types';

export const MonthMilestoneGrid = ({ tasks, onEdit }: { tasks: PlanningTask[], onEdit: (id: string) => void }) => {
    // simplified month grid
    return (
        <div className="monthly-view" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Monthly Roadmap</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {Array.from({length: 30}, (_, i) => i + 1).map(day => (
                    <div key={day} style={{ minHeight: '100px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '8px' }}>
                        <div style={{ color: 'var(--color-text-muted)' }}>{day}</div>
                        {/* placeholder for tasks */}
                    </div>
                ))}
            </div>
        </div>
    )
}
