export const SprintVelocityChart = ({ completed, target }: { completed: number, target: number }) => {
    const ratio = target > 0 ? completed / target : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '120px' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                Velocity: {completed} / {target} pts
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                    width: `${Math.min(100, ratio * 100)}%`,
                    height: '100%',
                    background: ratio >= 1 ? '#10b981' : 'var(--color-primary)',
                    transition: 'width 0.5s ease-in-out'
                }} />
            </div>
        </div>
    );
};
