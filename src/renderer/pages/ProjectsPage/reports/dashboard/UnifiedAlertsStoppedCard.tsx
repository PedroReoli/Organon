import React, { useMemo, useState } from 'react'
import {
  AlertTriangle,
  PauseCircle,
  CheckCircle2,
  Check,
  ChevronUp,
  ChevronDown,
  Wrench,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { WeekReport, RepoReport } from '@types'
import { isElectron } from '@utils'

interface UnifiedAlertsStoppedCardProps {
  report: WeekReport
  onGoPackageJson?: () => void
}

interface FixModal {
  repoPath: string
  repoName: string
  hash: string
  currentMsg: string
  suggestedMsg: string
}

type FixState = 'idle' | 'running' | 'ok' | 'error'
type TabType = 'alerts' | 'stopped'

export const UnifiedAlertsStoppedCard: React.FC<UnifiedAlertsStoppedCardProps> = ({
  report,
  onGoPackageJson,
}) => {
  const repos: RepoReport[] = (report.repos as any) || []
  const [activeTab, setActiveTab] = useState<TabType>('alerts')

  // ── Alertas Data ──
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [fixModal, setFixModal] = useState<FixModal | null>(null)
  const [fixMsg, setFixMsg] = useState('')
  const [fixState, setFixState] = useState<FixState>('idle')
  const [fixError, setFixError] = useState('')

  const badCommits = useMemo(() => {
    return repos.flatMap((r: any) =>
      (r.badCommits ?? []).map((b: any) => ({
        ...b,
        repoName: `${r.group || ''}/${r.name || ''}`,
      }))
    )
  }, [repos])

  const packageRepos = useMemo(() => {
    return repos.filter((r: any) => r.packageJsonChanged && r.packageJsonDiff)
  }, [repos])

  // ── Parados Data ──
  const [stoppedPage, setStoppedPage] = useState(0)
  const ITEMS_PER_PAGE = 5

  const allStopped = useMemo(() => {
    return repos
      .filter(r => r.status === 'parado' && r.daysAgo > 30)
      .sort((a, b) => b.daysAgo - a.daysAgo)
  }, [repos])

  const maxStoppedPages = Math.max(1, Math.ceil(allStopped.length / ITEMS_PER_PAGE))
  const currentStopped = allStopped.slice(stoppedPage * ITEMS_PER_PAGE, (stoppedPage + 1) * ITEMS_PER_PAGE)
  const maxDays = allStopped[0]?.daysAgo || 365

  const copyText = (text: string, key: string) => {
    if (isElectron()) void window.electronAPI.copyToClipboard(text)
    else void navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  const openFixModal = (b: typeof badCommits[0]) => {
    const repoPath = b.fixCommand.match(/git -C (.+?) commit/)?.[1] ?? ''
    setFixModal({
      repoPath,
      repoName: b.repoName,
      hash: b.hash,
      currentMsg: b.msg,
      suggestedMsg: b.suggestedMsg ?? '',
    })
    setFixMsg(b.suggestedMsg ?? '')
    setFixState('idle')
    setFixError('')
    setExpandedCommit(null)
  }

  const runFix = async () => {
    if (!fixModal || !fixMsg.trim() || !isElectron()) return
    setFixState('running')
    setFixError('')
    const api = window.electronAPI as any
    const amend = await api.gitExec(fixModal.repoPath, ['commit', '--amend', '-m', fixMsg.trim()])
    if (!amend.ok) {
      setFixState('error')
      setFixError(amend.stderr || 'Erro ao executar git commit --amend')
      return
    }
    const push = await api.gitExec(fixModal.repoPath, ['push', '--force-with-lease'])
    if (!push.ok) {
      setFixState('error')
      setFixError(push.stderr || 'Push falhou após o amend')
      return
    }
    setFixState('ok')
  }

  return (
    <>
      <div
        className="projects-dashboard-card"
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {/* Header com Segmented Tabs */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            gap: '8px',
          }}
        >
          <div className="projects-view-toggle">
            <button
              type="button"
              className={`projects-view-toggle-btn ${activeTab === 'alerts' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('alerts')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <AlertTriangle size={13} color={badCommits.length > 0 ? '#ef4444' : 'currentColor'} />
              <span>Alertas</span>
              {badCommits.length > 0 && (
                <span
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '0 5px',
                    borderRadius: '8px',
                  }}
                >
                  {badCommits.length}
                </span>
              )}
            </button>

            <button
              type="button"
              className={`projects-view-toggle-btn ${activeTab === 'stopped' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('stopped')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <PauseCircle size={13} color={allStopped.length > 0 ? '#f59e0b' : 'currentColor'} />
              <span>Parados</span>
              {allStopped.length > 0 && (
                <span
                  style={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#f59e0b',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '0 5px',
                    borderRadius: '8px',
                  }}
                >
                  {allStopped.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'alerts' && packageRepos.length > 0 && onGoPackageJson && (
            <button
              type="button"
              className="projects-btn"
              onClick={onGoPackageJson}
              style={{
                padding: '2px 8px',
                fontSize: '10.5px',
                color: 'var(--accent-yellow)',
                borderColor: 'var(--accent-yellow)',
              }}
            >
              ⬡ {packageRepos.length} pkg.json →
            </button>
          )}

          {activeTab === 'stopped' && maxStoppedPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <button
                type="button"
                className="projects-btn"
                style={{ padding: '2px 4px', border: 'none', background: 'transparent' }}
                disabled={stoppedPage === 0}
                onClick={() => setStoppedPage(p => Math.max(0, p - 1))}
                aria-label="Página anterior"
              >
                <ChevronLeft size={13} />
              </button>
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                {stoppedPage + 1}/{maxStoppedPages}
              </span>
              <button
                type="button"
                className="projects-btn"
                style={{ padding: '2px 4px', border: 'none', background: 'transparent' }}
                disabled={stoppedPage >= maxStoppedPages - 1}
                onClick={() => setStoppedPage(p => Math.min(maxStoppedPages - 1, p + 1))}
                aria-label="Próxima página"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Conteúdo da Aba Ativa */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {activeTab === 'alerts' ? (
            badCommits.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  background: 'rgba(34, 197, 94, 0.08)',
                  borderRadius: '6px',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  color: 'var(--accent-green)',
                  fontSize: '12px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>Nenhum alerta de commit fora de padrão nesta semana</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '2px' }}>
                {badCommits.map(b => {
                  const isExpanded = expandedCommit === b.hash
                  return (
                    <div
                      key={b.hash}
                      style={{
                        background: 'color-mix(in srgb, var(--color-surface) 60%, black)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '8px',
                      }}
                    >
                      <div
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <span
                              style={{
                                color: 'var(--text-primary)',
                                fontWeight: 600,
                                fontSize: '11px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {b.repoName}
                            </span>
                            <span
                              style={{
                                color: 'var(--text-muted)',
                                fontFamily: 'monospace',
                                fontSize: '10px',
                                background: 'rgba(255,255,255,0.06)',
                                padding: '1px 4px',
                                borderRadius: '3px',
                              }}
                            >
                              {b.hash.slice(0, 7)}
                            </span>
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: '11px',
                              color: 'var(--text-secondary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {b.msg}
                          </p>
                          <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>
                            {b.reason}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button
                            type="button"
                            className="projects-btn"
                            style={{
                              padding: '2px 6px',
                              fontSize: '10px',
                              color: 'var(--accent-primary)',
                              borderColor: 'var(--accent-primary)',
                            }}
                            onClick={() => openFixModal(b)}
                            title="Corrigir commit"
                          >
                            <Wrench size={10} style={{ marginRight: '3px' }} />
                            Fix
                          </button>
                          <button
                            type="button"
                            className="projects-btn"
                            style={{ padding: '2px 4px', border: 'none', background: 'transparent' }}
                            onClick={() => setExpandedCommit(isExpanded ? null : b.hash)}
                            aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                          >
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div
                          style={{
                            marginTop: '8px',
                            paddingTop: '8px',
                            borderTop: '1px solid var(--border)',
                            fontSize: '10.5px',
                          }}
                        >
                          <div style={{ marginBottom: '4px', color: 'var(--text-muted)' }}>
                            Sugestão: <strong style={{ color: 'var(--text-primary)' }}>{b.suggestedMsg}</strong>
                          </div>
                          <button
                            type="button"
                            className="projects-btn"
                            style={{ padding: '2px 6px', fontSize: '10px' }}
                            onClick={() => copyText(b.fixCommand, b.hash)}
                          >
                            {copiedKey === b.hash ? (
                              <Check size={10} color="#22c55e" />
                            ) : (
                              'Copiar comando git'
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          ) : allStopped.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px',
                background: 'rgba(34, 197, 94, 0.08)',
                borderRadius: '6px',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                color: 'var(--accent-green)',
                fontSize: '12px',
              }}
            >
              <CheckCircle2 size={16} />
              <span>Nenhum repositório parado há mais de 30 dias</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '2px' }}>
              {currentStopped.map(r => {
                const isExtreme = r.daysAgo > 180
                const isModerate = r.daysAgo > 90
                const color = isExtreme ? '#ef4444' : isModerate ? '#f59e0b' : '#94a3b8'
                const bgBadge = isExtreme
                  ? 'rgba(239, 68, 68, 0.12)'
                  : isModerate
                  ? 'rgba(245, 158, 11, 0.12)'
                  : 'rgba(148, 163, 184, 0.1)'
                const pct = Math.min(100, Math.max(8, (r.daysAgo / maxDays) * 100))

                return (
                  <div
                    key={`${r.group}/${r.name}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      padding: '7px 9px',
                      background: 'color-mix(in srgb, var(--color-surface) 60%, black)',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        gap: '8px',
                      }}
                    >
                      <span
                        style={{
                          color: 'var(--text-primary)',
                          fontWeight: 500,
                          fontSize: '11.5px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        {r.name}
                      </span>
                      <span
                        style={{
                          color,
                          background: bgBadge,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          fontSize: '11px',
                          fontVariantNumeric: 'tabular-nums',
                          flexShrink: 0,
                        }}
                      >
                        {r.daysAgo}d
                      </span>
                    </div>

                    <div
                      style={{
                        width: '100%',
                        height: '3px',
                        borderRadius: '2px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          backgroundColor: color,
                          borderRadius: '2px',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Fix para Alertas */}
      {fixModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '18px',
              width: '420px',
              maxWidth: '90vw',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Corrigir Mensagem de Commit
              </h3>
              <button
                type="button"
                className="projects-btn"
                style={{ padding: '2px 6px', border: 'none', background: 'transparent' }}
                onClick={() => setFixModal(null)}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Repositório: <strong>{fixModal.repoName}</strong> ({fixModal.hash.slice(0, 7)})
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Nova mensagem:
              </label>
              <input
                type="text"
                value={fixMsg}
                onChange={e => setFixMsg(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '11.5px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {fixError && (
              <div style={{ fontSize: '10.5px', color: '#ef4444', padding: '6px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>
                {fixError}
              </div>
            )}

            {fixState === 'ok' && (
              <div style={{ fontSize: '10.5px', color: '#22c55e', padding: '6px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '4px' }}>
                Commit atualizado e push realizado com sucesso!
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                className="projects-btn"
                onClick={() => setFixModal(null)}
              >
                Fechar
              </button>
              <button
                type="button"
                className="projects-btn is-primary"
                onClick={runFix}
                disabled={fixState === 'running' || fixState === 'ok'}
              >
                {fixState === 'running' ? 'Corrigindo...' : 'Executar Amend & Push'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
