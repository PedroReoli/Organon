import { useState, useMemo } from 'react';
import { DailyView } from './components/DailyView';
import { WeeklyView } from './components/WeeklyView';
import { MonthlyView } from './components/MonthlyView';
import { SprintBacklogView } from './components/SprintBacklogView';
import { TaskEditModal } from './components/Modals/TaskEditModal';
import { ReminderAlertModal } from './components/Modals/ReminderAlertModal';
import { usePlanningTasks } from './hooks/usePlanningTasks';
import { usePlanningSprints } from './hooks/usePlanningSprints';

export type PlannerViewMode = 'daily' | 'weekly' | 'monthly' | 'sprint';

export const PlannerPage = () => {
    const [viewMode, setViewMode] = useState<PlannerViewMode>('daily');
    const { tasks, updateTask } = usePlanningTasks();
    const { sprints, activeSprint } = usePlanningSprints();

    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const editingTask = useMemo(() => tasks.find(t => t.id === editingTaskId) || null, [tasks, editingTaskId]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
            {/* 4-Horizon Navigation Bar */}
            <div style={{ display: 'flex', padding: '16px 24px', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <button
                    onClick={() => setViewMode('daily')}
                    style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: viewMode === 'daily' ? 'var(--color-primary)' : 'transparent', color: 'white' }}>
                    ☀️ Daily Focus
                </button>
                <button
                    onClick={() => setViewMode('weekly')}
                    style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: viewMode === 'weekly' ? 'var(--color-primary)' : 'transparent', color: 'white' }}>
                    🗓️ Weekly Horizon
                </button>
                <button
                    onClick={() => setViewMode('monthly')}
                    style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: viewMode === 'monthly' ? 'var(--color-primary)' : 'transparent', color: 'white' }}>
                    📅 Monthly & Roadmap
                </button>
                <button
                    onClick={() => setViewMode('sprint')}
                    style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: viewMode === 'sprint' ? 'var(--color-primary)' : 'transparent', color: 'white' }}>
                    📦 Backlog & Sprints
                </button>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {viewMode === 'daily' && <DailyView tasks={tasks} onEdit={setEditingTaskId} />}
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

            <ReminderAlertModal isOpen={false} message="" onClose={() => {}} />
        </div>
    )
}
