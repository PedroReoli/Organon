import React, { useState } from 'react'
import { CheckCircle2, Check, ChevronUp, ChevronDown, Wrench, X } from 'lucide-react'
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

  // autofit: mais itens = fonte menor
  const count = badCommits.length
  const fs = count <= 3 ? 12 : count <= 6 ? 11 : count <= 10 ? 10 : 9
  const fsSm = fs - 1

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
    if (!amend.ok) { setFixState('error'); setFixError(amend.stderr || 'Erro'); return }
    const push = await api.gitExec(fixModal.repoPath, ['push', '--force-with-lease'])
    if (!push.ok) { setFixState('error'); setFixError(push.stderr || 'Push falhou'); return }
    setFixState('ok')
  }

  const hasAlerts = badCommits.length > 0 || packageRepos.length > 0

  return (
    <>
    <div className="projects-dashboard-card" style={{ flex: 1, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 className="projects-card-title" style={{ margin: 0 }}>
          Alertas
          {badCommits.length > 0 && <span style={{ color: 'var(--accent-red)', fontSize: '12px', marginLeft: '6px' }}>{badCommits.length}</span>}
        </h3>
        {packageRepos.length > 0 && (
          <button type="button" className="projects-btn" onClick={onGoPackageJson} style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--accent-yellow)', borderColor: 'var(--accent-yellow)' }}>
            ⬡ {packageRepos.length} pkg.json →
          </button>
        )}
      </div>

      {!hasAlerts && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-green)', fontSize: '13px' }}>
          <CheckCircle2 size={14} />
          <span>Nenhum alerta</span>
        </div>
      )}

      {badCommits.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
          {badCommits.map(b => {
            const key = `${b.repoName}-${b.hash}`
            const isOpen = expandedCommit === key
            return (
              <div key={key} style={{ background: isOpen ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
                <button type="button"
                  onClick={() => setExpandedCommit(isOpen ? null : key)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)' }}>
                  <code style={{ fontSize: fsSm, color: 'var(--accent-red)', fontFamily: 'monospace' }}>{b.hash.slice(0, 7)}</code>
                  <span style={{ fontSize: fsSm, color: 'var(--text-muted)', whiteSpace: 'nowrap' }} title={b.repoName}>{b.repoName.split('/')[1]}</span>
                  <span style={{ fontSize: fs, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={b.msg}>"{b.msg}"</span>
                  <span style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
                    {b.suggestedMsg && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--accent-green)' }}>Sugestão</span>
                        <span style={{ fontSize: '13px', fontFamily: 'monospace' }}>{b.suggestedMsg}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button"
                        className="projects-btn"
                        style={{ padding: '4px 12px', fontSize: '12px', color: copiedKey === key ? 'var(--accent-green)' : 'inherit', borderColor: copiedKey === key ? 'var(--accent-green)' : 'var(--border)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => copyText(b.fixCommand, key)}>
                        {copiedKey === key ? <><Check size={13} /> Copiado</> : 'Copiar Comando'}
                      </button>
                      {isElectron() && (
                        <button type="button" className="projects-btn" style={{ padding: '4px 12px', fontSize: '12px', borderColor: 'var(--accent-red)', color: 'var(--accent-red)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => openFixModal(b)}><Wrench size={13} /> Auto-Fix</button>
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
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { if (fixState !== 'running') setFixModal(null) }}>
        <div className="projects-dashboard-card" style={{ width: '100%', maxWidth: '400px', padding: '24px' }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 className="projects-card-title" style={{ margin: 0 }}>Corrigir commit</h3>
            <button type="button" className="projects-btn" style={{ padding: '4px 8px', border: 'none', display: 'flex', alignItems: 'center' }} onClick={() => setFixModal(null)} disabled={fixState === 'running'} aria-label="Fechar"><X size={14} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Repo</span>
              <span style={{ fontSize: '13px' }}>{fixModal.repoName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Hash</span>
              <code style={{ fontSize: '13px', color: 'var(--accent-red)' }}>{fixModal.hash.slice(0, 7)}</code>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Atual</span>
              <span style={{ fontSize: '13px', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>{fixModal.currentMsg}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ color: 'var(--text-muted)', fontSize: '13px' }} htmlFor="rp-fix-msg-input">Nova mensagem</label>
              <input id="rp-fix-msg-input" 
                style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                value={fixMsg} onChange={e => setFixMsg(e.target.value)}
                disabled={fixState === 'running' || fixState === 'ok'}
                placeholder="feat(escopo): descricao" autoFocus />
            </div>
            {fixState === 'error' && <div style={{ color: 'var(--accent-red)', fontSize: '13px', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>{fixError}</div>}
            {fixState === 'ok' && <div style={{ color: 'var(--accent-green)', fontSize: '13px', padding: '8px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '6px' }}>Commit corrigido e push realizado com sucesso.</div>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="projects-btn"
              onClick={() => setFixModal(null)} disabled={fixState === 'running'}>
              {fixState === 'ok' ? 'Fechar' : 'Cancelar'}
            </button>
            {fixState !== 'ok' && (
              <button type="button"
                className="projects-btn"
                style={{ background: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                onClick={() => void runFix()} disabled={fixState === 'running' || !fixMsg.trim()}>
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
