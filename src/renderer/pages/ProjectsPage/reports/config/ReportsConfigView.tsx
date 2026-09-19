import React from 'react'
import {
  FolderPlus,
  FolderOpen,
  Trash2,
  Plus,
  Folder,
  Check,
  Play,
  Clock,
  Settings2,
  Terminal,
  Sliders,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react'
import { useReportsConfig } from './useReportsConfig'

interface ReportsConfigViewProps {
  baseDir: string
  onBack: () => void
  onRunComplete: () => void
}

export const ReportsConfigView: React.FC<ReportsConfigViewProps> = ({ baseDir, onBack, onRunComplete }) => {
  const {
    config,
    setConfig,
    saved,
    scanRootsInput,
    setScanRootsInput,
    ignoreFoldersInput,
    setIgnoreFoldersInput,
    scanPaths,
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
  } = useReportsConfig(baseDir, onRunComplete)


  return (
    <div className="projects-content-scroll">
      {/* Top Header */}
      <div className="projects-header" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className="projects-btn"
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <div>
            <h1 className="projects-title" style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
              Configurações de Projetos & Relatórios
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
              Gerencie diretórios de busca, parâmetros de varredura e execução do script
            </p>
          </div>
        </div>

        <button
          type="button"
          className="projects-btn"
          style={{
            padding: '8px 18px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: saved ? 'var(--accent-green, #22c55e)' : 'var(--color-primary, #6366f1)',
            borderColor: saved ? 'var(--accent-green, #22c55e)' : 'var(--color-primary, #6366f1)',
            color: '#fff',
            borderRadius: '6px',
            transition: 'all 0.2s ease',
          }}
          onClick={() => void handleSave()}
        >
          {saved ? <><Check size={16} /> Salvo com sucesso!</> : 'Salvar Alterações'}
        </button>
      </div>

      {/* 2-Column Responsive Grid (Full 1920x1080 usage without empty gutters) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
          gap: '14px',
          width: '100%',
          alignItems: 'start',
        }}
      >
        {/* COLUNA 1: DIRETÓRIOS & PASTAS DE VARREDURA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Card: Pastas Adicionais (scanPaths) */}
          <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 className="projects-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <FolderPlus size={16} color="var(--color-primary, #818cf8)" />
                  Pastas Adicionais de Projetos
                </h3>
                <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Diretórios externos ou outras unidades mapeadas para escaneamento Git.
                </p>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                {scanPaths.length} {scanPaths.length === 1 ? 'pasta' : 'pastas'}
              </span>
            </div>

            {/* Ações de adicionar */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="projects-btn"
                onClick={() => void handleBrowseFolder()}
                disabled={browsing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  background: 'var(--color-primary, #6366f1)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <FolderOpen size={14} />
                {browsing ? 'Buscando...' : 'Selecionar Pasta...'}
              </button>

              <div style={{ display: 'flex', flex: 1, minWidth: '220px', gap: '6px' }}>
                <input
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    background: 'var(--bg-primary, #090b10)',
                    border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '7px 12px',
                    background: manualPathInput.trim() ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    cursor: manualPathInput.trim() ? 'pointer' : 'default',
                    fontSize: '12px',
                    opacity: manualPathInput.trim() ? 1 : 0.5,
                  }}
                >
                  <Plus size={14} />
                  Adicionar
                </button>
              </div>
            </div>

            {/* Lista de Pastas Adicionadas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
              {scanPaths.length === 0 ? (
                <div style={{ padding: '14px', background: 'var(--bg-primary)', border: '1px dashed var(--border)', borderRadius: '6px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Nenhuma pasta adicional cadastrada. Use o botão <strong>"Selecionar Pasta..."</strong> para incluir caminhos.
                </div>
              ) : (
                scanPaths.map((p, index) => (
                  <div
                    key={`${p}-${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '7px 10px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                      <Folder size={14} color="var(--color-primary, #818cf8)" style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-primary)',
                          fontFamily: 'var(--font-mono, monospace)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={p}
                      >
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
                        transition: 'color 0.15s',
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent-red, #ef4444)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card: Subpastas & Pastas Ignoradas */}
          <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 className="projects-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Settings2 size={16} color="var(--accent-blue, #38bdf8)" />
              Filtros da Pasta Base
            </h3>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Subpastas Específicas (scanRoots)
              </label>
              <input
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                }}
                value={scanRootsInput}
                onChange={e => setScanRootsInput(e.target.value)}
                placeholder="DomusDev, Pessoais, Reoli, Autocom3 (vazio = todas)"
              />
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                Separe por vírgula. Se vazio, varre todas as subpastas da base.
              </span>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Pastas Ignoradas (ignoreFolders)
              </label>
              <input
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                }}
                value={ignoreFoldersInput}
                onChange={e => setIgnoreFoldersInput(e.target.value)}
                placeholder="node_modules, .git, dist, build, .next"
              />
              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                Diretórios ignorados durante a busca recursiva de repositórios.
              </span>
            </div>
          </div>

          {/* Card: Diretórios de Saída */}
          <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 className="projects-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Terminal size={15} color="var(--accent-yellow, #f59e0b)" />
              Diretórios de Relatórios
            </h3>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                Diretório JSON (.reportsjson)
              </label>
              <input
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono, monospace)',
                  boxSizing: 'border-box',
                }}
                value={config.reportsJsonDir}
                onChange={e => setConfig(c => ({ ...c, reportsJsonDir: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                Diretório Markdown (.week-reports)
              </label>
              <input
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono, monospace)',
                  boxSizing: 'border-box',
                }}
                value={config.weekReportsDir}
                onChange={e => setConfig(c => ({ ...c, weekReportsDir: e.target.value }))}
              />
            </div>
          </div>

        </div>

        {/* COLUNA 2: EXECUÇÃO DO AGENTE & PARÂMETROS AVANÇADOS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Card: Executar Agente */}
          <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="projects-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Play size={16} color="var(--accent-green, #22c55e)" />
                Execução do Agente de Relatórios
              </h3>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: runState === 'running' ? 'rgba(99, 102, 241, 0.2)' : runState === 'ok' ? 'rgba(34, 197, 94, 0.2)' : runState === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: runState === 'running' ? 'var(--color-primary)' : runState === 'ok' ? 'var(--accent-green)' : runState === 'error' ? 'var(--accent-red)' : 'var(--text-secondary)',
                }}
              >
                {runState === 'running' ? 'Executando...' : runState === 'ok' ? 'Concluído' : runState === 'error' ? 'Falhou' : 'Pronto'}
              </span>
            </div>

            {!hasBaseDir ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '6px', color: 'var(--accent-red)', fontSize: '12px' }}>
                <AlertCircle size={16} />
                <span>Pasta base não configurada. Configure a pasta de relatórios antes de executar.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <Clock size={14} />
                    <span>
                      {lastRun
                        ? hoursAgo === 0 ? 'Executado agora há pouco' : `Última execução: há ${hoursAgo}h`
                        : 'Nunca executado'}
                    </span>
                  </div>
                  
                  {!canRun && runState !== 'running' && hoursAgo !== null && (
                    <span style={{ color: 'var(--accent-yellow)', fontSize: '11.5px', fontWeight: 500 }}>
                      Aguarde {minInterval - hoursAgo}h para nova execução
                    </span>
                  )}

                  <button
                    type="button"
                    className="projects-btn"
                    style={{
                      background: 'var(--accent-green, #22c55e)',
                      color: '#000',
                      border: 'none',
                      padding: '7px 16px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: canRun ? 'pointer' : 'not-allowed',
                      opacity: canRun ? 1 : 0.6,
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onClick={() => void handleRun()}
                    disabled={!canRun}
                  >
                    <Play size={13} fill="#000" />
                    {runState === 'running' ? 'Gerando Relatórios...' : 'Executar Agora'}
                  </button>
                </div>

                {/* Console Log de Execução */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Terminal de Saída
                    </span>
                    {runOutput && (
                      <button
                        type="button"
                        onClick={() => setRunOutput('')}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '10.5px', cursor: 'pointer' }}
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      padding: '12px 14px',
                      background: 'var(--bg-primary, #090b10)',
                      borderRadius: '6px',
                      border: `1px solid ${runState === 'error' ? 'rgba(239, 68, 68, 0.4)' : runState === 'ok' ? 'rgba(34, 197, 94, 0.4)' : 'var(--border)'}`,
                      color: runState === 'error' ? '#f87171' : runState === 'ok' ? '#4ade80' : 'var(--text-secondary)',
                      fontSize: '11.5px',
                      fontFamily: 'var(--font-mono, monospace)',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap',
                      minHeight: '140px',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      lineHeight: '1.45',
                    }}
                  >
                    {runOutput || (runState === 'running' ? 'Executando script python generate_report.py...\nAguarde os relatórios serem consolidados...' : 'Pronto para executar. Clique em "Executar Agora" para gerar relatórios atualizados.')}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Card: Parâmetros do Escaneamento */}
          <div className="projects-dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 className="projects-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Sliders size={16} color="var(--color-primary, #818cf8)" />
              Parâmetros de Execução
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Profundidade Máxima (maxDepth)
                </label>
                <input
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                  type="number"
                  min={1}
                  max={10}
                  value={config.maxDepth}
                  onChange={e => setConfig(c => ({ ...c, maxDepth: Number(e.target.value) }))}
                />
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  Níveis de subpastas a percorrer (1 a 10).
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Intervalo Mínimo (horas)
                </label>
                <input
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                  type="number"
                  min={0}
                  max={168}
                  value={config.minIntervalHours}
                  onChange={e => setConfig(c => ({ ...c, minIntervalHours: Number(e.target.value) }))}
                />
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  Cooldown mínimo entre execuções automáticas.
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}