import { useState, useMemo } from 'react';
import { DailyView } from './components/DailyView';
import { WeeklyView } from './components/WeeklyView';
import { MonthlyView } from './components/MonthlyView';
import { SprintBacklogView } from './components/SprintBacklogView';
import { TaskEditModal } from './components/Modals/TaskEditModal';
import { ReminderAlertModal } from './components/Modals/ReminderAlertModal';
import { usePlanningTasks } from './hooks/usePlanningTasks';
import { usePlanningSprints } from './hooks/usePlanningSprints';
import { usePlanningReminders } from './hooks/usePlanningReminders';
import { PlannerNavbar } from './components/PlannerNavbar';

export type PlannerViewMode = 'daily' | 'weekly' | 'monthly' | 'sprint';

export const PlannerPage = () => {
    const [viewMode, setViewMode] = useState<PlannerViewMode>('daily');
    const { tasks, updateTask } = usePlanningTasks();
    const { sprints, activeSprint } = usePlanningSprints();

    // Reminders Daemon
    const { activeAlert, dismissAlert, snoozeAlert } = usePlanningReminders(tasks);

    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const editingTask = useMemo(() => tasks.find(t => t.id === editingTaskId) || null, [tasks, editingTaskId]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', fontFeatureSettings: '"tnum", "cv02"' }}>
            <PlannerNavbar viewMode={viewMode} setViewMode={setViewMode} />

            {/* Main Content Area */}
            <div style={{ flex: 1, overflow: 'hidden', background: 'var(--color-bg)' }}>
                {viewMode === 'daily' && <DailyView tasks={tasks} onEdit={setEditingTaskId} onAddTask={(task) => {}} onRescheduleOverdue={() => {}} />}
                {viewMode === 'weekly' && <WeeklyView tasks={tasks} onEdit={setEditingTaskId} />}
                {viewMode === 'monthly' && <MonthlyView tasks={tasks} onEdit={setEditingTaskId} />}
                {viewMode === 'sprint' && <SprintBacklogView tasks={tasks} sprint={activeSprint} onEdit={setEditingTaskId} />}
            </div>

            <TaskEditModal
                isOpen={!!editingTaskId}
                task={editingTask}
                onClose={() => setEditingTaskId(null)}
                onSave={(id, updates) => { updateTask(id, updates); setEditingTaskId(null); }}
            />

            <ReminderAlertModal
                isOpen={!!activeAlert}
                message={activeAlert?.message || ''}
                onClose={dismissAlert}
                onSnooze={() => snoozeAlert(15)}
            />
        </div>
    )
}
