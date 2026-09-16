import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PlanningTask } from '../../types/planning.types';
import { PlanningCardStandard } from '../Card/PlanningCardStandard';

export const SprintKanbanColumn = ({ id, title, tasks, onEdit }: { id: string, title: string, tasks: PlanningTask[], onEdit: (id: string) => void }) => {

    const { setNodeRef } = useDroppable({
        id: id,
        data: { type: 'Column', status: id }
    });

    return (
        <div style={{ flex: 1, minWidth: '280px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                {title}
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>{tasks.length}</span>
            </div>
            <div ref={setNodeRef} style={{ padding: '8px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map(task => (
                        <PlanningCardStandard key={task.id} task={task} onEdit={() => onEdit(task.id)} isSortable={true} />
                    ))}
                </SortableContext>
            </div>
        </div>
    )
}
