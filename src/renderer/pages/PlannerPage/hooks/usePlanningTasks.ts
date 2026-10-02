import { useState, useEffect, useCallback } from 'react';
import { PlanningTask } from '../types/planning.types';
import { useStore } from '../../shared/hooks';
import { listenForCliSync } from '../cli/planningCliBridge';
import { normalizeCard } from '../../../utils/factories';

export const usePlanningTasks = () => {
  const { cards: globalTasks, projects, updateStore } = useStore();
  const [tasks, setTasks] = useState<PlanningTask[]>((globalTasks as unknown as PlanningTask[]) || []);

  // Fallback sync listener
  useEffect(() => {
    const cleanup = listenForCliSync(() => {
      if (window.electronAPI) {
        window.electronAPI.loadStore().then((store) => {
          setTasks((store.cards as unknown as PlanningTask[]) || []);
          updateStore((prev: any) => ({ ...prev, cards: store.cards }));
        });
      }
    });
    return cleanup;
  }, [updateStore]);

  useEffect(() => {
    setTasks((globalTasks as unknown as PlanningTask[]) || []);
  }, [globalTasks]);

  const updateTask = useCallback(
    (id: string, updates: Partial<PlanningTask>) => {
      setTasks((prev) => {
        const newTasks = prev.map((t) => (t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
        updateStore((p: any) => ({ ...p, cards: newTasks }));
        return newTasks;
      });
    },
    [updateStore]
  );

  const addTask = useCallback(
    (taskData: Partial<PlanningTask>) => {
      const draftTask: PlanningTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        title: taskData.title || 'Nova tarefa',
        descriptionHtml: taskData.descriptionHtml || '',
        description: taskData.description || '',
        location: taskData.location || { day: null, period: null },
        order: taskData.order || Date.now(),
        status: taskData.status || 'todo',
        priority: taskData.priority || 'P3',
        date: taskData.date || new Date().toISOString().slice(0, 10),
        time: taskData.time || null,
        hasDate: taskData.hasDate ?? true,
        isLocked: taskData.isLocked ?? false,
        checklist: taskData.checklist || [],
        projectId: taskData.projectId || null,
        tags: taskData.tags || [],
        durationMinutes: taskData.durationMinutes || 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reminders: [],
        ...taskData,
      };
      const newTask = normalizeCard(draftTask) as PlanningTask;

      setTasks((prev) => {
        const newTasks = [newTask, ...prev];
        updateStore((p: any) => ({ ...p, cards: newTasks }));
        return newTasks;
      });

      return newTask;
    },
    [updateStore]
  );

  const removeTask = useCallback(
    (id: string) => {
      setTasks((prev) => {
        const newTasks = prev.filter((t) => t.id !== id);
        updateStore((p: any) => ({ ...p, cards: newTasks }));
        return newTasks;
      });
    },
    [updateStore]
  );

  const moveTask = useCallback(
    (
      taskId: string,
      targetLocation: string | { day: string | null; period: string | null },
      targetDate?: string | null,
      targetTaskId?: string,
    ) => {
      setTasks((prev) => {
        const sourceTask = prev.find((task) => task.id === taskId);
        if (!sourceTask) return prev;
        const updatedAt = new Date().toISOString();

        const movedTask = (() => {
          if (targetLocation === 'backlog' || (typeof targetLocation === 'object' && targetLocation.day === null)) {
            return {
              ...sourceTask,
              location: { day: null, period: null },
              hasDate: false,
              date: null,
              time: null,
              updatedAt,
            };
          }

          if (typeof targetLocation === 'string' && targetLocation.startsWith('cell:')) {
            const [, day, period] = targetLocation.split(':');
            return {
              ...sourceTask,
              location: { day: day as any, period: period as any },
              date: targetDate || sourceTask.date,
              hasDate: !!(targetDate || sourceTask.date),
              updatedAt,
            };
          }

          if (typeof targetLocation === 'object') {
            return {
              ...sourceTask,
              location: { day: targetLocation.day as any, period: targetLocation.period as any },
              date: targetDate !== undefined ? targetDate : sourceTask.date,
              hasDate: targetDate !== undefined ? !!targetDate : sourceTask.hasDate,
              updatedAt,
            };
          }

          return {
            ...sourceTask,
            date: targetLocation as string,
            hasDate: true,
            updatedAt,
          };
        })();

        const remaining = prev.filter((task) => task.id !== taskId);
        let insertionIndex = targetTaskId
          ? remaining.findIndex((task) => task.id === targetTaskId)
          : -1;

        if (insertionIndex < 0) {
          const lastTargetIndex = remaining.reduce((lastIndex, task, index) => {
            const isBacklogTarget = targetLocation === 'backlog'
              || (typeof targetLocation === 'object' && targetLocation.day === null);
            const matches = isBacklogTarget
              ? !task.hasDate || !task.date || task.location?.day === null
              : typeof targetLocation === 'object'
                ? task.date === (targetDate !== undefined ? targetDate : movedTask.date)
                  && task.location?.day === targetLocation.day
                  && task.location?.period === targetLocation.period
                : false;
            return matches ? index : lastIndex;
          }, -1);
          insertionIndex = lastTargetIndex >= 0 ? lastTargetIndex + 1 : remaining.length;
        }

        const reordered = [...remaining];
        reordered.splice(insertionIndex, 0, movedTask);
        const newTasks = reordered.map((task, index) => (
          task.order === index ? task : { ...task, order: index }
        ));

        updateStore((p: any) => ({ ...p, cards: newTasks }));
        return newTasks;
      });
    },
    [updateStore]
  );

  const rescheduleOverdue = useCallback(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setTasks((prev) => {
      const newTasks = prev.map((t) => {
        if (t.hasDate && t.date && t.date < todayStr && t.status !== 'done' && t.status !== 'cancelled') {
          return { ...t, date: todayStr, updatedAt: new Date().toISOString() };
        }
        return t;
      });
      updateStore((p: any) => ({ ...p, cards: newTasks }));
      return newTasks;
    });
  }, [updateStore]);

  return {
    tasks,
    projects: projects || [],
    updateTask,
    addTask,
    removeTask,
    moveTask,
    rescheduleOverdue,
  };
};
