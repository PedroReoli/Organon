import React, { useState } from 'react'
import { isElectron } from '@utils'

interface RepoScanSectionProps {
  scanPaths: string[]
  onChange: (paths: string[]) => void
}

interface ScanResult {
  path: string
  group: string
  name: string
}

export const RepoScanSection: React.FC<RepoScanSectionProps> = ({ scanPaths, onChange }) => {
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState<ScanResult[] | null>(null)
  const [scanError, setScanError] = useState('')

  const handleAdd = async () => {
    if (!isElectron()) return
    const selected = await window.electronAPI.selectPath()
    if (selected && !scanPaths.includes(selected)) {
      onChange([...scanPaths, selected])
    }
  }

  const handleRemove = (p: string) => {
    onChange(scanPaths.filter(x => x !== p))
  }

  const handleScan = async () => {
    if (!isElectron() || scanPaths.length === 0) return
    setScanning(true)
    setScanResults(null)
    setScanError('')
    try {
      const api = window.electronAPI as any
      const results: ScanResult[] = await api.scanRepos(scanPaths)
      setScanResults(results)
    } catch (err: any) {
      setScanError(err?.message ?? 'Erro ao escanear')
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="rp-cfg-section">
      <h3 className="rp-cfg-section-title">Pastas raiz de repositórios</h3>
      <p className="rp-cfg-hint">Pastas que contêm seus projetos git. O agente vai escanear recursivamente.</p>

      <div className="rp-repo-scan-list">
        {scanPaths.length === 0 && (
          <span className="rp-cfg-hint">Nenhuma pasta cadastrada</span>
        )}
        {scanPaths.map(p => (
          <div key={p} className="rp-repo-scan-item">
            <span className="rp-repo-scan-path">{p}</span>
            <button type="button" className="rp-repo-scan-remove" onClick={() => handleRemove(p)}>x</button>
          </div>
        ))}
      </div>

      <div className="rp-repo-scan-actions">
        <button type="button" className="rp-cfg-browse-btn" onClick={() => void handleAdd()}>
          + Adicionar pasta
        </button>
        <button
          type="button"
          className="rp-cfg-run-btn"
          onClick={() => void handleScan()}
          disabled={scanning || scanPaths.length === 0}
        >
          {scanning ? 'Escaneando...' : 'Escanear repositórios'}
        </button>
      </div>

      {scanError && (
        <span className="rp-cfg-hint" style={{ color: '#ef4444' }}>{scanError}</span>
      )}

      {scanResults !== null && (
        <div className="rp-repo-scan-results">
          <span className="rp-repo-scan-count">
            {scanResults.length} repositório{scanResults.length !== 1 ? 's' : ''} encontrado{scanResults.length !== 1 ? 's' : ''}
          </span>
          <div className="rp-repo-scan-result-list">
            {scanResults.map(r => (
              <span key={r.path} className="rp-repo-scan-result-item">
                <span className="rp-repo-scan-result-group">{r.group}</span>
                <span className="rp-repo-scan-result-name">{r.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}