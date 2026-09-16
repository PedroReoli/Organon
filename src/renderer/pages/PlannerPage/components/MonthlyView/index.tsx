import { PlanningTask } from '../../types/planning.types';
import { MonthMilestoneGrid } from './MonthMilestoneGrid';

export const MonthlyView = ({ tasks, onEdit }: { tasks: PlanningTask[], onEdit: (id: string) => void }) => {
    return <MonthMilestoneGrid tasks={tasks} onEdit={onEdit} />;
}
