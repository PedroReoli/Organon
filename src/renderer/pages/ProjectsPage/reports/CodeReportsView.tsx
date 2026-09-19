import React, { useState, useEffect } from 'react'
import { useReports } from './hooks/useReports'
import { GeneralDashboard } from './dashboard/GeneralDashboard'
import { DashboardView } from './dashboard/DashboardView'
import { ProjectView } from './project/ProjectView'
import { PackageJsonView } from './project/PackageJsonView'
import { HistoryView } from './history/HistoryView'
import { OverviewView } from './overview/OverviewView'
import type { RepoReport } from '@types'
import { ReportsConfigView } from './config/ReportsConfigView'
import { ReportsSetupView } from './config/ReportsSetupView'
import { CompareView } from './compare/CompareView'
import { GoalsView } from './goals/GoalsView'
import { SearchView } from './search/SearchView'
import { TimelineView } from './timeline/TimelineView'
import { isElectron } from '@utils'
import { Menu } from 'lucide-react'
import { ProjectsSidebar } from './ProjectsSidebar'
import '../../../styles/features/reports/projects-shell.css'
import '../../../styles/features/reports/projects-compact.css'
import '../../../styles/features/reports/projects-dashboard.css'

export interface CodeReportsViewProps {
  reportsDir?: string | null
  dataDir?: string | null
  onUpdateReportsDir?: (dir: string) => void
}

type Screen = 'general' | 'dashboard' | 'project' | 'history' | 'overview' | 'packagejson' | 'compare' | 'goals' | 'search' | 'timeline' | 'config'

