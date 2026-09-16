import { useState } from 'react';
import { PlanningTask, PlanningSprint } from '../../types/planning.types';

export const MonthMilestoneGrid = ({ tasks, sprints, onEdit }: { tasks: PlanningTask[], sprints: PlanningSprint[], onEdit: (id: string) => void }) => {
    const [selectedProject, setSelectedProject] = useState<string | null>(null);

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

    // Extract all unique projects for filtering
    const allProjects = Array.from(new Set(tasks.map(t => t.projectId).filter(Boolean))) as string[];

    const filteredTasks = selectedProject ? tasks.filter(t => t.projectId === selectedProject) : tasks;

    return (
        <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3>Monthly Roadmap & Milestones</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', alignSelf: 'center' }}>Filter by Project:</span>
                    <select
                        value={selectedProject || ''}
                        onChange={(e) => setSelectedProject(e.target.value || null)}
                        style={{ padding: '4px 8px', background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', fontSize: '12px' }}
                    >
                        <option value="">All Projects</option>
                        {allProjects.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', flex: 1, position: 'relative' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} style={{ fontWeight: 'bold', textAlign: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '13px' }}>{d}</div>
                ))}

                {placeholders.map((_, i) => (
                    <div key={`p-${i}`} style={{ background: 'transparent' }} />
                ))}

                {daysArray.map(({day, dateStr}) => {
                    const dayTasks = filteredTasks.filter(t => t.date === dateStr);
                    const isToday = dateStr === today.toISOString().slice(0, 10);

                    return (
                        <div key={day} style={{
                            minHeight: '100px',
                            border: isToday ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '4px',
                            padding: '8px',
                            background: 'var(--color-surface)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)'
                        }}>
                            <div style={{ color: isToday ? 'var(--color-primary)' : 'var(--color-text-muted)', fontSize: '12px', fontWeight: isToday ? 'bold' : 'normal' }}>{day}</div>

                            {/* Render continuous sprint bars (naive implementation for current day if it falls within sprint) */}
                            {sprints.filter(s => s.startDate <= dateStr && s.endDate >= dateStr && (!selectedProject || (s.projectIds || []).includes(selectedProject))).map(sprint => (
                                <div key={sprint.id} style={{
                                    background: 'rgba(16, 185, 129, 0.15)', // Emerald tint
                                    color: '#10b981',
                                    padding: '2px 4px',
                                    borderRadius: '2px',
                                    fontSize: '10px',
                                    borderLeft: '2px solid #10b981',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {sprint.startDate === dateStr ? `Sprint: ${sprint.name}` : '\u00A0'}
                                </div>
                            ))}

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', marginTop: '4px' }}>
                                {dayTasks.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => onEdit(task.id)}
                                        style={{
                                            background: task.coverColor || 'rgba(255,255,255,0.05)',
                                            color: '#fff',
                                            padding: '4px 6px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}
                                    >
                                        {task.iconEmoji} {task.title}
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
