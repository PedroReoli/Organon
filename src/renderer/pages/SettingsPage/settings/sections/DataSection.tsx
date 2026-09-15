import { useEffect, useState } from 'react'
import type { Settings } from '@types'
import { isElectron } from '@utils'
import { Button, Input } from '@shared/components/primitives'

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
        <h3>Pasta de dados</h3>
      </div>

      <div className="settings-data">
        <div className="settings-data-path">
          <label className="form-label">Caminho atual</label>
          <Input fullWidth type="text" value={dataDirInfo?.current ?? ''} readOnly />
          <div className="settings-data-hint">
            {dataDirInfo?.custom ? 'Pasta personalizada' : 'Pasta padrao'}
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
