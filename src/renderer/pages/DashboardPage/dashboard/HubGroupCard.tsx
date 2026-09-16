import type { DashboardHubCard } from '../DashboardPage'
import type { AppView } from '../../shared/InternalNav'

interface HubGroupCardProps {
  hub: DashboardHubCard
  icons: Record<AppView, JSX.Element>
  onNavigate: (view: AppView) => void
}

export const HubGroupCard = ({ hub, icons, onNavigate }: HubGroupCardProps) => {
  return (
    <section 
      className={`today-hub-group today-hub-group--${hub.id}`} 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        height: '100%',
        minHeight: '220px',
        animation: 'dashboardCardFadeIn 0.3s ease-out',
        background: 'var(--color-surface, rgba(255, 255, 255, 0.02))',
        border: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
        borderRadius: '14px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Top Header & Desc */}
      <div>
        <div 
          className="today-hub-group-header" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '14px 18px 10px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span 
              className="today-hub-action-icon" 
              style={{ 
                color: 'var(--color-primary, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
              }}
            >
              {icons[hub.primaryView]}
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>
                {hub.label}
              </h3>
              {hub.description && (
                <p className="today-hub-desc" style={{ margin: '2px 0 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  {hub.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Métricas do Hub */}
        {hub.metrics && hub.metrics.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              padding: '10px 18px 6px 18px',
            }}
          >
            {hub.metrics.map(metric => (
              <div
                key={metric.label}
                style={{
                  flex: 1,
                  minWidth: '100px',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  background: 'color-mix(in srgb, var(--color-primary, #6366f1) 8%, var(--color-surface, #1e1e2e))',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-primary, #818cf8)', letterSpacing: '-0.3px', lineHeight: 1 }}>
                  {metric.value}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  {metric.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid de Botões de Ação na Base */}
      <div 
        className="today-hub-actions today-hub-actions-grid"
        style={{
          marginTop: 'auto',
          padding: '10px 14px 14px 14px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px',
        }}
      >
        {hub.views.map(view => (
          <button
            key={`${hub.id}-${view.view}`}
            type="button"
            className="today-hub-action"
            onClick={() => onNavigate(view.view)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              background: 'rgba(255, 255, 255, 0.03)',
              color: 'var(--color-text, #f3f4f6)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span className="today-hub-action-icon" aria-hidden="true" style={{ display: 'flex', opacity: 0.85 }}>
              {icons[view.view]}
            </span>
            <span className="today-hub-action-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {view.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
