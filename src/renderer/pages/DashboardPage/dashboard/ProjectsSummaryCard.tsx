import type { AppView } from '../../shared/InternalNav'

interface ProjectsSummaryCardProps {
  projectsCount: number
  onNavigate: (view: AppView) => void
}

export const ProjectsSummaryCard = ({
  projectsCount,
  onNavigate,
}: ProjectsSummaryCardProps) => {
  return (
    <article className="today-section today-report-card" style={{ animation: 'dashboardCardFadeIn 0.4s ease-out' }}>
      <div className="today-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ color: 'var(--color-primary)' }}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <h3>Projetos & Git</h3>
        <span className="today-section-count">{projectsCount}</span>
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-background)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Workspace</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', marginTop: '2px' }}>Relatórios de Código</div>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--color-primary)' }}>
            {projectsCount}
          </span>
        </div>

        <button
          type="button"
          className="today-section-link"
          style={{ width: '100%', textAlign: 'center', marginTop: '4px', cursor: 'pointer' }}
          onClick={() => onNavigate('projects')}
        >
          Explorar Projetos e Commits →
        </button>
      </div>
    </article>
  )
}
