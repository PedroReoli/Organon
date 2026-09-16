import { DndContext, closestCorners, DragOverlay } from '@dnd-kit/core';
import { PlanningTask, PlanningSprint } from '../../types/planning.types';
import { SprintHeader } from './SprintHeader';
import { SprintKanbanColumn } from './SprintKanbanColumn';
import { BacklogBucket } from './BacklogBucket';
import { usePlanningDragDrop } from '../../hooks/usePlanningDragDrop';
import { PlanningCardStandard } from '../Card/PlanningCardStandard';

export const SprintBacklogView = ({ sprint, tasks, onEdit, onMoveTask }: { sprint?: PlanningSprint, tasks: PlanningTask[], onEdit: (id: string) => void, onMoveTask?: (taskId: string, newStatus: string) => void }) => {
    const columns = [
        { id: 'todo', title: 'To Do' },
        { id: 'in_progress', title: 'In Progress' },
        { id: 'review', title: 'Review' },
        { id: 'done', title: 'Done' }
    ];

    const backlogTasks = tasks.filter(t => !t.sprintId && t.status === 'todo');
    const sprintTasks = sprint ? tasks.filter(t => t.sprintId === sprint.id || (t.status !== 'done' && t.status !== 'cancelled' && !t.sprintId)) : [];

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
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <SprintHeader sprint={sprint} tasks={tasks} />

                <div style={{ display: 'flex', gap: '16px', padding: '24px', overflowX: 'auto', flex: 1 }}>
                    {columns.map(col => (
                        <SprintKanbanColumn
                            key={col.id}
                            id={col.id}
                            title={col.title}
                            tasks={sprintTasks.filter(t => t.status === col.id)}
                            onEdit={onEdit}
                        />
                    ))}
                </div>

                <BacklogBucket tasks={backlogTasks} onEdit={onEdit} />
            </div>

            <DragOverlay>
                {activeTask ? <PlanningCardStandard task={activeTask} onEdit={() => {}} /> : null}
            </DragOverlay>
        </DndContext>
    )
}
