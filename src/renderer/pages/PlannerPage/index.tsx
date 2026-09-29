import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [keyboardToast, setKeyboardToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const editingTask = useMemo(() => tasks.find((t) => t.id === editingTaskId) || null, [tasks, editingTaskId]);

  const showKeyboardToast = (message: string, undo?: () => void) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setKeyboardToast({ message, undo });
    toastTimerRef.current = window.setTimeout(() => setKeyboardToast(null), 4500);
  };

  useEffect(() => () => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, button') || target?.isContentEditable) return;

      const focusedCard = (document.activeElement as HTMLElement | null)?.closest?.('[data-planning-task-id]') as HTMLElement | null;
      const hoveredCard = document.querySelector('[data-planning-task-id]:hover') as HTMLElement | null;
      const activeCard = focusedCard || hoveredCard;
      const taskId = activeCard?.dataset.planningTaskId;

      if (event.key === '?') {
        event.preventDefault();
        showKeyboardToast('Atalhos: D concluir · P prioridade · E/Enter editar · R lembrete · J/K ou setas navegar');
        return;
      }
      if (!taskId) return;
      const task = tasks.find(item => item.id === taskId);
      if (!task) return;

      const key = event.key.toLowerCase();
      if (key === 'j' || key === 'k' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-planning-task-id]'));
        const currentIndex = Math.max(0, cards.indexOf(activeCard));
        const direction = key === 'k' || event.key === 'ArrowUp' ? -1 : 1;
        cards[(currentIndex + direction + cards.length) % cards.length]?.focus();
        return;
      }
      if (key === 'e' || event.key === 'Enter') {
        event.preventDefault();
        setEditingTaskId(task.id);
        return;
      }
      if (key === 'd') {
        event.preventDefault();
        const previousStatus = task.status;
        const previousCompletedAt = task.completedAt;
        const nextStatus = task.status === 'done' ? 'todo' : 'done';
        updateTask(task.id, { status: nextStatus, completedAt: nextStatus === 'done' ? new Date().toISOString() : null });
        showKeyboardToast(nextStatus === 'done' ? 'Tarefa concluída.' : 'Tarefa reaberta.', () => {
          updateTask(task.id, { status: previousStatus, completedAt: previousCompletedAt });
        });
        return;
      }
      if (key === 'p') {
        event.preventDefault();
        const priorities: Array<'P1' | 'P2' | 'P3' | 'P4'> = ['P1', 'P2', 'P3', 'P4'];
        const previousPriority = task.priority;
        const currentIndex = priorities.indexOf(task.priority || 'P3');
        const nextPriority = priorities[(currentIndex + 1) % priorities.length];
        updateTask(task.id, { priority: nextPriority });
        showKeyboardToast(`Prioridade alterada para ${nextPriority}.`, () => updateTask(task.id, { priority: previousPriority }));
        return;
      }
      if (key === 'r') {
        event.preventDefault();
        const previousReminders = task.reminders || [];
        const createdAt = new Date().toISOString();
        const reminder = {
          id: `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          label: 'Lembrete rápido (+30 min)',
          triggerAt: new Date(Date.now() + 30 * 60_000).toISOString(),
          sound: 'gentle-chime' as const,
          channel: 'all' as const,
          hasFired: false,
          createdAt,
        };
        updateTask(task.id, { reminders: [...previousReminders, reminder] });
        showKeyboardToast('Lembrete criado para daqui a 30 minutos.', () => updateTask(task.id, { reminders: previousReminders }));
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [tasks, updateTask]);

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

      {keyboardToast && (
        <div role="status" aria-live="polite" className="fixed bottom-5 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-slate-950/95 px-4 py-2 text-xs font-semibold text-slate-100 shadow-2xl backdrop-blur-xl">
          <span>{keyboardToast.message}</span>
          {keyboardToast.undo && (
            <button type="button" onClick={() => { keyboardToast.undo?.(); setKeyboardToast(null); }} className="rounded-full bg-indigo-500/20 px-2 py-1 text-indigo-200 hover:bg-indigo-500/30">
              Desfazer
            </button>
          )}
        </div>
      )}

    </div>
  );
};

