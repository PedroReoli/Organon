import { PlanningTask } from '../../types/planning.types';
import { MonthMilestoneGrid } from './MonthMilestoneGrid';
import { usePlanningSprints } from '../../hooks/usePlanningSprints';

export const MonthlyView = ({ tasks, onEdit }: { tasks: PlanningTask[], onEdit: (id: string) => void }) => {
    const { sprints } = usePlanningSprints();
    return <MonthMilestoneGrid tasks={tasks} sprints={sprints} onEdit={onEdit} />;
}
