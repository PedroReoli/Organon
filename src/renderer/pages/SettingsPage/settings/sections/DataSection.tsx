import { useEffect, useState } from 'react'
import type { Settings } from '@types'
import { isElectron } from '@utils'
import { Button, Input } from '@shared/components/primitives'
import { HardDrive } from 'lucide-react'

interface DataSectionProps {
  activeSection:    string
  settings:         Settings
  onUpdateSettings: (updates: Partial<Settings>) => void
}

const DEFAULT_REPORTS_DIR = 'F:\\Projetos\\Reoli\\Ecossistema\\data\\reports\\.reportsjson'

export const DataSection = ({ activeSection, settings, onUpdateSettings }: DataSectionProps) => {
  const [dataDirInfo,    setDataDirInfo]    = useState<{ current: string; custom: string | null } | null>(null)
  const [dataDirLoading, setDataDirLoading] = useState(false)
  const [reportsDirLoading, setReportsDirLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (isElectron()) {
        setDataDirInfo(await window.electronAPI.getDataDir())
      } else {
        setDataDirInfo({ current: settings.dataDir ?? 'localStorage', custom: settings.dataDir ?? null })
      }
    }
    load().catch(() => setDataDirInfo(null))
  }, [settings.dataDir])

  const handleSelectDataDir = async () => {
    if (!isElectron()) return
    setDataDirLoading(true)
    try {
      const selected = await window.electronAPI.selectDataDir()
      if (!selected) return
      const ok = await window.electronAPI.setDataDir(selected)
      if (ok) {
        onUpdateSettings({ dataDir: selected })
        setDataDirInfo(await window.electronAPI.getDataDir())
      }
    } finally {
      setDataDirLoading(false)
    }
  }

  const handleResetDataDir = async () => {
    if (!isElectron()) { onUpdateSettings({ dataDir: null }); return }
    setDataDirLoading(true)
    try {
      const ok = await window.electronAPI.setDataDir(null)
      if (ok) {
        onUpdateSettings({ dataDir: null })
        setDataDirInfo(await window.electronAPI.getDataDir())
      }
    } finally {
      setDataDirLoading(false)
    }
  }

  const handleSelectReportsDir = async () => {
    if (!isElectron()) return
    setReportsDirLoading(true)
    try {
      const selected = await window.electronAPI.selectPath()
      if (selected) onUpdateSettings({ reportsDir: selected })
    } finally {
      setReportsDirLoading(false)
    }
  }

  const handleResetReportsDir = () => {
    onUpdateSettings({ reportsDir: null })
  }

  return (
    <section className={`settings-section ${activeSection !== 'data' ? 'settings-section-hidden' : ''}`}>
      <div className="settings-section-header">
        <h3>Armazenamento Local</h3>
        <p className="settings-hint">
          Configure as pastas locais utilizadas pelo Organon para salvar suas notas, base de dados e relatórios.
        </p>
      </div>

      {/* Banner de Dados 100% Locais */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))',
          border: '1px solid color-mix(in srgb, var(--color-primary) 24%, var(--color-border))',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '8px',
            background: 'color-mix(in srgb, var(--color-primary) 18%, transparent)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <HardDrive size={18} />
        </div>
        <div>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text)' }}>
            Dados 100% Locais no seu Computador
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            O Organon opera em regime puramente local e offline. Todos os arquivos ficam salvos nas pastas abaixo sem sincronização externa.
          </div>
        </div>
      </div>

      <div className="settings-data">
        <div className="settings-data-path">
          <label className="form-label">Pasta principal de dados</label>
          <Input fullWidth type="text" value={dataDirInfo?.current ?? ''} readOnly />
          <div className="settings-data-hint">
            {dataDirInfo?.custom ? 'Pasta personalizada' : 'Pasta padrão do sistema'}
          </div>
        </div>
        <div className="settings-data-actions">
          <Button variant="primary" onClick={handleSelectDataDir} disabled={dataDirLoading || !isElectron()}>
            Selecionar pasta
          </Button>
          <Button variant="secondary" onClick={handleResetDataDir} disabled={dataDirLoading}>
            Usar padrao
          </Button>
        </div>
      </div>

      <div className="settings-data">
        <div className="settings-data-path">
          <label className="form-label">Pasta de relatorios de codigo</label>
          <Input fullWidth type="text" value={settings.reportsDir ?? DEFAULT_REPORTS_DIR} readOnly />
          <div className="settings-data-hint">
            {settings.reportsDir ? 'Pasta personalizada' : 'Pasta padrao'}
          </div>
        </div>
        <div className="settings-data-actions">
          <Button variant="primary" onClick={handleSelectReportsDir} disabled={reportsDirLoading || !isElectron()}>
            Selecionar pasta
          </Button>
          <Button variant="secondary" onClick={handleResetReportsDir} disabled={reportsDirLoading}>
            Usar padrao
          </Button>
        </div>
      </div>
    </section>
  )
}
