import { useState, useEffect, useMemo } from 'react'
import { isElectron } from '@utils'

export function sep(dir: string): string {
  return dir.includes('/') && !dir.includes('\\') ? '/' : '\\'
}

export function derivePaths(baseDir: string) {
  const s = sep(baseDir)
  const base = baseDir.replace(/[/\\]+$/, '')
  return {
    scriptPath: base + s + 'generate_report.py',
    configPath: base + s + 'reports-config.json',
    lastRunPath: base + s + '.last_run',
  }
}

export interface ReportsConfig {
  scanRoots: string[]
  scanPaths: string[]
  ignoreFolders: string[]
  maxDepth: number
  minIntervalHours: number
  reportsJsonDir: string
  weekReportsDir: string
}

export function getDefaultConfig(baseDir: string): ReportsConfig {
  const s = sep(baseDir)
  const base = baseDir.replace(/[/\\]+$/, '')
  return {
    scanRoots: [],
    scanPaths: [],
    ignoreFolders: ['node_modules', '.git', 'dist', 'build'],
    maxDepth: 6,
    minIntervalHours: 1,
    reportsJsonDir: base + s + '.reportsjson',
    weekReportsDir: base + s + '.week-reports',
  }
}

export type RunState = 'idle' | 'running' | 'ok' | 'error'

export function useReportsConfig(baseDir: string, onRunComplete: () => void) {
  const hasBaseDir = baseDir.trim().length > 0
  const { scriptPath, configPath, lastRunPath } = hasBaseDir
    ? derivePaths(baseDir)
    : { scriptPath: '', configPath: '', lastRunPath: '' }
  const defaultConfig = useMemo(() => getDefaultConfig(baseDir), [baseDir])
  const [config, setConfig] = useState<ReportsConfig>(defaultConfig)
  const [lastRun, setLastRun] = useState<string | null>(null)
  const [runState, setRunState] = useState<RunState>('idle')
  const [runOutput, setRunOutput] = useState('')
  const [saved, setSaved] = useState(false)
  const [scanRootsInput, setScanRootsInput] = useState(defaultConfig.scanRoots.join(', '))
  const [ignoreFoldersInput, setIgnoreFoldersInput] = useState(defaultConfig.ignoreFolders.join(', '))
  const [scanPaths, setScanPaths] = useState<string[]>([])
  const [manualPathInput, setManualPathInput] = useState('')
  const [browsing, setBrowsing] = useState(false)

  useEffect(() => {
    if (!isElectron()) return
    const api = window.electronAPI as any
    void api.readReportsConfig(configPath).then((cfg: ReportsConfig | null) => {
      if (cfg) {
        setConfig({ ...defaultConfig, ...cfg })
        setScanRootsInput((cfg.scanRoots ?? defaultConfig.scanRoots).join(', '))
        setIgnoreFoldersInput((cfg.ignoreFolders ?? defaultConfig.ignoreFolders).join(', '))
        setScanPaths(cfg.scanPaths ?? [])
      }
    })
    void api.getReportsLastRun(lastRunPath).then((ts: string | null) => setLastRun(ts))
  }, [configPath, lastRunPath])

  const hoursAgo = lastRun ? Math.round((Date.now() - new Date(lastRun).getTime()) / 3600000) : null
  const minInterval = config.minIntervalHours ?? 1
  const canRun = hasBaseDir && runState !== 'running' && (hoursAgo === null || hoursAgo >= minInterval)

  const handleBrowseFolder = async () => {
    if (!isElectron() || browsing) return
    setBrowsing(true)
    try {
      const api = window.electronAPI as any
      const selected = typeof api.selectPath === 'function'
        ? await api.selectPath()
        : typeof api.projectSelectFolder === 'function'
          ? await api.projectSelectFolder()
          : null

      if (selected && typeof selected === 'string') {
        const trimmed = selected.trim()
        if (trimmed && !scanPaths.includes(trimmed)) {
          setScanPaths(prev => [...prev, trimmed])
        }
      }
    } finally {
      setBrowsing(false)
    }
  }

  const handleAddManualPath = () => {
    const trimmed = manualPathInput.trim()
    if (!trimmed) return
    if (!scanPaths.includes(trimmed)) {
      setScanPaths(prev => [...prev, trimmed])
    }
    setManualPathInput('')
  }

  const handleRemovePath = (indexToRemove: number) => {
    setScanPaths(prev => prev.filter((_, i) => i !== indexToRemove))
  }

  const handleSave = async () => {
    if (!isElectron()) return
    const api = window.electronAPI as any
    const cfg = {
      ...config,
      scanRoots: scanRootsInput.split(',').map((s: string) => s.trim()).filter(Boolean),
      ignoreFolders: ignoreFoldersInput.split(',').map((s: string) => s.trim()).filter(Boolean),
      scanPaths: scanPaths.map(p => p.trim()).filter(Boolean),
    }
    await api.writeReportsConfig(configPath, cfg)
    setConfig(cfg)
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  const handleRun = async () => {
    if (!isElectron() || !canRun) return
    const api = window.electronAPI as any
    setRunState('running')
    setRunOutput('')
    const result = await api.runReportScript(scriptPath)
    setRunState(result.ok ? 'ok' : 'error')
    setRunOutput(result.ok ? result.output : (result.error || result.output))
    if (result.ok) {
      const ts = await api.getReportsLastRun(lastRunPath)
      setLastRun(ts)
      onRunComplete()
    }
  }

  return {
    config,
    setConfig,
    saved,
    scanRootsInput,
    setScanRootsInput,
    ignoreFoldersInput,
    setIgnoreFoldersInput,
    scanPaths,
    setScanPaths,
    manualPathInput,
    setManualPathInput,
    browsing,
    hasBaseDir,
    lastRun,
    runState,
    runOutput,
    setRunOutput,
    canRun,
    hoursAgo,
    minInterval,
    handleBrowseFolder,
    handleAddManualPath,
    handleRemovePath,
    handleSave,
    handleRun,
  }
}
