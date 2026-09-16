import { PlanningTask } from '../../types/planning.types';
import { PriorityQueue } from './PriorityQueue';
import { TimeBlockingGrid } from './TimeBlockingGrid';
import { OverdueWarningBanner } from './OverdueWarningBanner';
import { CompletedTodayLog } from './CompletedTodayLog';
import { NaturalLanguageInput } from './NaturalLanguageInput';

export const DailyView = ({ tasks, onEdit, onAddTask, onRescheduleOverdue }: { tasks: PlanningTask[], onEdit: (id: string) => void, onAddTask: (task: Partial<PlanningTask>) => void, onRescheduleOverdue: () => void }) => {
    return (
        <div className="daily-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', padding: '24px' }}>
            <OverdueWarningBanner tasks={tasks} onReschedule={onRescheduleOverdue} />
            <NaturalLanguageInput onAdd={onAddTask} />
            <PriorityQueue tasks={tasks} onEdit={onEdit} />
            <TimeBlockingGrid tasks={tasks} onEdit={onEdit} />
            <CompletedTodayLog tasks={tasks} />
        </div>
    )
}
