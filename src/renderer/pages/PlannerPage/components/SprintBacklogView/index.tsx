import { PlanningTask, PlanningSprint } from '../../types/planning.types';
import { SprintHeader } from './SprintHeader';
import { SprintKanbanColumn } from './SprintKanbanColumn';

export const SprintBacklogView = ({ sprint, tasks, onEdit }: { sprint?: PlanningSprint, tasks: PlanningTask[], onEdit: (id: string) => void }) => {
    const columns = [
        { id: 'todo', title: 'To Do' },
        { id: 'in_progress', title: 'In Progress' },
        { id: 'review', title: 'Review' },
        { id: 'done', title: 'Done' }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <SprintHeader sprint={sprint} />
            <div style={{ display: 'flex', gap: '16px', padding: '24px', overflowX: 'auto', flex: 1 }}>
                {columns.map(col => (
                    <SprintKanbanColumn
                        key={col.id}
                        title={col.title}
                        tasks={tasks.filter(t => t.status === col.id)}
                        onEdit={onEdit}
                    />
                ))}
            </div>
        </div>
    )
}
