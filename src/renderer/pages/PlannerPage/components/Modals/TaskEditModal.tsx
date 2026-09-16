import { useState, useEffect } from 'react';
import { PlanningTask } from '../../types/planning.types';

export const TaskEditModal = ({ task, isOpen, onClose, onSave }: { task: PlanningTask | null, isOpen: boolean, onClose: () => void, onSave: (id: string, updates: Partial<PlanningTask>) => void }) => {
    const [title, setTitle] = useState('');
    const [status, setStatus] = useState<PlanningTask['status']>('todo');
    const [priority, setPriority] = useState<PlanningTask['priority']>('medium');
    const [storyPoints, setStoryPoints] = useState<number>(0);
    const [date, setDate] = useState('');
    const [coverColor, setCoverColor] = useState('');
    const [iconEmoji, setIconEmoji] = useState('');

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setStatus(task.status || 'todo');
            setPriority(task.priority || 'medium');
            setStoryPoints(task.storyPoints || 0);
            setDate(task.date || '');
            setCoverColor(task.coverColor || '');
            setIconEmoji(task.iconEmoji || '');
        }
    }, [task]);

    if (!isOpen || !task) return null;

    const handleSave = () => {
        onSave(task.id, {
            title,
            status,
            priority,
            storyPoints: storyPoints || undefined,
            date: date || null,
            coverColor: coverColor || null,
            iconEmoji: iconEmoji || null
        });
    }

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'var(--color-bg)', padding: '24px', borderRadius: '8px', width: '480px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '24px' }}>Edit Planning Task</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            value={iconEmoji}
                            onChange={e => setIconEmoji(e.target.value)}
                            placeholder="🚀"
                            style={{ width: '48px', padding: '8px', background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px', textAlign: 'center' }}
                        />
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Task title"
                            style={{ flex: 1, padding: '8px', background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Status</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value as any)}
                                style={{ width: '100%', padding: '8px', background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }}
                            >
                                <option value="backlog">Backlog</option>
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="review">Review</option>
                                <option value="done">Done</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Priority</label>
                            <select
                                value={priority}
                                onChange={e => setPriority(e.target.value as any)}
                                style={{ width: '100%', padding: '8px', background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Story Pts</label>
                            <input
                                type="number"
                                value={storyPoints}
                                onChange={e => setStoryPoints(parseInt(e.target.value, 10))}
                                style={{ width: '100%', padding: '8px', background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                style={{ width: '100%', padding: '8px', background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Cover Color</label>
                            <input
                                type="color"
                                value={coverColor || '#000000'}
                                onChange={e => setCoverColor(e.target.value)}
                                style={{ width: '100%', padding: '0', background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', height: '36px' }}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '32px' }}>
                    <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleSave} style={{ padding: '8px 16px', background: 'var(--color-primary)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                </div>
            </div>
        </div>
    )
}
