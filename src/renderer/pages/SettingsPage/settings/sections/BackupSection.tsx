import { useEffect, useState } from 'react'
import type { CalendarEvent } from '@types'
import { isElectron } from '@utils'
import { formatDate, formatFileSize } from '@Settings/settings/utils'
import { Button } from '@shared/components/primitives'
import {
  HardDrive,
  Download,
  FolderOpen,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileDown,
  History,
} from 'lucide-react'

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

const BACKUPS_PER_PAGE = 5

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
  const [feedbackMessage,       setFeedbackMessage]       = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!isElectron()) return
    window.electronAPI.listBackups().then(setBackups).catch(() => {})
  }, [])

  const handleCreateBackup = async () => {
    if (!isElectron()) {
      setFeedbackMessage({ type: 'error', text: 'Operação disponível no aplicativo desktop Organon.' })
      return
    }
    setBackupLoading(true)
    setFeedbackMessage(null)
    try {
      const result = await window.electronAPI.createBackup()
      if (result.success) {
        const updated = await window.electronAPI.listBackups()
        setBackups(updated)
        setBackupPage(0)
        setFeedbackMessage({
          type: 'success',
          text: `Backup gerado com sucesso! Arquivo salvo localmente no histórico.`,
        })
      } else {
        setFeedbackMessage({ type: 'error', text: `Erro ao gerar backup: ${result.error}` })
      }
    } catch (error) {
      setFeedbackMessage({ type: 'error', text: `Erro ao gerar backup: ${error}` })
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

  const totalPages = Math.ceil(backups.length / BACKUPS_PER_PAGE)
  const paginated  = backups.slice(backupPage * BACKUPS_PER_PAGE, (backupPage + 1) * BACKUPS_PER_PAGE)

  return (
    <section className={`settings-section ${activeSection !== 'backup' ? 'settings-section-hidden' : ''}`}>
      <div className="settings-section-header">
        <h3>Backup & Restauração Local</h3>
        <p className="settings-hint">
          Gere cópias de segurança completas, restaure pontos anteriores e gerencie o histórico de dados no seu computador.
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
          marginBottom: '16px',
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
          <ShieldCheck size={18} />
        </div>
        <div>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--color-text)' }}>
            Armazenamento 100% Local & Privado
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Nenhum dado pessoal, nota ou transcrição é transmitido para nuvens externas. Seus dados e backups pertencem unicamente a você.
          </div>
        </div>
      </div>

      {/* Banner de feedback temporário */}
      {feedbackMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: '8px',
            background:
              feedbackMessage.type === 'success'
                ? 'rgba(34, 197, 94, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${feedbackMessage.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: feedbackMessage.type === 'success' ? '#16a34a' : '#ef4444',
            fontSize: '12px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            Fechar
          </button>
        </div>
      )}

      <div className="settings-data-grid">
        {/* Card 1: Gerar Backup Local */}
        <div className="settings-data-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardDrive size={16} style={{ color: 'var(--color-primary)' }} />
            <h4>Gerar Backup Local</h4>
          </div>
          <p className="settings-help-text" style={{ marginBottom: 10 }}>
            Cria um snapshot imediato, validado e arquivado de todas as notas, tarefas, eventos e dados locais.
          </p>
          <div className="settings-backup-actions">
            <Button
              variant="primary"
              onClick={handleCreateBackup}
              disabled={backupLoading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={13} />
              <span>{backupLoading ? 'Gerando Backup...' : 'Gerar Backup Agora'}</span>
            </Button>

            <Button
              variant="secondary"
              onClick={handleOpenBackupsFolder}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <FolderOpen size={13} />
              <span>Abrir Pasta de Backups</span>
            </Button>

            <Button
              variant="secondary"
              onClick={handleMergeFromOldPath}
              disabled={mergeLoading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCcw size={13} />
              <span>{mergeLoading ? 'Processando...' : 'Recuperar Pasta Antiga'}</span>
            </Button>

            {onOpenHistory && (
              <Button
                variant="secondary"
                onClick={onOpenHistory}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <History size={13} />
                <span>Abrir Histórico</span>
              </Button>
            )}
          </div>

          {backups.length > 0 && (
            <div className="settings-backups-list" style={{ marginTop: '12px' }}>
              <div className="settings-backups-header">
                <h4>Backups Salvos no Disco</h4>
                <span className="settings-backups-total">{backups.length} backup(s) encontrado(s)</span>
              </div>
              <div className="settings-backups-items">
                {paginated.map((backup) => (
                  <div key={backup.path} className="settings-backup-item">
                    <div className="settings-backup-item-info">
                      <div className="settings-backup-item-name" style={{ fontWeight: 600 }}>
                        {backup.name}
                      </div>
                      <div className="settings-backup-item-meta">
                        {formatDate(backup.date)} • {formatFileSize(backup.size)} • {backup.notes ?? 0} notas •{' '}
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: backup.valid === false ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                            color: backup.valid === false ? '#ef4444' : '#16a34a',
                            fontWeight: 600,
                            fontSize: '10px',
                          }}
                        >
                          {backup.valid === false ? 'Inválido' : 'Validado'}
                        </span>
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
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setBackupPage((p) => Math.max(0, p - 1))}
                    disabled={backupPage === 0}
                  >
                    ‹
                  </Button>
                  <span className="settings-backups-page-info">
                    {backupPage + 1} / {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setBackupPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={backupPage >= totalPages - 1}
                  >
                    ›
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card 2: Importar dados */}
        <div className="settings-data-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileDown size={16} style={{ color: 'var(--color-primary)' }} />
            <h4>Importar Dados</h4>
          </div>
          <p className="settings-help-text">
            Importe markdowns (.md) existentes como notas ou restaure dados de planejamento a partir de arquivos JSON externos.
          </p>
          <div className="settings-backup-actions">
            <Button
              variant="secondary"
              onClick={handleImportMarkdowns}
              disabled={importMarkdownLoading || !onAddNote}
            >
              {importMarkdownLoading ? 'Importando...' : 'Importar Markdowns (.md)'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleImportPlanningData}
              disabled={importPlanningLoading || !onAddCard || !onAddCalendarEvent}
            >
              {importPlanningLoading ? 'Importando...' : 'Importar Planejamento (.json)'}
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
