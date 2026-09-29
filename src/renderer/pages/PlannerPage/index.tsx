import { useState, useMemo } from 'react';
import { DailyView } from './components/DailyView';
import { WeeklyView } from './components/WeeklyView';
import { ContinuousWeeklyView } from './components/ContinuousWeeklyView';
import { TaskEditModal } from './components/Modals/TaskEditModal';
import { usePlanningTasks } from './hooks/usePlanningTasks';
import { PlannerNavbar } from './components/PlannerNavbar';

export type PlannerViewMode = 'matrix' | 'continuous' | 'daily';

export const PlannerPage = () => {
  const [viewMode, setViewMode] = useState<PlannerViewMode>('matrix');
  const { tasks, projects, updateTask, addTask, removeTask, moveTask, rescheduleOverdue } = usePlanningTasks();

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
        {viewMode === 'matrix' && (
          <div key="matrix" className="view-tab-enter" style={{ height: '100%', width: '100%' }}>
            <WeeklyView
              tasks={tasks}
              projects={projects}
              onEdit={setEditingTaskId}
              onMoveTask={moveTask}
              onUpdateTask={updateTask}
              onAddTask={addTask}
            />
          </div>
        )}
        {viewMode === 'continuous' && (
          <div key="continuous" className="view-tab-enter" style={{ height: '100%', width: '100%' }}>
            <ContinuousWeeklyView
              tasks={tasks}
              projects={projects}
              onEdit={setEditingTaskId}
              onMoveTask={moveTask}
              onAddTask={addTask}
              onUpdateTask={updateTask}
            />
          </div>
        )}
        {viewMode === 'daily' && (
          <div key="daily" className="view-tab-enter" style={{ height: '100%', width: '100%' }}>
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
          </div>
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
        onDelete={(id) => {
          removeTask(id);
          setEditingTaskId(null);
        }}
        onDuplicate={(t) => {
          addTask({
            title: `${t.title} (Cópia)`,
            description: t.description,
            descriptionHtml: t.descriptionHtml,
            status: t.status,
            priority: t.priority,
            projectId: t.projectId,
            time: t.time,
            date: t.date,
            hasDate: t.hasDate,
            storyPoints: t.storyPoints,
            durationMinutes: t.durationMinutes,
            checklist: t.checklist?.map((item) => ({
              ...item,
              id: `check-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            })),
            tags: t.tags ? [...t.tags] : [],
            reminders: (t.reminders || []).map((reminder) => ({
              ...reminder,
              id: `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            })),
            location: t.location,
          });
          setEditingTaskId(null);
        }}
      />

    </div>
  );
};

