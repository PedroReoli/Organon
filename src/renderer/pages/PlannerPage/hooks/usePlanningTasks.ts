import { useState, useEffect, useCallback, useRef } from 'react';
import { PlanningTask } from '../types/planning.types';
import { useStore } from '../../shared/hooks';
import { listenForCliSync } from '../cli/planningCliBridge';

export const usePlanningTasks = () => {
    const { cards: globalTasks, updateStore } = useStore();
    const [tasks, setTasks] = useState<PlanningTask[]>(globalTasks as PlanningTask[]);

    // Fallback sync listener
    useEffect(() => {
        const cleanup = listenForCliSync(() => {
            // Re-load tasks from electron API if store changed via CLI
            if (window.electronAPI) {
                window.electronAPI.loadStore().then(store => {
                    setTasks(store.cards as PlanningTask[]);
                    updateStore({ cards: store.cards });
                });
            }
        });
        return cleanup;
    }, [updateStore]);

    useEffect(() => {
        setTasks(globalTasks as PlanningTask[]);
    }, [globalTasks]);

    const updateTask = useCallback((id: string, updates: Partial<PlanningTask>) => {
        // Dual buffer memory update
        setTasks(prev => {
            const newTasks = prev.map(t => t.id === id ? { ...t, ...updates } : t);
            // debounced write to store logic handled globally by useStore/electron IPC usually
            updateStore({ cards: newTasks });
            return newTasks;
        });
    }, [updateStore]);

    return { tasks, updateTask };
}
