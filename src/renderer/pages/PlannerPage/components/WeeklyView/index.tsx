import { DndContext, closestCorners, DragOverlay } from '@dnd-kit/core';
import { PlanningTask } from '../../types/planning.types';
import { WeekDayColumn } from './WeekDayColumn';
import { usePlanningDragDrop } from '../../hooks/usePlanningDragDrop';
import { PlanningCardCompact } from '../Card/PlanningCardCompact';

export const WeeklyView = ({ tasks, onEdit, onMoveTask }: { tasks: PlanningTask[], onEdit: (id: string) => void, onMoveTask?: (taskId: string, targetDate: string) => void }) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const today = new Date();
    const currentDay = today.getDay();
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const startOfWeek = new Date(today.setDate(diff));

    const weekDays = days.map((dayName, idx) => {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + idx);
        return {
            name: dayName,
            dateStr: d.toISOString().slice(0, 10)
        }
    });

    const handleTaskMove = (taskId: string, targetId: string) => {
        if (onMoveTask) {
            onMoveTask(taskId, targetId);
        }
    };

    const { activeId, handleDragStart, handleDragOver, handleDragEnd } = usePlanningDragDrop(handleTaskMove);

    const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

    return (
        <DndContext
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div style={{ display: 'flex', gap: '16px', height: '100%', overflowX: 'auto', padding: '24px' }}>
                {weekDays.map(day => {
                    const dayTasks = tasks.filter(t => t.date === day.dateStr);
                    return (
                        <WeekDayColumn key={day.dateStr} date={day.dateStr} dayName={day.name} tasks={dayTasks} onEdit={onEdit} />
                    )
                })}
            </div>

            <DragOverlay>
                {activeTask ? <PlanningCardCompact task={activeTask} onEdit={() => {}} /> : null}
            </DragOverlay>
        </DndContext>
    )
}
