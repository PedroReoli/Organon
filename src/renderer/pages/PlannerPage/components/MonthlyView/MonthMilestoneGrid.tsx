import { PlanningTask } from '../../types/planning.types';

export const MonthMilestoneGrid = ({ tasks, onEdit }: { tasks: PlanningTask[], onEdit: (id: string) => void }) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    const daysArray = Array.from({length: daysInMonth}, (_, i) => {
        const d = new Date(year, month, i + 1);
        return {
            day: i + 1,
            dateStr: d.toISOString().slice(0, 10)
        }
    });

    const placeholders = Array.from({length: firstDayIndex}, (_, i) => i);

    return (
        <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ marginBottom: '16px' }}>Monthly Roadmap & Milestones</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', flex: 1 }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} style={{ fontWeight: 'bold', textAlign: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{d}</div>
                ))}

                {placeholders.map((_, i) => (
                    <div key={`p-${i}`} style={{ background: 'transparent' }} />
                ))}

                {daysArray.map(({day, dateStr}) => {
                    const dayTasks = tasks.filter(t => t.date === dateStr);

                    return (
                        <div key={day} style={{ minHeight: '100px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '8px', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{day}</div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
                                {dayTasks.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => onEdit(task.id)}
                                        style={{
                                            background: task.coverColor || 'var(--color-primary)',
                                            color: '#fff',
                                            padding: '4px 6px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}
                                    >
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
