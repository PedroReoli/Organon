import { Calendar, Star } from 'lucide-react';
import { PlanningTask } from '../../types/planning.types';

export const PlanningCardExpanded = ({ task, onEdit }: { task: PlanningTask, onEdit: () => void }) => {
    const totalSub = task.checklist?.length || 0;
    const doneSub = task.checklist?.filter(c => c.done || c.completed).length || 0;
    const progress = totalSub > 0 ? (doneSub / totalSub) * 100 : 0;

    return (
        <div
            onClick={onEdit}
            style={{
                padding: '16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderTop: task.coverColor ? `4px solid ${task.coverColor}` : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 600, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {task.title}
                </div>
                {task.priority && (
                    <span style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: task.priority === 'P1' ? 'var(--color-danger)' : 'rgba(255,255,255,0.1)',
                        textTransform: 'uppercase',
                        fontWeight: 'bold'
                    }}>
                        {task.priority}
                    </span>
                )}
            </div>

            {task.description && (
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                    {task.description.substring(0, 120)}{task.description.length > 120 ? '...' : ''}
                </div>
            )}

            {totalSub > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        <span>Checklist</span>
                        <span>{doneSub}/{totalSub}</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '2px' }} />
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--color-text-muted)', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {task.projectId ? <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{task.projectId}</span> : null}
                    {task.tags?.map(t => <span key={t}>#{t}</span>)}
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {task.date && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Calendar size={12} /> {task.date}</span>}
                    {task.storyPoints ? <span style={{ fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Star size={12} fill="#f59e0b" color="#f59e0b" /> {task.storyPoints}</span> : null}
                </div>
            </div>
        </div>
    )
}
