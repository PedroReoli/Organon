import { useEffect, useState } from 'react'
import type { CalendarEvent } from '@types'
import { isElectron } from '@utils'
import { formatDate, formatFileSize } from '@Settings/settings/utils'
import { Button } from '@shared/components/primitives'

interface BackupSectionProps {
  activeSection:      string
  showResetConfirm:   boolean
  setShowResetConfirm:(v: boolean) => void
  onResetStore:       () => Promise<void>
  onOpenHistory?:     () => void
  onAddNote?:         (title: string, folderId?: string | null) => any
  onAddCard?:         (title: string, date?: string | null) => any
  onAddCalendarEvent?:(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => any
}

const BACKUPS_PER_PAGE = 3

export const BackupSection = ({
  activeSection, showResetConfirm, setShowResetConfirm,
  onResetStore, onOpenHistory, onAddNote, onAddCard, onAddCalendarEvent,
}: BackupSectionProps) => {
  const [backups,               setBackups]               = useState<Array<{ name: string; path: string; date: string; size: number; category?: string; valid?: boolean; notes?: number }>>([])
  const [backupLoading,         setBackupLoading]         = useState(false)
  const [backupPage,            setBackupPage]            = useState(0)
  const [mergeLoading,          setMergeLoading]          = useState(false)
  const [importMarkdownLoading, setImportMarkdownLoading] = useState(false)
  const [importPlanningLoading, setImportPlanningLoading] = useState(false)

  useEffect(() => {
    if (!isElectron()) return
    window.electronAPI.listBackups().then(setBackups).catch(() => {})
  }, [])

  const handleCreateBackup = async () => {
    if (!isElectron()) return
    setBackupLoading(true)
    try {
      const result = await window.electronAPI.createBackup()
      if (result.success) {
        setBackups(await window.electronAPI.listBackups())
        setBackupPage(0)
        alert('Backup criado com sucesso!')
      } else {
        alert(`Erro ao criar backup: ${result.error}`)
      }
    } catch (error) {
      alert(`Erro ao criar backup: ${error}`)
    } finally {
      setBackupLoading(false)
    }
  }

  const handleOpenBackupsFolder = async () => {
    if (!isElectron()) return
    try {
      const opened = await window.electronAPI.openBackupsFolder()
      if (!opened) alert('Nao foi possivel abrir a pasta de backups.')
    } catch (error) {
      alert(`Erro ao abrir pasta de backups: ${error}`)
    }
  }

  const handleRestoreBackup = async (backupPath: string) => {
    if (!isElectron()) return
    if (!confirm('Tem certeza que deseja restaurar este backup? O estado atual será substituído.')) return
    setBackupLoading(true)
    try {
      const result = await window.electronAPI.restoreBackup(backupPath)
      if (result.success) {
        alert('Backup restaurado com sucesso! A aplicação será recarregada.')
        window.location.reload()
      } else {
        alert(`Erro ao restaurar backup: ${result.error}`)
      }
    } catch (error) {
      alert(`Erro ao restaurar backup: ${error}`)
    } finally {
      setBackupLoading(false)
    }
  }

  const handleMergeFromOldPath = async () => {
    if (!isElectron()) return
    setMergeLoading(true)
    try {
      const oldPath = await window.electronAPI.selectOldDataPath()
      if (!oldPath) return
      const result = await window.electronAPI.mergeDataFromOldPath(oldPath)
      if (result.success) {
        alert(`Dados mesclados com sucesso! ${result.merged} itens adicionados. A aplicação será recarregada.`)
        window.location.reload()
      } else {
        alert(`Erro ao mesclar dados: ${result.error}`)
      }
    } catch (error) {
      alert(`Erro ao mesclar dados: ${error}`)
    } finally {
      setMergeLoading(false)
    }
  }

  const handleImportMarkdowns = async () => {
    if (!isElectron() || !onAddNote) return
    setImportMarkdownLoading(true)
    try {
      const sourceDir = await window.electronAPI.selectOldDataPath()
      if (!sourceDir) return

      const importMarkdownsFn = (window.electronAPI as any).importMarkdowns
      if (typeof importMarkdownsFn !== 'function') {
        alert('API de importacao de markdowns nao disponivel. Reinicie o app para atualizar o preload.')
        return
      }

      const result = await importMarkdownsFn(sourceDir)
      if (result.success && result.files.length > 0) {
        let imported = 0
        for (const file of result.files) {
          try {
            const title = file.name.replace(/\.md$/, '') || 'Nota Importada'
            const note  = onAddNote(title, null)
            let content = file.content.trim()

            if (!content.startsWith('<')) {
              content = content
                .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
                .replace(/^### (.*$)/gim,  '<h3>$1</h3>')
                .replace(/^## (.*$)/gim,   '<h2>$1</h2>')
                .replace(/^# (.*$)/gim,    '<h1>$1</h1>')
                .replace(/^[\*\-\+] (.+)$/gim, '<li>$1</li>')
                .replace(/^\d+\. (.+)$/gim,    '<li>$1</li>')
                .replace(/\[([^\]]+)\]\(([^\)]+)\)/gim, '<a href="$2">$1</a>')
                .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/gim,     '<em>$1</em>')
                .replace(/`([^`]+)`/gim,     '<code>$1</code>')

              const lines: string[] = []
              let inList = false
              for (const raw of content.split('\n')) {
                const line = raw.trim()
                if (!line) {
                  if (inList) { lines.push('</ul>'); inList = false }
                  continue
                }
                if (line.startsWith('<li>')) {
                  if (!inList) { lines.push('<ul>'); inList = true }
                  lines.push(line)
                } else {
                  if (inList) { lines.push('</ul>'); inList = false }
                  lines.push(line.startsWith('<h') || line.startsWith('<ul') || line.startsWith('</ul') ? line : `<p>${line}</p>`)
                }
              }
              if (inList) lines.push('</ul>')
              content = lines.join('\n')
              if (!content.includes('<h') && !content.includes('<p') && !content.includes('<ul')) {
                content = `<p>${content.replace(/\n/g, '<br>')}</p>`
              }
            }

            if (isElectron()) await window.electronAPI.writeNote(note.mdPath, content)
            imported++
          } catch (error) {
            console.error(`Erro ao importar ${file.name}:`, error)
          }
        }
        alert(`${imported} notas importadas com sucesso!`)
      } else if (result.files.length === 0) {
        alert('Nenhum arquivo markdown encontrado na pasta selecionada.')
      } else {
        alert(`Erro ao importar markdowns: ${result.error}`)
      }
    } catch (error) {
      alert(`Erro ao importar markdowns: ${error}`)
    } finally {
      setImportMarkdownLoading(false)
    }
  }

  const handleImportPlanningData = async () => {
    if (!isElectron() || !onAddCard || !onAddCalendarEvent) return
    setImportPlanningLoading(true)
    try {
      const storeJsonPath = await window.electronAPI.selectJsonFile()
      if (!storeJsonPath) return
      const importResult = await window.electronAPI.importPlanningData(storeJsonPath)

      if (importResult.success) {
        let cardsImported = 0, eventsImported = 0

        for (const cardData of (importResult.cardsData ?? [])) {
          try { onAddCard(cardData.title || 'Card Importado', cardData.date || null); cardsImported++ }
          catch (error) { console.error('Erro ao importar card:', error) }
        }

        for (const eventData of (importResult.eventsData ?? [])) {
          try {
            onAddCalendarEvent({
              title: eventData.title || 'Evento Importado',
              date: eventData.date || new Date().toISOString().split('T')[0],
              description: eventData.description || '',
              color: eventData.color || 'var(--color-primary)',
              categoryId: null,
              time: eventData.time || null,
              recurrence: eventData.recurrence || null,
              reminder: eventData.reminder || null,
            })
            eventsImported++
          } catch (error) { console.error('Erro ao importar evento:', error) }
        }

        alert(`${cardsImported} cards e ${eventsImported} eventos importados com sucesso!`)
      } else {
        alert(`Erro ao importar dados de planejamento: ${importResult.error}`)
      }
    } catch (error) {
      alert(`Erro ao importar dados de planejamento: ${error}`)
    } finally {
      setImportPlanningLoading(false)
    }
  }

  if (!isElectron()) return null

  const totalPages = Math.ceil(backups.length / BACKUPS_PER_PAGE)
  const paginated  = backups.slice(backupPage * BACKUPS_PER_PAGE, (backupPage + 1) * BACKUPS_PER_PAGE)

  return (
    <section className={`settings-section ${activeSection !== 'backup' ? 'settings-section-hidden' : ''}`}>
      <div className="settings-section-header">
        <h3>Dados e Recuperação</h3>
      </div>

      <div className="settings-data-grid">
        {/* Backup local */}
        <div className="settings-data-card">
          <h4>Salvar Localmente</h4>
          <p className="settings-help-text" style={{ marginBottom: 10 }}>
            Cria um backup manual completo e validado. Backups manuais não são removidos automaticamente.
          </p>
          <div className="settings-backup-actions">
            <Button variant="primary" onClick={handleCreateBackup} disabled={backupLoading}>
              {backupLoading ? 'Salvando...' : 'Salvar Localmente'}
            </Button>
            <Button variant="secondary" onClick={handleOpenBackupsFolder}>
              Abrir Pasta de Backups
            </Button>
            <Button variant="secondary" onClick={handleMergeFromOldPath} disabled={mergeLoading}>
              {mergeLoading ? 'Processando...' : 'Recuperar Dados de Pasta Antiga'}
            </Button>
            {onOpenHistory && (
              <Button variant="secondary" onClick={onOpenHistory}>
                Abrir Historico
              </Button>
            )}
          </div>

          {backups.length > 0 && (
            <div className="settings-backups-list">
              <div className="settings-backups-header">
                <h4>Backups disponíveis</h4>
                <span className="settings-backups-total">{backups.length} backup(s)</span>
              </div>
              <div className="settings-backups-items">
                {paginated.map(backup => (
                  <div key={backup.path} className="settings-backup-item">
                    <div className="settings-backup-item-info">
                      <div className="settings-backup-item-name">{backup.name}</div>
                      <div className="settings-backup-item-meta">
                        {formatDate(backup.date)} • {formatFileSize(backup.size)} • {backup.notes ?? 0} notas • {backup.valid === false ? 'Inválido' : (backup.category ?? 'Legado')}
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRestoreBackup(backup.path)}
                      disabled={backupLoading || backup.valid === false}
                    >
                      Restaurar
                    </Button>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="settings-backups-pagination">
                  <Button variant="secondary" size="sm" onClick={() => setBackupPage(p => Math.max(0, p - 1))} disabled={backupPage === 0}>‹</Button>
                  <span className="settings-backups-page-info">{backupPage + 1} / {totalPages}</span>
                  <Button variant="secondary" size="sm" onClick={() => setBackupPage(p => Math.min(totalPages - 1, p + 1))} disabled={backupPage >= totalPages - 1}>›</Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Importar dados */}
        <div className="settings-data-card">
          <h4>Importar Dados</h4>
          <p className="settings-help-text">
            Importe markdowns como notas ou dados de planejamento de um arquivo JSON (store/planning/calendar).
          </p>
          <div className="settings-backup-actions">
            <Button variant="secondary" onClick={handleImportMarkdowns} disabled={importMarkdownLoading || !onAddNote}>
              {importMarkdownLoading ? 'Importando...' : 'Importar Markdowns como Notas'}
            </Button>
            <Button variant="secondary" onClick={handleImportPlanningData} disabled={importPlanningLoading || !onAddCard || !onAddCalendarEvent}>
              {importPlanningLoading ? 'Importando...' : 'Importar Dados de Planejamento'}
            </Button>
          </div>
        </div>

        {/* Resetar dados */}
        <div className="settings-data-card">
          <h4>Resetar Dados</h4>
          <p className="settings-reset-warning">
            Esta acao ira apagar todos os dados do aplicativo (cards, eventos, notas, etc.) e nao pode ser desfeita.
          </p>
          {!showResetConfirm ? (
            <Button variant="danger" className="settings-reset-trigger" onClick={() => setShowResetConfirm(true)}>
              Resetar Dados
            </Button>
          ) : (
            <div className="settings-reset-confirm">
              <p className="settings-reset-confirm-text">Tem certeza que deseja resetar todos os dados?</p>
              <div className="settings-reset-confirm-actions">
                <Button
                  variant="danger"
                  className="settings-reset-trigger"
                  onClick={async () => { await onResetStore(); setShowResetConfirm(false) }}
                >
                  Sim, Resetar
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setShowResetConfirm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
