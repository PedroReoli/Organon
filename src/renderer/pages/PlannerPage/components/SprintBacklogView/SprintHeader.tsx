import { Package } from 'lucide-react';
import { PlanningSprint, PlanningTask } from '../../types/planning.types';
import { SprintVelocityChart } from './SprintVelocityChart';

export const SprintHeader = ({ sprint, tasks }: { sprint?: PlanningSprint, tasks: PlanningTask[] }) => {
    if (!sprint) {
        return <div style={{ padding: '16px', background: 'var(--color-surface)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Select a sprint to view details</div>
    }

    const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
    const completedPts = sprintTasks.filter(t => t.status === 'done').reduce((acc, t) => acc + (t.storyPoints || 0), 0);

    return (
        <div style={{ padding: '24px', background: 'var(--color-surface)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={18} style={{ color: 'var(--color-primary)' }} />
                    {sprint.name || sprint.label || 'Sprint'}
                </h2>
                <div style={{ color: 'var(--color-text-muted)', marginTop: '8px', fontSize: '13px' }}>
                    {sprint.startDate} — {sprint.endDate} {sprint.goal ? `• ${sprint.goal}` : ''}
                </div>
                {sprint.projectIds && sprint.projectIds.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        {sprint.projectIds.map((p: string) => (
                            <span key={p} style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', border: '1px solid rgba(255,255,255,0.1)' }}>{p}</span>
                        ))}
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <SprintVelocityChart completed={completedPts} target={sprint.targetStoryPoints || 0} />
            </div>
        </div>
    )
}
