import { PlanningTask } from '../../types/planning.types';

export const PlanningCardStandard = ({ task, onEdit }: { task: PlanningTask, onEdit: () => void }) => {
    const totalSub = task.checklist?.length || 0;
    const doneSub = task.checklist?.filter(c => c.completed).length || 0;

    return (
        <div
            onClick={onEdit}
            style={{
                padding: '12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderTop: task.coverColor ? `3px solid ${task.coverColor}` : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
            <div style={{ fontWeight: 500, fontSize: '14px' }}>
                {task.iconEmoji && <span style={{ marginRight: '6px' }}>{task.iconEmoji}</span>}
                {task.title}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {task.projectId ? (
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{task.projectId}</span>
                ) : <span />}

                <div style={{ display: 'flex', gap: '8px' }}>
                    {totalSub > 0 && <span>☑ {doneSub}/{totalSub}</span>}
                    {task.date && <span>📅 {task.date}</span>}
                </div>
            </div>
        </div>
    )
}
