
import type { Playbook, PlaybookDialog } from '@types'
import { WysiwygEditor } from '../../shared/WysiwygEditor'
import { PlaybookExportMenu } from './PlaybookExportMenu'
import { VersionsPanel } from './versions/VersionsPanel'
import { stripHtml } from './utils'

interface PlaybookDetailProps {
  selectedPlaybook:      Playbook
  sortedDialogs:         PlaybookDialog[]
  selectedDialogId:      string | null
  isDetailEditing:       boolean
  detailContentDraft:    string
  setDetailContentDraft: (v: string) => void
  updatePlaybookTitle:   (title: string) => void
  goBackToCatalog:       () => void
  removePlaybookById:    (id: string) => void
  startDetailEdit:       () => void
  cancelDetailEdit:      () => void
  saveDetailContent:     () => void
  openCreateDialogModal: () => void
  openDialogPreviewModal: (dialogId: string) => void
  // Upgrade 15
  showVersionsPanel: boolean
  openVersionsPanel: () => void
  closeVersionsPanel: () => void
  restorePlaybookVersion: (versionId: string) => void
  // New features
  reorderDialogUp: (dialogId: string) => void
  reorderDialogDown: (dialogId: string) => void
  duplicateDialog: (dialogId: string) => void
  quickCopyDialog: (dialog: PlaybookDialog) => void
  quickCopiedId: string | null
  dialogSearch: string
  setDialogSearch: (v: string) => void
  removeDialog: (dialogId: string) => void
  editDialog: (dialog: PlaybookDialog) => void
}

