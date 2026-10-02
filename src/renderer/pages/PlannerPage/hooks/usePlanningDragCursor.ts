import { useEffect } from 'react'

export function usePlanningDragCursor(isDragging: boolean) {
  useEffect(() => {
    if (!isDragging) return
    document.body.classList.add('planner-dnd-active')
    return () => document.body.classList.remove('planner-dnd-active')
  }, [isDragging])
}
