import { PlanningTask } from '../../types/planning.types';

export const TimeBlockingGrid = ({ tasks, onEdit }: { tasks: PlanningTask[], onEdit: (id: string) => void }) => {
    const hours = Array.from({length: 15}, (_, i) => i + 8); // 8 AM to 10 PM

    return (
        <div className="time-blocking-grid" style={{ marginTop: '24px' }}>
            <h3>Time Blocks</h3>
            <div className="grid-container" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '12px' }}>
                {hours.map(hour => {
                    const blockTasks = tasks.filter(t => {
                        if (!t.time) return false;
                        const tHour = parseInt(t.time.split(':')[0], 10);
                        return tHour === hour;
                    });

                    return (
                        <div key={hour} className="time-row" style={{ display: 'flex', minHeight: '40px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div className="time-label" style={{ width: '60px', color: 'var(--color-text-muted)', fontSize: '12px', paddingTop: '8px' }}>
                                {hour.toString().padStart(2, '0')}:00
                            </div>
                            <div className="time-slot" style={{ flex: 1, padding: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {blockTasks.map(task => (
                                    <div key={task.id}
                                         onClick={() => onEdit(task.id)}
                                         style={{ padding: '4px 8px', background: 'var(--color-primary)', color: '#fff', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                                        {task.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
