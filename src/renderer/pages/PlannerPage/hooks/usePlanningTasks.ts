import { useState, useEffect, useCallback } from 'react';
import { PlanningTask } from '../types/planning.types';
import { useStore } from '../../shared/hooks';
import { listenForCliSync } from '../cli/planningCliBridge';

export const usePlanningTasks = () => {
  const { cards: globalTasks, updateStore } = useStore();
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
      const newTask: PlanningTask = {
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
        ...taskData,
      };

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
    (taskId: string, targetLocation: string | { day: string | null; period: string | null }, targetDate?: string | null) => {
      setTasks((prev) => {
        const newTasks = prev.map((t) => {
          if (t.id !== taskId) return t;
          
          if (targetLocation === 'backlog' || (typeof targetLocation === 'object' && targetLocation.day === null)) {
            return {
              ...t,
              location: { day: null, period: null },
              hasDate: false,
              date: null,
              time: null,
              updatedAt: new Date().toISOString(),
            };
          }

          if (typeof targetLocation === 'string' && targetLocation.startsWith('cell:')) {
            const [, day, period] = targetLocation.split(':');
            return {
              ...t,
              location: { day: day as any, period: period as any },
              date: targetDate || t.date,
              hasDate: !!(targetDate || t.date),
              updatedAt: new Date().toISOString(),
            };
          }

          if (typeof targetLocation === 'object') {
            return {
              ...t,
              location: { day: targetLocation.day as any, period: targetLocation.period as any },
              date: targetDate !== undefined ? targetDate : t.date,
              hasDate: targetDate !== undefined ? !!targetDate : t.hasDate,
              updatedAt: new Date().toISOString(),
            };
          }

          // Fallback se for apenas data string YYYY-MM-DD
          return {
            ...t,
            date: targetLocation as string,
            hasDate: true,
            updatedAt: new Date().toISOString(),
          };
        });

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
    updateTask,
    addTask,
    removeTask,
    moveTask,
    rescheduleOverdue,
  };
};
