import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  FolderGit2,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  Edit3,
  RotateCcw,
  ExternalLink,
  GitPullRequest,
  Search,
} from 'lucide-react'
import type { GeneralRepoEntry, GitRepoLiveStatus, GitCloudStatus } from '@types'
import { isElectron } from '@utils'
import '../../../styles/features/reports/projects-compact.css'

export interface CompactRepoTableProps {
  repos: GeneralRepoEntry[]
  onSelectRepo: (group: string, name: string) => void
  reports?: any[]
}

interface AmendTarget {
  repoPath: string
  repoName: string
  currentMsg: string
  suggestedMsg: string
}

export const CompactRepoTable: React.FC<CompactRepoTableProps> = ({
  repos,
  onSelectRepo,
  reports = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'dirty' | 'diverged' | 'warnings'>('all')
  const [liveStatuses, setLiveStatuses] = useState<Record<string, GitRepoLiveStatus>>({})
  const [cloudStatuses, setCloudStatuses] = useState<Record<string, GitCloudStatus>>({})
  const [amendTarget, setAmendTarget] = useState<AmendTarget | null>(null)
  const [amendInput, setAmendInput] = useState('')
  const [isAmending, setIsAmending] = useState(false)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)

  // Mapeamento de paths conhecidos a partir dos relatórios
  const repoPathMap = useMemo(() => {
    const map: Record<string, string> = {}
    // 1. Dos repos atuais se tiverem .path
    for (const r of repos) {
      if (r.path) map[`${r.group}/${r.name}`] = r.path
    }
    // 2. Dos relatórios semanais que possam conter fixCommand ou path
    for (const rep of reports) {
      if (!rep?.repos) continue
      for (const r of rep.repos) {
        const key = `${r.group || ''}/${r.name || ''}`
        if (r.path && !map[key]) map[key] = r.path
        if (r.badCommits) {
          for (const b of r.badCommits) {
            const m = b.fixCommand?.match(/git -C (.+?) commit/)?.[1]
            if (m && !map[key]) map[key] = m.replace(/^"|"$/g, '').trim()
          }
        }
      }
    }
    return map
  }, [repos, reports])

  const resolvePath = useCallback(
    (repo: GeneralRepoEntry): string => {
      const key = `${repo.group}/${repo.name}`
      if (repo.path) return repo.path
      if (repoPathMap[key]) return repoPathMap[key]
      return `F:\\Projetos\\Reoli\\${repo.name}`
    },
    [repoPathMap]
  )

  const hasFetchedRef = React.useRef<Set<string>>(new Set())

  const fetchAllVisible = useCallback(
    async (force = false) => {
      if (!isElectron() || !repos.length) return
      const slice = repos.slice(0, 35)
      const toFetch = force
        ? slice
        : slice.filter(r => !hasFetchedRef.current.has(resolvePath(r)))
      if (toFetch.length === 0) return

      for (const r of toFetch) {
        hasFetchedRef.current.add(resolvePath(r))
      }

      try {
        const results = await Promise.allSettled(
          toFetch.map(async r => {
            const p = resolvePath(r)
            const [live, cloud] = await Promise.all([
              window.electronAPI?.gitRepoLiveStatus
                ? window.electronAPI.gitRepoLiveStatus(p, force).catch(() => null)
                : null,
              window.electronAPI?.gitCloudStatus
                ? window.electronAPI.gitCloudStatus(p).catch(() => null)
                : null,
            ])
            return { p, live, cloud }
          })
        )

        const nextLive: Record<string, GitRepoLiveStatus> = {}
        const nextCloud: Record<string, GitCloudStatus> = {}
        for (const res of results) {
          if (res.status === 'fulfilled' && res.value) {
            if (res.value.live?.ok) nextLive[res.value.p] = res.value.live
            if (res.value.cloud?.ok) nextCloud[res.value.p] = res.value.cloud
          }
        }

        if (Object.keys(nextLive).length > 0) {
          setLiveStatuses(prev => ({ ...prev, ...nextLive }))
        }
        if (Object.keys(nextCloud).length > 0) {
          setCloudStatuses(prev => ({ ...prev, ...nextCloud }))
        }
      } catch (err) {
        console.warn('Erro ao atualizar status em lote:', err)
      }
    },
    [repos, resolvePath]
  )

  useEffect(() => {
    void fetchAllVisible(false)
  }, [fetchAllVisible])

  const showFeedback = (msg: string) => {
    setActionFeedback(msg)
    setTimeout(() => setActionFeedback(null), 3500)
  }

  const handleOpenFolder = (repoPath: string) => {
    if (isElectron() && window.electronAPI?.openPath) {
      void window.electronAPI.openPath(repoPath)
    }
  }

  const handleOpenAmend = (repo: GeneralRepoEntry, currentMsg: string) => {
    const p = resolvePath(repo)
    const suggested = currentMsg.match(/^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?:/)
      ? currentMsg
      : `feat(${repo.name.toLowerCase()}): ${currentMsg || 'atualizações no repositório'}`

    setAmendTarget({
      repoPath: p,
      repoName: repo.name,
      currentMsg,
      suggestedMsg: suggested,
    })
    setAmendInput(suggested)
  }

  const handleConfirmAmend = async () => {
    if (!amendTarget || !amendInput.trim() || !isElectron()) return
    setIsAmending(true)
    try {
      if (window.electronAPI?.gitAmendCommit) {
        const res = await window.electronAPI.gitAmendCommit(amendTarget.repoPath, amendInput.trim())
        if (res.ok) {
          showFeedback(`Commit de ${amendTarget.repoName} corrigido com sucesso!`)
          setAmendTarget(null)
          hasFetchedRef.current.delete(amendTarget.repoPath)
          void fetchAllVisible(true)
        } else {
          alert(`Falha ao corrigir commit: ${res.error || 'Erro desconhecido'}`)
        }
      }
    } finally {
      setIsAmending(false)
    }
  }

  const handleUndoCommit = async (repo: GeneralRepoEntry) => {
    const p = resolvePath(repo)
    if (!confirm(`Deseja desfazer o último commit de "${repo.name}"?\nO commit será revertido para staging (git reset --soft HEAD~1).`)) {
      return
    }
    if (isElectron() && window.electronAPI?.gitUndoLastCommit) {
      const res = await window.electronAPI.gitUndoLastCommit(p)
      if (res.ok) {
        showFeedback(`Último commit de ${repo.name} desfeito para staging!`)
        hasFetchedRef.current.delete(p)
        void fetchAllVisible(true)
      } else {
        alert(`Falha ao desfazer commit: ${res.error || 'Erro desconhecido'}`)
      }
    }
  }

  // Filtragem dos repositórios
  const filteredRepos = useMemo(() => {
    return repos.filter(r => {
      const matchesSearch =
        !searchTerm.trim() ||
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.group && r.group.toLowerCase().includes(searchTerm.toLowerCase()))

      if (!matchesSearch) return false

      const p = resolvePath(r)
      const st = liveStatuses[p]

      if (filterMode === 'dirty') {
        return st && !st.isClean
      }
      if (filterMode === 'diverged') {
        return st && ((st.ahead || 0) > 0 || (st.behind || 0) > 0)
      }
      if (filterMode === 'warnings') {
        return st?.lastCommit && !st.lastCommit.isConventional
      }
      return true
    })
  }, [repos, searchTerm, filterMode, resolvePath, liveStatuses])

  return (
    <div className="projects-compact-container">
      {/* Controles de Busca e Filtros Rápidos */}
      <div className="projects-view-controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 360 }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Search
              size={14}
              style={{ position: 'absolute', left: 8, color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="projects-amend-input"
              placeholder="Buscar repositório ou grupo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 28, height: 28, fontSize: 12 }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="projects-view-toggle">
            <button
              type="button"
              className={`projects-view-toggle-btn ${filterMode === 'all' ? 'is-active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              Todos ({repos.length})
            </button>
            <button
              type="button"
              className={`projects-view-toggle-btn ${filterMode === 'dirty' ? 'is-active' : ''}`}
              onClick={() => setFilterMode('dirty')}
            >
              Modificados
            </button>
            <button
              type="button"
              className={`projects-view-toggle-btn ${filterMode === 'diverged' ? 'is-active' : ''}`}
              onClick={() => setFilterMode('diverged')}
            >
              Ahead/Behind
            </button>
            <button
              type="button"
              className={`projects-view-toggle-btn ${filterMode === 'warnings' ? 'is-active' : ''}`}
              onClick={() => setFilterMode('warnings')}
            >
              Avisos
            </button>
          </div>

          <button
            type="button"
            className="projects-icon-btn"
            title="Atualizar status Git ao vivo"
            onClick={() => {
              hasFetchedRef.current.clear()
              void fetchAllVisible(true)
              showFeedback('Status Git atualizado com sucesso!')
            }}
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#22c55e',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <CheckCircle2 size={14} />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Tabela Compacta de Repositórios */}
      <div className="projects-table-wrap">
        <table className="projects-table">
          <thead>
            <tr>
              <th style={{ width: '18%', minWidth: 150 }}>Repositório</th>
              <th style={{ width: '9%', minWidth: 75 }}>Branch</th>
              <th style={{ width: '8%', minWidth: 75 }}>Status Local</th>
              <th style={{ width: '9%', minWidth: 80 }}>Sync Remoto</th>
              <th style={{ width: '7%', minWidth: 65 }}>Nuvem / CI</th>
              <th style={{ width: '41%' }}>Último Commit</th>
              <th style={{ width: '8%', minWidth: 80, textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredRepos.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  Nenhum repositório corresponde aos filtros.
                </td>
              </tr>
            ) : (
              filteredRepos.map(repo => {
                const p = resolvePath(repo)
                const st = liveStatuses[p]
                const cloud = cloudStatuses[p]

                const branch = st?.branch || 'main'
                const isClean = st ? st.isClean : true
                const modifiedCount = st?.modifiedCount || 0
                const ahead = st?.ahead || 0
                const behind = st?.behind || 0

                const lastCommit = st?.lastCommit || {
                  hash: '',
                  message: repo.lastCommitMsg || '',
                  relativeTime: '',
                  author: '',
                  isConventional: true,
                }

                return (
                  <tr key={`${repo.group}/${repo.name}`}>
                    {/* Nome do Repositório */}
                    <td>
                      <div className="projects-table-repo-cell">
                        <FolderGit2 size={15} className="projects-table-repo-icon" />
                        <span
                          className="projects-table-repo-name"
                          onClick={() => onSelectRepo(repo.group, repo.name)}
                          title={`Ver detalhes de ${repo.name}`}
                        >
                          {repo.name}
                        </span>
                        {repo.group && (
                          <span className="projects-table-repo-group">{repo.group}</span>
                        )}
                      </div>
                    </td>

                    {/* Branch */}
                    <td>
                      <span className="projects-table-branch" title={`Branch: ${branch}`}>
                        <GitBranch size={11} />
                        <span>{branch}</span>
                      </span>
                    </td>

                    {/* Status Local */}
                    <td>
                      {st ? (
                        isClean ? (
                          <span className="projects-git-badge projects-git-badge-clean">
                            <CheckCircle2 size={11} />
                            <span>Limpo</span>
                          </span>
                        ) : (
                          <span className="projects-git-badge projects-git-badge-dirty" title={`${modifiedCount} arquivos modificados ou não rastreados`}>
                            <span>+{modifiedCount} modif</span>
                          </span>
                        )
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    {/* Sync Remoto */}
                    <td>
                      {ahead === 0 && behind === 0 ? (
                        <span className="projects-git-badge-synced">
                          {st ? '✔ Sincronizado' : '—'}
                        </span>
                      ) : (
                        <div style={{ display: 'flex', gap: 4 }}>
                          {ahead > 0 && (
                            <span className="projects-git-badge projects-git-badge-ahead" title={`${ahead} commits à frente da origin`}>
                              <ArrowUp size={10} /> {ahead}
                            </span>
                          )}
                          {behind > 0 && (
                            <span className="projects-git-badge projects-git-badge-behind" title={`${behind} commits atrás da origin`}>
                              <ArrowDown size={10} /> {behind}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Nuvem / CI */}
                    <td>
                      {cloud?.isGitHub ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {cloud.ciStatus === 'success' && (
                            <span className="projects-ci-badge projects-ci-success" title="GitHub Actions: Sucesso">
                              <CheckCircle2 size={12} />
                            </span>
                          )}
                          {cloud.ciStatus === 'failure' && (
                            <span className="projects-ci-badge projects-ci-failure" title="GitHub Actions: Falha no build">
                              <AlertTriangle size={12} />
                            </span>
                          )}
                          {cloud.ciStatus === 'in_progress' && (
                            <span className="projects-ci-badge projects-ci-running" title="GitHub Actions: Em execução">
                              <RefreshCw size={12} />
                            </span>
                          )}
                          {typeof cloud.openPrs === 'number' && cloud.openPrs > 0 && (
                            <span
                              className="projects-git-badge projects-git-badge-ahead"
                              style={{ fontSize: 10, cursor: 'pointer' }}
                              title={`${cloud.openPrs} Pull Request(s) aberto(s)`}
                              onClick={() => {
                                if (cloud.htmlUrl && isElectron()) {
                                  void window.electronAPI.openExternal(`${cloud.htmlUrl}/pulls`)
                                }
                              }}
                            >
                              <GitPullRequest size={9} /> {cloud.openPrs}
                            </span>
                          )}
                          {cloud.htmlUrl && (
                            <button
                              type="button"
                              className="projects-icon-btn"
                              title="Abrir no GitHub"
                              onClick={() => {
                                if (isElectron()) void window.electronAPI.openExternal(cloud.htmlUrl!)
                              }}
                            >
                              <ExternalLink size={11} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>

                    {/* Último Commit */}
                    <td>
                      <div className="projects-commit-cell">
                        {lastCommit.hash && (
                          <span className="projects-commit-hash">{lastCommit.hash}</span>
                        )}
                        <span className="projects-commit-msg" title={lastCommit.message}>
                          {lastCommit.message || 'Sem commits registrados'}
                        </span>
                        {lastCommit.relativeTime && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, opacity: 0.85 }}>
                            {lastCommit.relativeTime}
                          </span>
                        )}
                        {!lastCommit.isConventional && lastCommit.message && (
                          <span
                            className="projects-commit-warn"
                            title="Commit fora do padrão Conventional Commits. Clique para corrigir."
                            onClick={() => handleOpenAmend(repo, lastCommit.message)}
                          >
                            <AlertTriangle size={10} />
                            <span>Fix</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Ações Rápidas */}
                    <td>
                      <div className="projects-row-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="projects-icon-btn btn-fix"
                          title="Corrigir último commit (git commit --amend)"
                          onClick={() => handleOpenAmend(repo, lastCommit.message)}
                        >
                          <Edit3 size={12} />
                        </button>

                        <button
                          type="button"
                          className="projects-icon-btn btn-undo"
                          title="Desfazer último commit (git reset --soft HEAD~1)"
                          onClick={() => handleUndoCommit(repo)}
                        >
                          <RotateCcw size={12} />
                        </button>

                        <button
                          type="button"
                          className="projects-icon-btn"
                          title="Abrir pasta no Explorer"
                          onClick={() => handleOpenFolder(p)}
                        >
                          <FolderOpen size={12} />
                        </button>

                        <button
                          type="button"
                          className="projects-icon-btn"
                          title="Abrir relatório do projeto"
                          onClick={() => onSelectRepo(repo.group, repo.name)}
                        >
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal / Dialog de Amend 1-Clique */}
      {amendTarget && (
        <div
          className="projects-amend-modal-backdrop"
          onClick={() => !isAmending && setAmendTarget(null)}
        >
          <div className="projects-amend-modal" onClick={e => e.stopPropagation()}>
            <div className="projects-amend-title">
              <Edit3 size={16} style={{ color: 'var(--color-primary, #6366f1)' }} />
              <span>Corrigir Commit — {amendTarget.repoName}</span>
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Mensagem atual:{' '}
              <span style={{ color: 'var(--text-secondary)' }}>"{amendTarget.currentMsg}"</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>
                Nova Mensagem (Conventional Commits):
              </label>
              <input
                type="text"
                className="projects-amend-input"
                value={amendInput}
                onChange={e => setAmendInput(e.target.value)}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') void handleConfirmAmend()
                  if (e.key === 'Escape') setAmendTarget(null)
                }}
              />
            </div>

            <div className="projects-amend-actions">
              <button
                type="button"
                className="projects-btn"
                onClick={() => setAmendTarget(null)}
                disabled={isAmending}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="projects-btn projects-btn-primary"
                onClick={handleConfirmAmend}
                disabled={isAmending || !amendInput.trim()}
              >
                {isAmending ? 'Aplicando Amend...' : 'Confirmar Amend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
