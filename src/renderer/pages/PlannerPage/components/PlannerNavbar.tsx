import { PlannerViewMode } from '../index';

interface PlannerNavbarProps {
  viewMode: PlannerViewMode;
  setViewMode: (v: PlannerViewMode) => void;
}

export const PlannerNavbar = ({ viewMode, setViewMode }: PlannerNavbarProps) => {
  const navStyles = (isActive: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid',
    borderColor: isActive ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)',
    cursor: 'pointer',
    background: isActive ? 'color-mix(in srgb, var(--color-primary) 15%, var(--color-surface))' : 'var(--color-surface)',
    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
    fontWeight: (isActive ? 600 : 500) as number,
    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
    transition: 'all 150ms ease-out',
    fontSize: '13px',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'var(--color-bg)',
      }}
    >
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setViewMode('weekly')}
          style={navStyles(viewMode === 'weekly')}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="2" y="3" width="12" height="11" rx="2" />
            <path d="M2 6h12" />
            <path d="M5 2v2M11 2v2" />
          </svg>
          <span>Visão Semanal</span>
        </button>

        <button
          type="button"
          onClick={() => setViewMode('daily')}
          style={navStyles(viewMode === 'daily')}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 4v4l2.5 2.5" />
          </svg>
          <span>Visão Diária</span>
        </button>
      </div>
    </div>
  );
};

