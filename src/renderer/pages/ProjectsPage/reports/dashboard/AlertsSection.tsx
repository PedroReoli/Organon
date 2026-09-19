import React, { useState } from 'react'
import { CheckCircle2, Check, ChevronUp, ChevronDown, Wrench, X, AlertTriangle } from 'lucide-react'
import type { WeekReport } from '@types'
import { isElectron } from '@utils'

interface AlertsSectionProps {
  report: WeekReport
  onGoPackageJson: () => void
}

interface FixModal {
  repoPath: string
  repoName: string
  hash: string
  currentMsg: string
  suggestedMsg: string
}

type FixState = 'idle' | 'running' | 'ok' | 'error'

export const AlertsSection: React.FC<AlertsSectionProps> = ({ report, onGoPackageJson }) => {
  const repos: any[] = report.repos || []
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [fixModal, setFixModal] = useState<FixModal | null>(null)
  const [fixMsg, setFixMsg] = useState('')
  const [fixState, setFixState] = useState<FixState>('idle')
  const [fixError, setFixError] = useState('')

  const badCommits = repos.flatMap((r: any) =>
    (r.badCommits ?? []).map((b: any) => ({ ...b, repoName: `${r.group || ''}/${r.name || ''}` }))
  )
  const packageRepos = repos.filter((r: any) => r.packageJsonChanged && r.packageJsonDiff)

  const copyText = (text: string, key: string) => {
    if (isElectron()) void window.electronAPI.copyToClipboard(text)
    else void navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  const openFixModal = (b: typeof badCommits[0]) => {
    const repoPath = b.fixCommand.match(/git -C (.+?) commit/)?.[1] ?? ''
    setFixModal({ repoPath, repoName: b.repoName, hash: b.hash, currentMsg: b.msg, suggestedMsg: b.suggestedMsg ?? '' })
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
    if (!amend.ok) { setFixState('error'); setFixError(amend.stderr || 'Erro ao executar git commit --amend'); return }
    const push = await api.gitExec(fixModal.repoPath, ['push', '--force-with-lease'])
    if (!push.ok) { setFixState('error'); setFixError(push.stderr || 'Push falhou após o amend'); return }
    setFixState('ok')
  }

  const hasAlerts = badCommits.length > 0 || packageRepos.length > 0

  return (
    <>
    <div className="projects-dashboard-card" style={{ height: 'fit-content', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <h3 className="projects-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
          <AlertTriangle size={15} color="var(--accent-red, #ef4444)" />
          <span>Alertas de Qualidade</span>
          {badCommits.length > 0 && (
            <span style={{ color: 'var(--accent-red)', fontSize: '10.5px', marginLeft: '4px', fontWeight: 700, background: 'rgba(239, 68, 68, 0.12)', padding: '1px 6px', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              {badCommits.length}
            </span>
          )}
        </h3>

        {packageRepos.length > 0 && (
          <button
            type="button"
            className="projects-btn"
            onClick={onGoPackageJson}
            style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--accent-yellow)', borderColor: 'var(--accent-yellow)' }}
          >
            ⬡ {packageRepos.length} pkg.json alterado{packageRepos.length > 1 ? 's' : ''} →
          </button>
        )}
      </div>

      {!hasAlerts && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(34, 197, 94, 0.08)', borderRadius: '6px', border: '1px solid rgba(34, 197, 94, 0.2)', color: 'var(--accent-green)', fontSize: '12px' }}>
          <CheckCircle2 size={15} />
          <span>Nenhum alerta de commit fora de padrão nesta semana</span>
        </div>
      )}

      {badCommits.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto', paddingRight: '2px' }}>
          {badCommits.map(b => {
            const key = `${b.repoName}-${b.hash}`
            const isOpen = expandedCommit === key
            const shortRepo = b.repoName.split('/')[1] || b.repoName

            return (
              <div
                key={key}
                style={{
                  background: isOpen ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${isOpen ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
                  borderRadius: '6px',
                  overflow: 'hidden',
                  transition: 'background 0.15s ease',
                }}
              >
                <button
                  type="button"
                  onClick={() => setExpandedCommit(isOpen ? null : key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    width: '100%',
                    padding: '7px 10px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                    <code
                      style={{
                        fontSize: '10px',
                        color: 'var(--accent-red, #ef4444)',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        background: 'rgba(239, 68, 68, 0.14)',
                        padding: '2px 5px',
                        borderRadius: '4px',
                        flexShrink: 0,
                      }}
                    >
                      {b.hash.slice(0, 7)}
                    </code>

                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '120px',
                        flexShrink: 0,
                      }}
                      title={b.repoName}
                    >
                      {shortRepo}
                    </span>

                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontStyle: 'italic',
                      }}
                      title={b.msg}
                    >
                      "{b.msg}"
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontSize: '10px', color: 'var(--accent-red)', fontWeight: 600 }}>
                      {isOpen ? 'Ocultar' : 'Ver / Fix'}
                    </span>
                    <span style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>
                      {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(0,0,0,0.25)' }}>
                    {b.suggestedMsg && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-green)' }}>
                          Sugestão de Mensagem (Conventional Commit)
                        </span>
                        <code style={{ fontSize: '12px', fontFamily: 'monospace', padding: '6px 8px', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '4px', color: '#4ade80' }}>
                          {b.suggestedMsg}
                        </code>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="projects-btn"
                        style={{
                          padding: '4px 10px',
                          fontSize: '11.5px',
                          color: copiedKey === key ? 'var(--accent-green)' : 'inherit',
                          borderColor: copiedKey === key ? 'var(--accent-green)' : 'var(--border)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        onClick={() => copyText(b.fixCommand, key)}
                      >
                        {copiedKey === key ? <><Check size={13} /> Copiado!</> : 'Copiar Comando Git'}
                      </button>
                      {isElectron() && (
                        <button
                          type="button"
                          className="projects-btn"
                          style={{
                            padding: '4px 10px',
                            fontSize: '11.5px',
                            borderColor: 'var(--accent-red)',
                            color: 'var(--accent-red)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          onClick={() => openFixModal(b)}
                        >
                          <Wrench size={13} /> Auto-Fix (Amend)
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>

    {fixModal && (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={() => { if (fixState !== 'running') setFixModal(null) }}
      >
        <div
          className="projects-dashboard-card"
          style={{ width: '100%', maxWidth: '420px', padding: '20px', background: 'var(--bg-secondary, #111420)' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="projects-card-title" style={{ margin: 0, fontSize: '15px' }}>
              Corrigir Mensagem de Commit
            </h3>
            <button
              type="button"
              className="projects-btn"
              style={{ padding: '4px 6px', border: 'none', background: 'transparent', cursor: 'pointer' }}
              onClick={() => setFixModal(null)}
              disabled={fixState === 'running'}
              aria-label="Fechar"
            >
              <X size={15} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Repositório</span>
              <span style={{ fontWeight: 600 }}>{fixModal.repoName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Commit Hash</span>
              <code style={{ color: 'var(--accent-red)' }}>{fixModal.hash.slice(0, 7)}</code>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>Mensagem Atual</span>
              <span style={{ fontSize: '12px', padding: '6px 10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '4px', color: '#f87171' }}>
                {fixModal.currentMsg}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600 }} htmlFor="rp-fix-msg-input">
                Nova Mensagem
              </label>
              <input
                id="rp-fix-msg-input"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '12.5px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box',
                }}
                value={fixMsg}
                onChange={e => setFixMsg(e.target.value)}
                disabled={fixState === 'running' || fixState === 'ok'}
                placeholder="feat(escopo): descricao da alteracao"
                autoFocus
              />
            </div>

            {fixState === 'error' && (
              <div style={{ color: 'var(--accent-red)', fontSize: '12px', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>
                {fixError}
              </div>
            )}
            {fixState === 'ok' && (
              <div style={{ color: 'var(--accent-green)', fontSize: '12px', padding: '8px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '6px' }}>
                Commit corrigido e enviado via push com sucesso!
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
            <button
              type="button"
              className="projects-btn"
              onClick={() => setFixModal(null)}
              disabled={fixState === 'running'}
            >
              {fixState === 'ok' ? 'Fechar' : 'Cancelar'}
            </button>
            {fixState !== 'ok' && (
              <button
                type="button"
                className="projects-btn"
                style={{ background: 'var(--color-primary, #6366f1)', color: '#fff', borderColor: 'var(--color-primary, #6366f1)', fontWeight: 600 }}
                onClick={() => void runFix()}
                disabled={fixState === 'running' || !fixMsg.trim()}
              >
                {fixState === 'running' ? 'Executando...' : 'Amend + Push'}
              </button>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  )
}
