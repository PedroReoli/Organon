interface WeeklyOverviewDay {
  key: string
  label: string
  date: string
  total: number
  eventCount: number
  eventDots: string[]
  isToday: boolean
}

interface WeekOverviewCardProps {
  weeklyOverview: WeeklyOverviewDay[]
  weekTotalItems: number
  weekEventCount: number
  weekCardsCount: number
}

export const WeekOverviewCard = ({
  weeklyOverview,
  weekTotalItems,
  weekEventCount,
  weekCardsCount,
}: WeekOverviewCardProps) => {
  return (
    <article className="today-section today-report-card today-report-card-wide" style={{ animation: 'dashboardCardFadeIn 0.45s ease-out' }}>
      <div className="today-section-title">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" style={{ marginRight: '2px' }}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <h3>Visão da Semana</h3>
        <span className="today-section-count">{weekTotalItems}</span>
      </div>
      <div className="today-week-body">
        <div className="today-week-grid">
          {weeklyOverview.map(day => (
            <div key={day.key} className={`today-week-day ${day.isToday ? 'is-today' : ''}`}>
              <span className="today-week-day-name">{day.label}</span>
              <span className="today-week-day-count">{day.total}</span>
              <div className="today-week-day-dots">
                {day.eventDots.map((color, index) => (
                  <span key={`${day.key}-${index}`} className="today-week-dot" style={{ background: color }} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="today-summary today-summary-compact">
          <div className="today-summary-row">
            <span>Eventos na semana</span>
            <span>{weekEventCount}</span>
          </div>
          <div className="today-summary-row">
            <span>Cards planejados</span>
            <span>{weekCardsCount}</span>
          </div>
        </div>
      </div>
    </article>
  )
}