export const PlaybookDetail = ({
  selectedPlaybook, sortedDialogs, selectedDialogId, isDetailEditing,
  detailContentDraft, setDetailContentDraft, updatePlaybookTitle,
  goBackToCatalog, removePlaybookById, startDetailEdit, cancelDetailEdit: _cancelDetailEdit, saveDetailContent: _saveDetailContent,
  openCreateDialogModal, openDialogPreviewModal,
  showVersionsPanel, openVersionsPanel, closeVersionsPanel, restorePlaybookVersion,
  reorderDialogUp, reorderDialogDown, duplicateDialog, quickCopyDialog, quickCopiedId,
  dialogSearch, setDialogSearch, removeDialog, editDialog,
}: PlaybookDetailProps) => {
  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  const filteredDialogs = dialogSearch.trim()
    ? sortedDialogs.filter(d => {
        const q = normalize(dialogSearch)
        return normalize(d.title).includes(q)
          || normalize(stripHtml(d.text)).includes(q)
          || (d.tags ?? []).some(t => normalize(t).includes(q))
      })
    : sortedDialogs

  return (
    <div className="projects-content-scroll">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button type="button" className="projects-btn" onClick={goBackToCatalog} title="Voltar" aria-label="Voltar" style={{ padding: '8px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <input
            type="text"
            className="projects-title"
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', padding: 0 }}
            value={selectedPlaybook.title}
            onChange={e => updatePlaybookTitle(e.target.value)}
            placeholder="Título do Playbook..."
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '12px', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-muted)' }}>{selectedPlaybook.sector}</span>
            <span style={{ fontSize: '12px', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-muted)' }}>{selectedPlaybook.category}</span>
          </div>
        </div>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="projects-btn"
            style={{ background: showVersionsPanel ? 'var(--bg-secondary)' : 'transparent', color: showVersionsPanel ? 'var(--color-primary)' : 'var(--text-muted)' }}
            onClick={() => showVersionsPanel ? closeVersionsPanel() : openVersionsPanel()}
            title="Historico de versoes"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          <PlaybookExportMenu playbook={selectedPlaybook} />
          <button
            type="button"
            className="projects-btn"
            style={{ color: '#ef4444' }}
            onClick={() => removePlaybookById(selectedPlaybook.id)}
            title="Excluir playbook"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-2 14H7L5 6" /><path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', flex: 1, minHeight: 0 }}>
        
        {/* Lado Esquerdo - Editor */}
        <section style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <WysiwygEditor
              content={detailContentDraft}
              onChange={next => {
                setDetailContentDraft(next)
                if (!isDetailEditing) startDetailEdit()
              }}
              placeholder="Escreva o conteúdo do playbook..."
              mode="full"
              floatingToolbox
            />
          </div>
        </section>

        {/* Lado Direito - Dialogos e Historico */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 0 }}>
          {showVersionsPanel && (
            <VersionsPanel
              playbook={selectedPlaybook}
              onRestore={restorePlaybookVersion}
              onClose={closeVersionsPanel}
            />
          )}

          <aside className="projects-board-column" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="projects-column-header" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="projects-column-title">Diálogos</span>
                <span className="projects-column-count">{sortedDialogs.length}</span>
              </div>
              <button type="button" className="projects-btn" style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '6px' }} onClick={openCreateDialogModal} title="Novo dialogo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            <div style={{ padding: '16px 16px 0 16px' }}>
              <input
                type="text"
                className="f-input"
                style={{ width: '100%', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '13px' }}
                placeholder="Buscar dialogos..."
                value={dialogSearch}
                onChange={e => setDialogSearch(e.target.value)}
              />
            </div>

            <div className="projects-column-list" style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              {filteredDialogs.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  {dialogSearch ? 'Nenhum dialogo encontrado.' : 'Nenhum dialogo criado.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredDialogs.map((dialog, index) => (
                    <div
                      key={dialog.id}
                      className={`projects-task-card ${selectedDialogId === dialog.id ? 'is-active' : ''}`}
                      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', border: selectedDialogId === dialog.id ? '1px solid var(--color-primary)' : undefined }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }} onClick={() => openDialogPreviewModal(dialog.id)}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary)', background: 'var(--color-primary)15', padding: '2px 6px', borderRadius: '4px' }}>{index + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', wordBreak: 'break-word' }}>
                            {dialog.title || `Dialogo ${index + 1}`}
                          </div>
                          {(dialog.tags ?? []).length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {dialog.tags!.map(tag => (
                                <span key={tag} style={{ fontSize: '10px', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '8px', color: 'var(--text-muted)' }}>{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        {(dialog.variables ?? []).length > 0 && (
                          <span title="Tem variaveis" style={{ color: '#10b981', background: '#10b98115', padding: '4px', borderRadius: '4px' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                              <path d="M4 7h6M14 7h6M7 4v6M17 14v6" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '8px' }}>
                        <button type="button" className="projects-btn" style={{ padding: '6px', minWidth: '32px', display: 'flex', justifyContent: 'center' }} title="Mover para cima" onClick={(e) => { e.stopPropagation(); reorderDialogUp(dialog.id) }} disabled={index === 0}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="18 15 12 9 6 15" /></svg>
                        </button>
                        <button type="button" className="projects-btn" style={{ padding: '6px', minWidth: '32px', display: 'flex', justifyContent: 'center' }} title="Mover para baixo" onClick={(e) => { e.stopPropagation(); reorderDialogDown(dialog.id) }} disabled={index === filteredDialogs.length - 1}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="6 9 12 15 18 9" /></svg>
                        </button>
                        <button type="button" className="projects-btn" style={{ padding: '6px', minWidth: '32px', display: 'flex', justifyContent: 'center' }} title="Duplicar" onClick={(e) => { e.stopPropagation(); duplicateDialog(dialog.id) }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        </button>
                        <button type="button" className="projects-btn" style={{ padding: '6px', minWidth: '32px', display: 'flex', justifyContent: 'center' }} title="Editar" onClick={(e) => { e.stopPropagation(); editDialog(dialog) }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </button>
                        <button type="button" className="projects-btn" style={{ padding: '6px', minWidth: '32px', display: 'flex', justifyContent: 'center', color: '#ef4444' }} title="Excluir" onClick={(e) => { e.stopPropagation(); if(confirm('Deseja excluir este diálogo?')) removeDialog(dialog.id) }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-2 14H7L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                        </button>
                        <button
                          type="button"
                          className="projects-btn"
                          style={{ padding: '6px', minWidth: '32px', display: 'flex', justifyContent: 'center', color: quickCopiedId === dialog.id ? '#10b981' : 'var(--text-primary)' }}
                          title="Copiar texto"
                          onClick={(e) => { e.stopPropagation(); quickCopyDialog(dialog) }}
                        >
                          {quickCopiedId === dialog.id ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12" /></svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></svg>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
