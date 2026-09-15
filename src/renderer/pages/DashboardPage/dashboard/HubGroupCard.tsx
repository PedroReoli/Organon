import type { DashboardHubCard } from '../DashboardPage'
import type { AppView } from '../../shared/InternalNav'

interface HubGroupCardProps {
  hub: DashboardHubCard
  icons: Record<AppView, JSX.Element>
  onNavigate: (view: AppView) => void
}

export const HubGroupCard = ({ hub, icons, onNavigate }: HubGroupCardProps) => {
  return (
    <section className={`today-hub-group today-hub-group--${hub.id}`} style={{ animation: 'dashboardCardFadeIn 0.3s ease-out' }}>
      <div className="today-hub-group-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="today-hub-action-icon" style={{ color: 'var(--color-primary)' }}>
            {icons[hub.primaryView]}
          </span>
          <h3 style={{ margin: 0 }}>{hub.label}</h3>
        </div>
        {hub.description && <p className="today-hub-desc">{hub.description}</p>}
      </div>

      {hub.metrics && hub.metrics.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '10px 16px 4px 16px',
          }}
        >
          {hub.metrics.map(metric => (
            <div
              key={metric.label}
              style={{
                flex: 1,
                minWidth: '110px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.3px', lineHeight: 1 }}>
                {metric.value}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                {metric.label}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="today-hub-actions today-hub-actions-grid">
        {hub.views.map(view => (
          <button
            key={`${hub.id}-${view.view}`}
            type="button"
            className="today-hub-action"
            onClick={() => onNavigate(view.view)}
          >
            <span className="today-hub-action-icon" aria-hidden="true">
              {icons[view.view]}
            </span>
            <span className="today-hub-action-label">{view.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
