interface SystemSummaryCardProps {
  title: string
  metrics: Array<{ label: string; value: string | number }>
  action?: {
    label: string
    onClick: () => void
  }
}

export const SystemSummaryCard = ({ title, metrics, action }: SystemSummaryCardProps) => {
  return (
    <article className="today-section today-report-card" style={{ animation: 'dashboardCardFadeIn 0.35s ease-out' }}>
      <div className="today-section-title">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" style={{ marginRight: '2px' }}>
          <rect x="2" y="2" width="20" height="8" rx="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" />
          <line x1="6" y1="6" x2="6.01" y2="6" />
          <line x1="6" y1="18" x2="6.01" y2="18" />
        </svg>
        <h3>{title}</h3>
      </div>
      
      <div className="today-metric-grid">
        {metrics.map(metric => (
          <div key={metric.label} className="today-metric-box">
            <span className="today-metric-value">{metric.value}</span>
            <span className="today-metric-label">{metric.label}</span>
          </div>
        ))}
      </div>

      {action && (
        <button type="button" className="today-section-link" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </article>
  )
}
