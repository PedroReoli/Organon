import { useState, useEffect, useCallback } from 'react';
import { PlanningSprint } from '../types/planning.types';
import { useStore } from '../../shared/hooks';
import { Store } from '../../../../main/types';

export const usePlanningSprints = () => {
    const { updateStore } = useStore();
    const [sprints, setSprints] = useState<PlanningSprint[]>([]);

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.loadStore().then(store => {
                setSprints(store.projectSprints as PlanningSprint[] || []);
            });
        }
    }, []);

    const activeSprint = sprints.find(s => s.status === 'active') || sprints[0]; // fallback to first for demo

    return { sprints, activeSprint };
}
