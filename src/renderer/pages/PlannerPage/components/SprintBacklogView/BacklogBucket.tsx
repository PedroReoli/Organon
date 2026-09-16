import { Inbox, ChevronDown, ChevronUp } from 'lucide-react';
import { PlanningTask } from '../../types/planning.types';
import { PlanningCardStandard } from '../Card/PlanningCardStandard';
import { useState } from 'react';

export const BacklogBucket = ({ tasks, onEdit }: { tasks: PlanningTask[], onEdit: (id: string) => void }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

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
                <div style={{ marginTop: '16px', display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {tasks.map(task => (
                        <div key={task.id} style={{ minWidth: '250px' }}>
                            <PlanningCardStandard task={task} onEdit={() => onEdit(task.id)} />
                        </div>
                    ))}
                    {tasks.length === 0 && <div style={{ color: 'var(--color-text-muted)' }}>Backlog is empty.</div>}
                </div>
            )}
        </div>
    )
}
