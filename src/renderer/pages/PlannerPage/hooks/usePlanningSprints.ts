import { useState, useEffect } from 'react';
import { PlanningSprint } from '../types/planning.types';

export const usePlanningSprints = () => {
    const [sprints, setSprints] = useState<PlanningSprint[]>([]);

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.loadStore().then(store => {
                setSprints((store.projectSprints as unknown as PlanningSprint[]) || []);
            });
        }
    }, []);

    const activeSprint = sprints.find(s => s.status === 'active') || sprints[0]; // fallback to first for demo

    return { sprints, activeSprint };
}
