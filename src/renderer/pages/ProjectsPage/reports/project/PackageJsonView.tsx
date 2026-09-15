import React, { useState } from 'react'
import type { RepoReport } from '@types'

interface PackageJsonViewProps {
  repos: RepoReport[]
  onBack: () => void
}

function parseDiff(diff: string) {
  const before: string[] = []
  const after: string[] = []
  for (const line of diff.split('\n')) {
    if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) continue
    if (line.startsWith('-')) { before.push(line.slice(1)); after.push('') }
    else if (line.startsWith('+')) { before.push(''); after.push(line.slice(1)) }
    else { before.push(line); after.push(line) }
  }
  return { before, after }
}

export const PackageJsonView: React.FC<PackageJsonViewProps> = ({ repos, onBack }) => {
  const packageRepos = repos.filter(r => r.packageJsonChanged && r.packageJsonDiff)
  const [selected, setSelected] = useState(0)

  if (packageRepos.length === 0) {
    return (
      <div className="projects-content-scroll">
        <div className="projects-header">
          <div>
            <button type="button" className="projects-btn" onClick={onBack} style={{ marginBottom: '8px', padding: '4px 8px', border: 'none', background: 'transparent', paddingLeft: 0 }}>← Voltar</button>
            <h1 className="projects-title">Mudanças em package.json</h1>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <span>Nenhuma mudança em package.json registrada nesta semana.</span>
        </div>
      </div>
    )
  }

  const repo = packageRepos[selected]
  const key = `${repo.group}/${repo.name}`
  const lines = repo.packageJsonDiff!.split('\n')
  const added = lines.filter(l => l.startsWith('+')).length
  const removed = lines.filter(l => l.startsWith('-')).length
  const { before, after } = parseDiff(repo.packageJsonDiff!)

  return (
    <div className="projects-content-scroll">
      <div className="projects-header">
        <div>
          <button type="button" className="projects-btn" onClick={onBack} style={{ marginBottom: '8px', padding: '4px 8px', border: 'none', background: 'transparent', paddingLeft: 0 }}>← Voltar</button>
          <h1 className="projects-title">Mudanças em package.json</h1>
          <p className="projects-subtitle">{packageRepos.length} projeto{packageRepos.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {packageRepos.length > 1 && (
        <div className="projects-tabs" style={{ marginBottom: '24px' }}>
          {packageRepos.map((r, i) => (
            <button
              key={`${r.group}/${r.name}`}
              type="button"
              className={`projects-tab ${selected === i ? 'projects-tab-active' : ''}`}
              onClick={() => setSelected(i)}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{key}</span>
          <div style={{ display: 'flex', gap: '12px', fontSize: '13px', fontWeight: 600 }}>
            {added > 0 && <span style={{ color: 'var(--accent-green)' }}>+{added}</span>}
            {removed > 0 && <span style={{ color: 'var(--accent-red)' }}>-{removed}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', width: '100%' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', fontSize: '12px', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Antes</div>
            <pre style={{ margin: 0, padding: '16px', fontSize: '12px', fontFamily: 'monospace', overflowX: 'auto', background: 'var(--bg-primary)', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {before.map((line, i) => {
                const isDel = line !== '' && after[i] === ''
                return <span key={i} style={isDel ? { background: 'rgba(239, 68, 68, 0.2)', color: 'var(--accent-red)', display: 'block' } : { display: 'block' }}>{line || ' '}</span>
              })}
            </pre>
          </div>
          <div style={{ width: '1px', background: 'var(--border)' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ padding: '8px 16px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--accent-green)', fontSize: '12px', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Depois</div>
            <pre style={{ margin: 0, padding: '16px', fontSize: '12px', fontFamily: 'monospace', overflowX: 'auto', background: 'var(--bg-primary)', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {after.map((line, i) => {
                const isAdd = line !== '' && before[i] === ''
                return <span key={i} style={isAdd ? { background: 'rgba(34, 197, 94, 0.2)', color: 'var(--accent-green)', display: 'block' } : { display: 'block' }}>{line || ' '}</span>
              })}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
