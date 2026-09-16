import { useState, useMemo } from 'react';
import { DailyView } from './components/DailyView';
import { WeeklyView } from './components/WeeklyView';
import { TaskEditModal } from './components/Modals/TaskEditModal';
import { ReminderAlertModal } from './components/Modals/ReminderAlertModal';
import { usePlanningTasks } from './hooks/usePlanningTasks';
import { usePlanningReminders } from './hooks/usePlanningReminders';
import { PlannerNavbar } from './components/PlannerNavbar';

export type PlannerViewMode = 'weekly' | 'daily';

export const PlannerPage = () => {
  const [viewMode, setViewMode] = useState<PlannerViewMode>('weekly');
  const { tasks, projects, updateTask, addTask, removeTask: _removeTask, moveTask, rescheduleOverdue } = usePlanningTasks();

  // Reminders Daemon
  const { activeAlert, dismissAlert, snoozeAlert } = usePlanningReminders(tasks);

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const editingTask = useMemo(() => tasks.find((t) => t.id === editingTaskId) || null, [tasks, editingTaskId]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        fontFeatureSettings: '"tnum", "cv02"',
      }}
    >
      <PlannerNavbar viewMode={viewMode} setViewMode={setViewMode} />

      {/* Main Content Area */}
      <div style={{ flex: 1, overflow: 'hidden', background: 'var(--color-bg)' }}>
        {viewMode === 'weekly' && (
          <WeeklyView
            tasks={tasks}
            projects={projects}
            onEdit={setEditingTaskId}
            onMoveTask={moveTask}
            onUpdateTask={updateTask}
            onAddTask={addTask}
          />
        )}
        {viewMode === 'daily' && (
          <DailyView
            tasks={tasks}
            projects={projects}
            onEdit={setEditingTaskId}
            onAddTask={addTask}
            onUpdateTask={updateTask}
            onMoveTask={moveTask}
            onRescheduleOverdue={rescheduleOverdue}
            onToggleStatus={(id) => {
              const t = tasks.find((item) => item.id === id);
              if (t) {
                updateTask(id, { status: t.status === 'done' ? 'todo' : 'done' });
              }
            }}
          />
        )}
      </div>

      <TaskEditModal
        isOpen={!!editingTaskId}
        task={editingTask}
        projects={projects}
        onClose={() => setEditingTaskId(null)}
        onSave={(id, updates) => {
          updateTask(id, updates);
          setEditingTaskId(null);
        }}
      />

      <ReminderAlertModal
        isOpen={!!activeAlert}
        message={activeAlert?.message || ''}
        onClose={dismissAlert}
        onSnooze={() => snoozeAlert(15)}
      />
    </div>
  );
};

