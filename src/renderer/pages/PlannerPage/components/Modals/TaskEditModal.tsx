import { useState, useEffect } from 'react';
import { PlanningTask } from '../../types/planning.types';

export const TaskEditModal = ({ task, isOpen, onClose, onSave }: { task: PlanningTask | null, isOpen: boolean, onClose: () => void, onSave: (id: string, updates: Partial<PlanningTask>) => void }) => {
    const [title, setTitle] = useState('');
    const [status, setStatus] = useState<PlanningTask['status']>('todo');

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setStatus(task.status || 'todo');
        }
    }, [task]);

    if (!isOpen || !task) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'var(--color-bg)', padding: '24px', borderRadius: '8px', width: '400px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ marginTop: 0 }}>Edit Task</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                    <input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        style={{ padding: '8px', background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }}
                    />
                    <select
                        value={status}
                        onChange={e => setStatus(e.target.value as any)}
                        style={{ padding: '8px', background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }}
                    >
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="done">Done</option>
                    </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => onSave(task.id, { title, status })} style={{ padding: '8px 16px', background: 'var(--color-primary)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                </div>
            </div>
        </div>
    )
}
