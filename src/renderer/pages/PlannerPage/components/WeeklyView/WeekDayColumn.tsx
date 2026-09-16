import { useDroppable } from '@dnd-kit/core';
import { PlanningTask } from '../../types/planning.types';
import { PlanningCardCompact } from '../Card/PlanningCardCompact';
import { WeekCapacityBar } from './WeekCapacityBar';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export const WeekDayColumn = ({ date, dayName, tasks, onEdit }: { date: string, dayName: string, tasks: PlanningTask[], onEdit: (id: string) => void }) => {
    const plannedMinutes = tasks.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
    const capacityMinutes = 6 * 60; // 6 hours

    const { setNodeRef } = useDroppable({
        id: date,
        data: { type: 'Column', date }
    });

    return (
        <div style={{ flex: 1, minWidth: '200px', background: 'var(--color-surface)', borderRadius: '8px', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontWeight: 600 }}>{dayName}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{date}</div>
                <WeekCapacityBar plannedMinutes={plannedMinutes} capacityMinutes={capacityMinutes} />
            </div>

            <div ref={setNodeRef} style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map(task => (
                        <PlanningCardCompact key={task.id} task={task} onEdit={() => onEdit(task.id)} isSortable={true} />
                    ))}
                </SortableContext>
            </div>
        </div>
    )
}
