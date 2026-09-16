import { useState } from 'react';
import { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';

export const usePlanningDragDrop = (onTaskMove: (taskId: string, targetId: string) => void) => {
    const [activeId, setActiveId] = useState<string | null>(null);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (_event: DragOverEvent) => {
        // Handle visual indicators if needed
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        if (over && active.id !== over.id) {
            onTaskMove(active.id as string, over.id as string);
        }
    };

    return {
        activeId,
        handleDragStart,
        handleDragOver,
        handleDragEnd
    };
};
