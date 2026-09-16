import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CheckSquare } from 'lucide-react';
import { PlanningTask } from '../../types/planning.types';

export const PlanningCardStandard = ({ task, onEdit, isSortable }: { task: PlanningTask, onEdit: () => void, isSortable?: boolean }) => {
    const totalSub = task.checklist?.length || 0;
    const doneSub = task.checklist?.filter(c => c.done || c.completed).length || 0;

    if (isSortable) {
        const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
            id: task.id,
            data: { type: 'Task', task }
        });

        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
            opacity: isDragging ? 0.5 : 1,
        };

        return (
            <div
                ref={setNodeRef}
                style={{
                    ...style,
                    padding: '12px',
                    background: 'var(--color-bg)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderTop: task.coverColor ? `3px solid ${task.coverColor}` : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    cursor: 'grab',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}
                {...attributes}
                {...listeners}
            >
                <div onClick={onEdit} style={{ fontWeight: 500, fontSize: '14px', cursor: 'pointer' }}>
                    {task.title}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {task.projectId ? (
                        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{task.projectId}</span>
                    ) : <span />}

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {totalSub > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckSquare size={12} /> {doneSub}/{totalSub}</span>}
                        {task.storyPoints ? <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '12px' }}>{task.storyPoints}</span> : null}
                    </div>
                </div>
            </div>
        );
    }

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
                {task.title}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                {task.projectId ? (
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{task.projectId}</span>
                ) : <span />}

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {totalSub > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckSquare size={12} /> {doneSub}/{totalSub}</span>}
                    {task.storyPoints ? <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '12px' }}>{task.storyPoints}</span> : null}
                </div>
            </div>
        </div>
    )
}