export const CodeReportsView: React.FC<CodeReportsViewProps> = ({ reportsDir, dataDir, onUpdateReportsDir }) => {
  const [resolvedDataDir, setResolvedDataDir] = useState<string | null>(dataDir ?? null)
  const [autoRunState, setAutoRunState] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [autoRunOutput, setAutoRunOutput] = useState('')
  const [scriptRunning, setScriptRunning] = useState(false)
  const [lastRunTime, setLastRunTime] = useState<string | null>(null)
  const [watcherActive, setWatcherActive] = useState(false)

  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (dataDir) {
      setResolvedDataDir(dataDir)
      return
    }
    if (!isElectron()) return
    void (window.electronAPI as any).getDataDir().then((info: { current: string }) => {
      if (info?.current) setResolvedDataDir(info.current)
    })
  }, [dataDir])

  const DEFAULT_REPORTS_JSON_DIR = 'F:\\Projetos\\Reoli\\Ecossistema\\data\\reports\\.reportsjson'
  const effectiveDir = reportsDir || (resolvedDataDir ? resolvedDataDir.replace(/[/\\]+$/, '') + '\\reports\\.reportsjson' : DEFAULT_REPORTS_JSON_DIR)
  const { reports, general, isLoading, error, reload } = useReports(effectiveDir)
  const [screen, setScreen] = useState<Screen>('general')
  const [reportIndex, setReportIndex] = useState(0)
  const [selectedRepo, setSelectedRepo] = useState<RepoReport | null>(null)

  const baseDir = effectiveDir ? effectiveDir.replace(/[/\\]\.reportsjson[/\\]?$/, '') : null

  useEffect(() => {
    if (!isElectron() || !effectiveDir || !baseDir) return
    if (isLoading || autoRunState !== 'idle') return
    if (reports.length > 0 || general) return

    const api = window.electronAPI as any
    const s = baseDir.includes('/') && !baseDir.includes('\\') ? '/' : '\\'
    const scriptPath = baseDir + s + 'generate_report.py'
    const configPath = baseDir + s + 'reports-config.json'

    void (async () => {
      setAutoRunState('running')
      try {
        const entries = await api.readDir(effectiveDir).catch(() => [])
        const hasJsons = entries.some((e: { name: string; isFile: boolean }) => e.isFile && e.name.endsWith('.json'))
        if (hasJsons) {
          setAutoRunState('done')
          reload()
          return
        }

        const configExists = await api.readReportsConfig(configPath)
        if (!configExists) {
          const defaultCfg = {
            scanRoots: [],
            scanPaths: [],
            ignoreFolders: ['node_modules', '.git', 'dist', 'build'],
            maxDepth: 6,
            minIntervalHours: 1,
            reportsJsonDir: effectiveDir,
            weekReportsDir: baseDir + s + '.week-reports',
          }
          await api.writeReportsConfig(configPath, defaultCfg)
        }

        const result = await api.runReportScript(scriptPath)
        if (result.ok) {
          setAutoRunState('done')
          reload()
        } else {
          setAutoRunState('error')
          setAutoRunOutput(result.error || result.output || 'Erro desconhecido')
        }
      } catch (err) {
        setAutoRunState('error')
        setAutoRunOutput(String(err))
      }
    })()
  }, [effectiveDir, baseDir, isLoading, reports.length, general, autoRunState])

  useEffect(() => {
    if (!isElectron() || !watcherActive) return
    const api = window.electronAPI as any
    const handler = () => { void handleRunScript() }
    api.onGitChanged(handler)
    return () => { api.offGitChanged(handler) }
  }, [watcherActive, baseDir])

  const hasData = reports.length > 0 || Boolean(general)
  if (!hasData && (isLoading || autoRunState === 'running' || (autoRunState === 'done' && reports.length === 0 && !general))) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', width: '100%', gap: '16px', color: 'var(--color-text, #f1f5f9)' }}>
        <div style={{ position: 'relative', width: '44px', height: '44px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '3px solid rgba(99, 102, 241, 0.2)',
            borderTopColor: 'var(--color-primary, #6366f1)',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary, #94a3b8)', textAlign: 'center' }}>
          {autoRunState === 'running' ? 'Gerando relatórios...' : 'Carregando relatórios...'}
        </span>
      </div>
    )
  }

  if (error && autoRunState !== 'error') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ color: 'var(--accent-red)' }}>Erro ao carregar: {error}</span>
      </div>
    )
  }

  if (autoRunState === 'error') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
        <span>Falha ao gerar relatórios</span>
        <pre style={{ maxWidth: 600, fontSize: 12, background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px' }}>
          {autoRunOutput}
        </pre>
        <button type="button" onClick={() => setAutoRunState('idle')} style={{ padding: '8px 16px', background: 'var(--bg-tertiary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Tentar novamente
        </button>
      </div>
    )
  }

  if (reports.length === 0 && !general && !isLoading && !error && !effectiveDir && autoRunState === 'idle') {
    return (
      <ReportsSetupView
        onConfirm={async (projectsDir) => {
          if (!isElectron() || !resolvedDataDir) return
          const sep = resolvedDataDir.includes('/') && !resolvedDataDir.includes('\\') ? '/' : '\\'
          const reportsBase = resolvedDataDir.replace(/[/\\]+$/, '') + sep + 'reports'
          const reportsJsonDir = reportsBase + sep + '.reportsjson'
          const configPath = reportsBase + sep + 'reports-config.json'
          const scriptPath = reportsBase + sep + 'generate_report.py'

          const api = window.electronAPI as any
          const cfg = {
            scanRoots: [],
            scanPaths: [projectsDir],
            ignoreFolders: ['node_modules', '.git', 'dist', 'build'],
            maxDepth: 6,
            minIntervalHours: 1,
            reportsJsonDir,
            weekReportsDir: reportsBase + sep + '.week-reports',
          }
          await api.writeReportsConfig(configPath, cfg)
          onUpdateReportsDir?.(reportsJsonDir)
          setAutoRunState('running')

          try {
            const result = await api.runReportScript(scriptPath)
            if (result.ok) {
              setAutoRunState('done')
            } else {
              setAutoRunState('error')
              setAutoRunOutput(result.error || result.output || 'Erro desconhecido')
            }
          } catch (err) {
            setAutoRunState('error')
            setAutoRunOutput(String(err))
          }
        }}
      />
    )
  }

  const handleRunScript = async () => {
    if (!isElectron() || !baseDir || scriptRunning) return
    const api = window.electronAPI as any
    const s = baseDir.includes('/') && !baseDir.includes('\\') ? '/' : '\\'
    const scriptPath = baseDir + s + 'generate_report.py'
    setScriptRunning(true)
    try {
      const result = await api.runReportScript(scriptPath)
      if (result.ok) {
        const now = new Date()
        setLastRunTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
      }
    } finally {
      setScriptRunning(false)
    }
  }

  const handleToggleWatcher = async () => {
    if (!isElectron() || !baseDir) return
    const api = window.electronAPI as any
    if (watcherActive) {
      await api.stopGitWatcher()
      setWatcherActive(false)
    } else {
      const ok = await api.startGitWatcher(baseDir)
      if (ok) setWatcherActive(true)
    }
  }

  const handleSelectRepoFromGeneral = (group: string, name: string) => {
    const report = reports[reportIndex]
    const found = report?.repos.find(r => r.group === group && r.name === name)
    if (found) { setSelectedRepo(found); setScreen('project') }
    else {
      for (const r of reports) {
        const repo = r.repos.find(rr => rr.group === group && rr.name === name)
        if (repo) { setSelectedRepo(repo); setScreen('project'); break }
      }
    }
  }

  const activeScreen = screen === 'project' && selectedRepo ? 'project' : screen

  const renderContent = () => {
    if (activeScreen === 'general' && general) {
      return (
        <GeneralDashboard
          general={general}
          reports={reports}
          onSelectRepo={handleSelectRepoFromGeneral}
          onRunScript={handleRunScript}
          isRunning={scriptRunning}
          lastRun={lastRunTime}
          watcherActive={watcherActive}
          onToggleWatcher={handleToggleWatcher}
        />
      )
    }

    // Caso de fallback ou se for outra tela
    // ... os outros componentes como OverviewView, HistoryView etc permanecem inalterados mas usam a nova área flex=1
    if (activeScreen === 'dashboard' && reports[reportIndex]) {
      return (
        <DashboardView
          report={reports[reportIndex]}
          reportIndex={reportIndex}
          totalReports={reports.length}
          reports={reports}
          onPrev={() => setReportIndex(i => Math.max(0, i - 1))}
          onNext={() => setReportIndex(i => Math.min(reports.length - 1, i + 1))}
          onSelectRepo={(r) => handleSelectRepoFromGeneral(r.group, r.name)}
          onSelectWeek={setReportIndex}
          onGoHistory={() => setScreen('history')}
          onGoOverview={() => setScreen('overview')}
          onGoPackageJson={() => setScreen('packagejson')}
        />
      )
    }

    if (activeScreen === 'project' && selectedRepo) {
      return <ProjectView repo={selectedRepo} onBack={() => setScreen(general ? 'general' : 'dashboard')} />
    }
    if (activeScreen === 'history') {
      return <HistoryView reports={reports} onBack={() => setScreen(general ? 'general' : 'dashboard')} onSelectReport={(i) => { setReportIndex(i); setScreen('dashboard') }} />
    }
    if (activeScreen === 'overview') {
      return <OverviewView reports={reports} onBack={() => setScreen(general ? 'general' : 'dashboard')} onSelectReport={(i) => { setReportIndex(i); setScreen('dashboard') }} />
    }
    if (activeScreen === 'packagejson' && reports[reportIndex]) {
      return <PackageJsonView repos={reports[reportIndex].repos} onBack={() => setScreen(general ? 'general' : 'dashboard')} />
    }
    if (activeScreen === 'config') {
      return <ReportsConfigView baseDir={baseDir ?? ''} onBack={() => setScreen(general ? 'general' : 'dashboard')} onRunComplete={() => { reload() }} />
    }
    if (activeScreen === 'compare') {
      return <CompareView reports={reports} onSelectRepo={(g, n) => { handleSelectRepoFromGeneral(g, n) }} />
    }
    if (activeScreen === 'goals') {
      return <GoalsView reports={reports} general={general} />
    }
    if (activeScreen === 'search') {
      return <SearchView reports={reports} onSelectRepo={(g, n) => { handleSelectRepoFromGeneral(g, n) }} />
    }
    if (activeScreen === 'timeline') {
      return <TimelineView reports={reports} />
    }
    
    // Fallback vazio
    return <div style={{ padding: '24px' }}>Tela em construção ou não disponível.</div>
  }

  return (
    <div className="projects-theme projects-shell">
      {/* Botão Mobile para abrir a sidebar caso a tela seja pequena */}
      <button 
        type="button"
        className="projects-mobile-toggle" 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Abrir menu lateral"
      >
        <Menu size={20} />
      </button>

      {/* Overlay Backdrop para Mobile */}
      <div 
        className={`projects-mobile-overlay ${sidebarOpen ? 'is-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <ProjectsSidebar 
        activeScreen={activeScreen}
        onSelectScreen={(id) => setScreen(id as Screen)}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        repoCount={general?.totalRepos || reports[0]?.repos?.length || 0}
        weekLabel={reports[reportIndex]?.weekLabel || reports[0]?.weekLabel}
        alertsCount={reports[0]?.alerts?.badCommits || 0}
      />
      
      <main className="projects-content-wrapper">
        {renderContent()}
      </main>
    </div>
  )
}
