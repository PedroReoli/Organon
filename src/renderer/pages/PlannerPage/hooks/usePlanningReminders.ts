import { useEffect, useRef, useState } from 'react';
import { PlanningTask } from '../types/planning.types';

export const usePlanningReminders = (tasks: PlanningTask[]) => {
    const firedRef = useRef<Set<string>>(new Set());
    const [activeAlert, setActiveAlert] = useState<{ message: string, taskId: string } | null>(null);

    useEffect(() => {
        // Request OS Notification permission
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            void Notification.requestPermission().catch(() => {});
        }

        const interval = setInterval(() => {
            const now = new Date();
            const nowMs = now.getTime();

            tasks.forEach(task => {
                if (task.reminder && !task.reminder.hasFired) {
                    const triggerTime = new Date(task.reminder.triggerAt).getTime();

                    if (triggerTime <= nowMs) {
                        const key = `${task.id}-${task.reminder.triggerAt}`;
                        if (firedRef.current.has(key)) return;

                        firedRef.current.add(key);

                        // Native OS Notification
                        try {
                            new Notification(`Reminder: ${task.title}`, {
                                body: `Scheduled for now.`
                            });
                        } catch { /* ignore */ }

                        // In-app floating alert
                        setActiveAlert({
                            message: `Task "${task.title}" is due!`,
                            taskId: task.id
                        });
                    }
                }
            });
        }, 10000); // Check every 10s

        return () => clearInterval(interval);
    }, [tasks]);

    const dismissAlert = () => setActiveAlert(null);

    const snoozeAlert = (_minutes: number) => {
        if (!activeAlert) return;
        // Here you would dispatch an update to the task's reminder snoozedUntil value
        // via usePlanningTasks.
        setActiveAlert(null);
    }

    return { activeAlert, dismissAlert, snoozeAlert };
}
