import { useEffect } from 'react';
import { PlanningTask } from '../types/planning.types';

export const usePlanningReminders = (tasks: PlanningTask[]) => {
    // Daemon to check reminders
    useEffect(() => {
        const interval = setInterval(() => {
            // Check logic
        }, 60000);
        return () => clearInterval(interval);
    }, [tasks]);
}
