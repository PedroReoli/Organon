import { PlanningTask } from '../../types/planning.types';
import { PriorityQueue } from './PriorityQueue';
import { TimeBlockingGrid } from './TimeBlockingGrid';

export const DailyView = ({ tasks, onEdit }: { tasks: PlanningTask[], onEdit: (id: string) => void }) => {
    return (
        <div className="daily-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', padding: '24px' }}>
            <PriorityQueue tasks={tasks} onEdit={onEdit} />
            <TimeBlockingGrid tasks={tasks} onEdit={onEdit} />
        </div>
    )
}
