/**
 * CRMReportsPanel — painel colapsavel com agregacoes do CRM.
 *
 * Consome useCRMReports (hook puro). Mostra KPIs principais,
 * distribuicao por estagio, top tags, stuck contacts e mini
 * serie de interacoes. Upgrade 03.
 */

import React from 'react'
import type { UseCRMReportsResult } from '@hooks/useCRMReports'

interface CRMReportsPanelProps {
  reports: UseCRMReportsResult
  onContactClick?: (contactId: string) => void
  onClose: () => void
}

export const CRMReportsPanel: React.FC<CRMReportsPanelProps> = ({
  reports,
  onContactClick,
  onClose,
}) => {
  const {
    totalContacts,
    totalActive,
    stageDistribution,
    topTags,
    stuckContacts,
    interactionsLastWindow,
    interactionSeries,
  } = reports

  const maxStage = Math.max(1, ...stageDistribution.map((s) => s.count))
  const maxSeries = Math.max(1, ...interactionSeries.map((p) => p.count))

  return (
    <div className="projects-content-scroll">
      <header className="projects-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 className="projects-title">Relatórios do CRM</h1>
          </div>
          <p className="projects-subtitle">Resumo das interações e pipeline</p>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* KPIs */}
        <div className="projects-stats-bar">
          <div className="projects-stat-card">
            <span className="projects-stat-value" style={{ color: 'var(--color-primary)' }}>{totalContacts}</span>
            <span className="projects-stat-label">Contatos</span>
          </div>
          <div className="projects-stat-card">
            <span className="projects-stat-value" style={{ color: '#22c55e' }}>{totalActive}</span>
            <span className="projects-stat-label">Ativos</span>
          </div>
          <div className="projects-stat-card">
            <span className="projects-stat-value" style={{ color: 'var(--color-primary)' }}>{interactionsLastWindow}</span>
            <span className="projects-stat-label">Interações (30d)</span>
          </div>
          <div className="projects-stat-card">
            <span className="projects-stat-value" style={{ color: '#ef4444' }}>{stuckContacts.length}</span>
            <span className="projects-stat-label">Parados</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Stage distribution */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Distribuição por estágio</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {stageDistribution.map((s) => (
                <div key={s.stageId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.count}</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-primary)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(s.count / maxStage) * 100}%`, background: 'var(--color-primary)', borderRadius: '99px' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top tags */}
          {topTags.length > 0 && (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Top tags</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {topTags.map((t) => (
                  <span
                    key={t.tagId}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '4px 10px', borderRadius: '99px',
                      fontSize: '12px', fontWeight: 500,
                      backgroundColor: t.color, color: '#fff'
                    }}
                  >
                    {t.name} <strong style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '99px', fontSize: '11px' }}>{t.count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent interactions */}
          {interactionSeries.length > 0 && (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Interações recentes</h4>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px' }}>
                {interactionSeries.map((p) => (
                  <div
                    key={p.date}
                    title={`${p.date}: ${p.count}`}
                    style={{
                      flex: 1,
                      background: 'var(--color-primary)',
                      borderRadius: '4px 4px 0 0',
                      height: `${Math.max(4, (p.count / maxSeries) * 100)}%`,
                      opacity: 0.8,
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stuck contacts */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Contatos parados (≥ 14 dias)</h4>
            {stuckContacts.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Nenhum contato parado.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stuckContacts.slice(0, 10).map((s) => (
                  <li key={s.contact.id}>
                    <button
                      type="button"
                      onClick={() => onContactClick?.(s.contact.id)}
                      style={{
                        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)',
                        borderRadius: '8px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.2s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{s.contact.name}</span>
                      <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600, background: '#fef2f2', padding: '2px 8px', borderRadius: '99px' }}>
                        {s.daysSinceLastInteraction == null
                          ? 'sem interações'
                          : `${s.daysSinceLastInteraction}d`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
