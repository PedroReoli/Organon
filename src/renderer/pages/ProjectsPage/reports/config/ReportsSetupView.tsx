import React, { useState } from 'react'
import { isElectron } from '@utils'

interface ReportsSetupViewProps {
  onConfirm: (dir: string) => void | Promise<void>
}

function getLastSegment(dir: string): string {
  const normalized = dir.replace(/[/\\]+/g, '/')
  const parts = normalized.split('/').filter(Boolean)
  return parts[parts.length - 1] ?? dir
}

export const ReportsSetupView: React.FC<ReportsSetupViewProps> = ({ onConfirm }) => {
  const [selectedDir, setSelectedDir] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const handleBrowse = async () => {
    if (!isElectron()) return
    setLoading(true)
    try {
      const selected = await window.electronAPI.selectPath()
      if (selected) setSelectedDir(selected)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedDir || confirming) return
    setConfirming(true)
    await onConfirm(selectedDir)
  }

  const dirName = selectedDir ? getLastSegment(selectedDir) : null

  return (
    <div className="rp-setup-root">
      <div className="rp-setup-icon">◈</div>
      <h2 className="rp-setup-title">Configurar Reports</h2>
      <p className="rp-setup-desc">
        Selecione a pasta raiz onde estão seus projetos/repositórios.<br />
        O módulo vai escanear as subpastas em busca de repositórios Git.
      </p>

      <button
        type="button"
        className={`rp-setup-pick-btn ${selectedDir ? 'rp-setup-pick-btn-selected' : ''}`}
        onClick={() => void handleBrowse()}
        disabled={loading}
      >
        {loading ? (
          <span className="rp-setup-pick-loading">Abrindo...</span>
        ) : selectedDir ? (
          <>
            <span className="rp-setup-pick-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5H13A1.5 1.5 0 0 1 14.5 6v5A1.5 1.5 0 0 1 13 12.5H3A1.5 1.5 0 0 1 1.5 11V6" />
              </svg>
            </span>
            <span className="rp-setup-pick-name">{dirName}</span>
            <span className="rp-setup-pick-change">Trocar</span>
          </>
        ) : (
          <>
            <span className="rp-setup-pick-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5H13A1.5 1.5 0 0 1 14.5 6v5A1.5 1.5 0 0 1 13 12.5H3A1.5 1.5 0 0 1 1.5 11V4.5Z" />
              </svg>
            </span>
            <span className="rp-setup-pick-label">Selecionar pasta de projetos</span>
          </>
        )}
      </button>

      {selectedDir && (
        <div className="rp-setup-preview">
          <span className="rp-setup-preview-label">Repositórios serão escaneados em:</span>
          <div className="rp-setup-preview-paths">
            <span className="rp-setup-preview-path">
              <span className="rp-setup-preview-path-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5H13A1.5 1.5 0 0 1 14.5 6v5A1.5 1.5 0 0 1 13 12.5H3A1.5 1.5 0 0 1 1.5 11V4.5Z" />
                </svg>
              </span>
              {dirName}/**/.git
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        className="rp-setup-confirm-btn"
        onClick={() => void handleConfirm()}
        disabled={!selectedDir || confirming}
      >
        {confirming ? 'Configurando...' : 'Confirmar →'}
      </button>
    </div>
  )
}
