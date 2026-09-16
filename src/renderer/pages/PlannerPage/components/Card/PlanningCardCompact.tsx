import { PlanningTask } from '../../types/planning.types';

export const PlanningCardCompact = ({ task, onEdit }: { task: PlanningTask, onEdit: () => void }) => {
    return (
        <div
            onClick={onEdit}
            style={{
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 8px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                gap: '8px'
            }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: task.priority === 'urgent' ? 'var(--color-danger)' : 'var(--color-primary)' }} />
            <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.iconEmoji} {task.title}</span>
            {task.projectId && <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{task.projectId}</span>}
            {task.time && <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{task.time}</span>}
        </div>
    )
}
