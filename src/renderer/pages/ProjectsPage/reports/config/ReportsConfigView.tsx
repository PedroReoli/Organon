import React, { useState, useEffect, useMemo } from 'react'
import { isElectron } from '@utils'
import { FolderPlus, FolderOpen, Trash2, Plus, Folder, Check } from 'lucide-react'

function sep(dir: string): string {
  return dir.includes('/') && !dir.includes('\\') ? '/' : '\\'
}

function derivePaths(baseDir: string) {
  const s = sep(baseDir)
  const base = baseDir.replace(/[/\\]+$/, '')
  return {
    scriptPath: base + s + 'generate_report.py',
    configPath: base + s + 'reports-config.json',
    lastRunPath: base + s + '.last_run',
  }
}

interface ReportsConfig {
  scanRoots: string[]
  scanPaths: string[]
  ignoreFolders: string[]
  maxDepth: number
  minIntervalHours: number
  reportsJsonDir: string
  weekReportsDir: string
}

function getDefaultConfig(baseDir: string): ReportsConfig {
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

interface ReportsConfigViewProps {
  baseDir: string
  onBack: () => void
  onRunComplete: () => void
}

type RunState = 'idle' | 'running' | 'ok' | 'error'

export const ReportsConfigView: React.FC<ReportsConfigViewProps> = ({ baseDir, onBack, onRunComplete }) => {
  const hasBaseDir = baseDir.trim().length > 0
  const { scriptPath, configPath, lastRunPath } = hasBaseDir ? derivePaths(baseDir) : { scriptPath: '', configPath: '', lastRunPath: '' }
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
    setTimeout(() => setSaved(false), 2000)
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

  return (
    <div className="projects-content-scroll">
      <div className="projects-header">
        <div>
          <button type="button" className="projects-btn" onClick={onBack} style={{ marginBottom: '8px', padding: '4px 8px', border: 'none', background: 'transparent', paddingLeft: 0, cursor: 'pointer' }}>← Voltar</button>
          <h1 className="projects-title">Configurações de Projetos & Reports</h1>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>

        {/* Gerenciamento de Pastas Adicionais (scanPaths) */}
        <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h3 className="projects-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <FolderPlus size={18} color="var(--accent-primary)" />
                Pastas Adicionais de Projetos
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                Adicione diretórios externos ou outras unidades de disco para escanear repositórios Git.
              </p>
            </div>
            <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              {scanPaths.length} {scanPaths.length === 1 ? 'pasta configurada' : 'pastas configuradas'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="projects-btn"
              onClick={() => void handleBrowseFolder()}
              disabled={browsing}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
            >
              <FolderOpen size={16} />
              {browsing ? 'Selecionando...' : 'Selecionar Pasta...'}
            </button>

            <div style={{ display: 'flex', flex: 1, minWidth: '240px', gap: '6px' }}>
              <input
                style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', fontSize: '13px' }}
                value={manualPathInput}
                onChange={e => setManualPathInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddManualPath() }}
                placeholder="Ou digite o caminho (ex: D:\MeusProjetos)"
              />
              <button
                type="button"
                className="projects-btn"
                onClick={handleAddManualPath}
                disabled={!manualPathInput.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', cursor: manualPathInput.trim() ? 'pointer' : 'default', opacity: manualPathInput.trim() ? 1 : 0.6 }}
              >
                <Plus size={16} />
                Adicionar
              </button>
            </div>
          </div>

          {/* Lista de Pastas Adicionadas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {scanPaths.length === 0 ? (
              <div style={{ padding: '16px', background: 'var(--bg-primary)', border: '1px dashed var(--border)', borderRadius: '6px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Nenhuma pasta adicional cadastrada. Use o botão <strong>"Selecionar Pasta..."</strong> para incluir pastas personalizadas.
              </div>
            ) : (
              scanPaths.map((p, index) => (
                <div
                  key={`${p}-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '8px 12px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <Folder size={16} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono, monospace)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p}>
                      {p}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePath(index)}
                    title="Remover pasta"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '4px',
                      transition: 'color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-red)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Executar Agente */}
        <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 className="projects-card-title">Executar Agente de Relatórios</h3>
          {!hasBaseDir ? (
            <span style={{ color: 'var(--accent-red)', fontSize: '13px' }}>
              Pasta base não configurada. Configure a pasta de reports nas configurações antes de executar.
            </span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="projects-btn"
                style={runState === 'running' ? { opacity: 0.5, pointerEvents: 'none', background: 'var(--accent-primary)', color: '#fff', borderColor: 'var(--accent-primary)' } : { background: 'var(--accent-primary)', color: '#fff', borderColor: 'var(--accent-primary)', cursor: 'pointer' }}
                onClick={() => void handleRun()}
                disabled={!canRun}
              >
                {runState === 'running' ? 'Executando...' : '▶ Executar agora'}
              </button>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                {lastRun
                  ? hoursAgo === 0 ? 'Executado agora' : `Última execução: há ${hoursAgo}h`
                  : 'Nunca executado'}
              </span>
              {!canRun && runState !== 'running' && hoursAgo !== null && (
                <span style={{ color: 'var(--accent-yellow)', fontSize: '13px' }}>Aguarde {minInterval - hoursAgo}h para executar novamente</span>
              )}
            </div>
          )}
          {runOutput && (
            <pre style={{ marginTop: '8px', padding: '16px', background: 'var(--bg-primary)', borderRadius: '6px', border: `1px solid ${runState === 'error' ? 'var(--accent-red)' : 'var(--accent-green)'}`, color: runState === 'error' ? 'var(--accent-red)' : 'var(--accent-green)', fontSize: '12px', overflowX: 'auto', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto' }}>
              {runOutput}
            </pre>
          )}
        </div>

        {/* Pastas Raiz Relativas */}
        <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <h3 className="projects-card-title" style={{ marginBottom: '4px' }}>Subpastas da Pasta Base (scanRoots)</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Nomes de subpastas dentro da pasta base de projetos, separados por vírgula</p>
          </div>
          <input
            style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
            value={scanRootsInput}
            onChange={e => setScanRootsInput(e.target.value)}
            placeholder="DomusDev, Pessoais, Reoli, Autocom3"
          />
        </div>

        {/* Pastas Ignoradas */}
        <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <h3 className="projects-card-title" style={{ marginBottom: '4px' }}>Pastas ignoradas (ignoreFolders)</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Nomes de pastas a ignorar durante a busca recursiva, separados por vírgula</p>
          </div>
          <input
            style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
            value={ignoreFoldersInput}
            onChange={e => setIgnoreFoldersInput(e.target.value)}
            placeholder="Relatorios, node_modules, .git, dist, build, .next"
          />
        </div>

        {/* Profundidade e Intervalo */}
        <div className="projects-dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 className="projects-card-title">Profundidade máxima</h3>
            <input
              style={{ width: '100px', padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
              type="number"
              min={1}
              max={10}
              value={config.maxDepth}
              onChange={e => setConfig(c => ({ ...c, maxDepth: Number(e.target.value) }))}
            />
          </div>

          <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 className="projects-card-title">Intervalo mínimo (horas)</h3>
            <input
              style={{ width: '100px', padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
              type="number"
              min={0}
              max={168}
              value={config.minIntervalHours}
              onChange={e => setConfig(c => ({ ...c, minIntervalHours: Number(e.target.value) }))}
            />
          </div>
        </div>

        {/* Diretórios de Saída */}
        <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 className="projects-card-title">Diretório de relatórios JSON (.reportsjson)</h3>
          <input
            style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
            value={config.reportsJsonDir}
            onChange={e => setConfig(c => ({ ...c, reportsJsonDir: e.target.value }))}
          />
        </div>

        <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 className="projects-card-title">Diretório de relatórios Markdown (.week-reports)</h3>
          <input
            style={{ width: '100%', padding: '10px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
            value={config.weekReportsDir}
            onChange={e => setConfig(c => ({ ...c, weekReportsDir: e.target.value }))}
          />
        </div>

        {/* Botão de Salvar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', marginBottom: '32px' }}>
          <button
            type="button"
            className="projects-btn"
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: saved ? 'var(--accent-green)' : 'var(--accent-primary)',
              borderColor: saved ? 'var(--accent-green)' : 'var(--accent-primary)',
              color: '#fff',
              borderRadius: '6px',
              transition: 'background 0.2s',
            }}
            onClick={() => void handleSave()}
          >
            {saved ? <><Check size={16} /> Salvo com sucesso!</> : 'Salvar Configurações'}
          </button>
        </div>

      </div>
    </div>
  )
}