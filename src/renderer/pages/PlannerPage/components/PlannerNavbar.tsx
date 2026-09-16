import { PlannerViewMode } from '../index';

export const PlannerNavbar = ({ viewMode, setViewMode }: { viewMode: PlannerViewMode, setViewMode: (v: PlannerViewMode) => void }) => {
    const navStyles = (isActive: boolean) => ({
        padding: '6px 12px',
        borderRadius: '6px',
        border: '1px solid',
        borderColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
        cursor: 'pointer',
        background: isActive ? 'var(--color-surface)' : 'transparent',
        color: isActive ? '#fff' : 'var(--color-text-muted)',
        fontWeight: isActive ? 600 : 400,
        boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.2)' : 'none',
        transition: 'all 150ms ease-out',
        fontSize: '13px'
    });

    return (
        <div style={{
            display: 'flex',
            padding: '16px 24px',
            gap: '12px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'var(--color-bg)',
            boxShadow: '0 1px 0 rgba(0,0,0,0.2)'
        }}>
            <button onClick={() => setViewMode('daily')} style={navStyles(viewMode === 'daily')}>
                ☀️ Daily Focus
            </button>
            <button onClick={() => setViewMode('weekly')} style={navStyles(viewMode === 'weekly')}>
                🗓️ Weekly Horizon
            </button>
            <button onClick={() => setViewMode('monthly')} style={navStyles(viewMode === 'monthly')}>
                📅 Monthly & Roadmap
            </button>
            <button onClick={() => setViewMode('sprint')} style={navStyles(viewMode === 'sprint')}>
                📦 Backlog & Sprints
            </button>
        </div>
    )
}
