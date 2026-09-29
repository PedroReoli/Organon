import { Inbox, ChevronDown, ChevronUp } from 'lucide-react';
import { PlanningTask } from '../../types/planning.types';
import { PlanningCardStandard } from '../Card/PlanningCardStandard';
import { useEffect, useMemo, useRef, useState } from 'react';
import { computeVirtualWindow } from '../../../../utils/virtualWindow';

const BACKLOG_VIRTUAL_THRESHOLD = 100;
const BACKLOG_CARD_WIDTH = 266;

export const BacklogBucket = ({ tasks, onEdit }: { tasks: PlanningTask[], onEdit: (id: string) => void }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [viewportWidth, setViewportWidth] = useState(1000);
    const listRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const element = listRef.current;
        if (!element) return;
        const observer = new ResizeObserver(entries => setViewportWidth(entries[0]?.contentRect.width || 1000));
        observer.observe(element);
        return () => observer.disconnect();
    }, [isCollapsed]);

    const virtualWindow = useMemo(() => computeVirtualWindow({
        itemCount: tasks.length,
        scrollOffset: scrollLeft,
        viewportSize: viewportWidth,
        itemSize: BACKLOG_CARD_WIDTH,
        threshold: BACKLOG_VIRTUAL_THRESHOLD,
        overscan: 4,
    }), [tasks.length, scrollLeft, viewportWidth]);
    const visibleTasks = virtualWindow.virtualized ? tasks.slice(virtualWindow.start, virtualWindow.end) : tasks;

    return (
        <div style={{ padding: '24px', background: 'var(--color-surface)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div
                onClick={() => setIsCollapsed(!isCollapsed)}
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}
            >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Inbox size={16} /> Icebox / Backlog
                </span>
                <span>{isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</span>
            </div>

            {!isCollapsed && (
                <div
                    ref={listRef}
                    role="list"
                    aria-label="Tarefas do backlog"
                    onScroll={event => setScrollLeft(event.currentTarget.scrollLeft)}
                    style={{ marginTop: '16px', display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}
                >
                    {virtualWindow.before > 0 && <div aria-hidden="true" style={{ width: virtualWindow.before, flexShrink: 0 }} />}
                    {visibleTasks.map((task, visibleIndex) => (
                        <div
                            key={task.id}
                            role="listitem"
                            aria-posinset={virtualWindow.start + visibleIndex + 1}
                            aria-setsize={tasks.length}
                            style={{ minWidth: '250px' }}
                        >
                            <PlanningCardStandard task={task} onEdit={() => onEdit(task.id)} />
                        </div>
                    ))}
                    {virtualWindow.after > 0 && <div aria-hidden="true" style={{ width: virtualWindow.after, flexShrink: 0 }} />}
                    {tasks.length === 0 && <div style={{ color: 'var(--color-text-muted)' }}>Backlog is empty.</div>}
                </div>
            )}
        </div>
    )
}
