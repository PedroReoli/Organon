export const WeekCapacityBar = ({ plannedMinutes, capacityMinutes }: { plannedMinutes: number, capacityMinutes: number }) => {
    const ratio = capacityMinutes > 0 ? plannedMinutes / capacityMinutes : 0;
    const isOver = ratio > 1;

    return (
        <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: isOver ? 'var(--color-danger)' : 'var(--color-text-secondary)', marginBottom: '4px' }}>
                <span>{(plannedMinutes / 60).toFixed(1)}h planned</span>
                <span>{(capacityMinutes / 60).toFixed(1)}h cap</span>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                    width: `${Math.min(100, ratio * 100)}%`,
                    height: '100%',
                    background: isOver ? 'var(--color-danger)' : 'var(--color-primary)',
                    transition: 'width 0.3s ease-out'
                }} />
            </div>
        </div>
    )
}
