import { PlanningTask } from '../../types/planning.types';
import { PriorityQueue } from './PriorityQueue';
import { TimeBlockingGrid } from './TimeBlockingGrid';
import { OverdueWarningBanner } from './OverdueWarningBanner';
import { CompletedTodayLog } from './CompletedTodayLog';
import { NaturalLanguageInput } from './NaturalLanguageInput';

interface DailyViewProps {
  tasks: PlanningTask[];
  onEdit: (id: string) => void;
  onAddTask: (task: Partial<PlanningTask>) => void;
  onRescheduleOverdue: () => void;
  onToggleStatus?: (id: string) => void;
}

export const DailyView = ({
  tasks,
  onEdit,
  onAddTask,
  onRescheduleOverdue,
  onToggleStatus,
}: DailyViewProps) => {
  return (
    <div
      className="daily-view"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        padding: '20px 24px',
        maxWidth: '960px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      <OverdueWarningBanner tasks={tasks} onReschedule={onRescheduleOverdue} />
      <NaturalLanguageInput onAdd={onAddTask} />
      <PriorityQueue tasks={tasks} onEdit={onEdit} />
      <TimeBlockingGrid tasks={tasks} onEdit={onEdit} onAddTask={onAddTask} />

      <CompletedTodayLog tasks={tasks} onToggleStatus={onToggleStatus} />
    </div>
  );
};

