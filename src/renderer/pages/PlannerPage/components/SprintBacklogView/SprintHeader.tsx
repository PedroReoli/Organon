import { PlanningSprint } from '../../types/planning.types';

export const SprintHeader = ({ sprint }: { sprint?: PlanningSprint }) => {
    if (!sprint) {
        return <div style={{ padding: '16px', background: 'var(--color-surface)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Select a sprint to view details</div>
    }

    return (
        <div style={{ padding: '24px', background: 'var(--color-surface)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>📦</span>
                    {sprint.name}
                </h2>
                <div style={{ color: 'var(--color-text-muted)', marginTop: '8px', fontSize: '14px' }}>
                    {sprint.startDate} — {sprint.endDate} • {sprint.goal}
                </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Velocity Target</div>
                    <div style={{ fontSize: '20px', fontWeight: 600 }}>{sprint.targetStoryPoints || 0} pts</div>
                </div>
            </div>
        </div>
    )
}
