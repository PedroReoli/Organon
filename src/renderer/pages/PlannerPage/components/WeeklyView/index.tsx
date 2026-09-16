import { PlanningTask } from '../../types/planning.types';
import { WeekDayColumn } from './WeekDayColumn';

export const WeeklyView = ({ tasks, onEdit }: { tasks: PlanningTask[], onEdit: (id: string) => void }) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const today = new Date();
    const currentDay = today.getDay();
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // adjust when day is sunday
    const startOfWeek = new Date(today.setDate(diff));

    const weekDays = days.map((dayName, idx) => {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + idx);
        return {
            name: dayName,
            dateStr: d.toISOString().slice(0, 10)
        }
    });

    return (
        <div className="weekly-view" style={{ display: 'flex', gap: '16px', height: '100%', overflowX: 'auto', padding: '24px' }}>
            {weekDays.map(day => {
                const dayTasks = tasks.filter(t => t.date === day.dateStr);
                return (
                    <WeekDayColumn key={day.dateStr} date={day.dateStr} dayName={day.name} tasks={dayTasks} onEdit={onEdit} />
                )
            })}
        </div>
    )
}
