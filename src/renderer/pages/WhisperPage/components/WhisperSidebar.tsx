import React, { useState } from 'react'
import { WhisperFolder, WhisperRecord, DEFAULT_WHISPER_FOLDERS } from '../types/whisper.types'
import { WhisperContextMenu } from './WhisperContextMenu'

interface Props {
  folders: WhisperFolder[]
  records: WhisperRecord[]
  selectedRecordId: string | null
  selectedFolderId: string | null
  onSelectRecord: (id: string) => void
  onSelectFolder: (folderId: string | null) => void
  onAddFolder: (name: string) => void
  onRenameRecord?: (id: string, newTitle: string) => void
  onMoveRecord?: (id: string, folderId: string | null) => void
  onDeleteRecord?: (id: string) => void
  onNewTranscript?: () => void
  onCloseDrawer?: () => void
}

export const WhisperSidebar: React.FC<Props> = ({
  folders = DEFAULT_WHISPER_FOLDERS,
  records,
  selectedRecordId,
  selectedFolderId,
  onSelectRecord,
  onSelectFolder,
  onAddFolder,
  onRenameRecord,
  onMoveRecord,
  onDeleteRecord,
  onNewTranscript,
  onCloseDrawer,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddingFolder, setIsAddingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [foldersCollapsed, setFoldersCollapsed] = useState(false)
  const [recordsCollapsed, setRecordsCollapsed] = useState(false)

  // Estado para substituição de prompt() e confirm()
  const [renamingRecord, setRenamingRecord] = useState<{ id: string; title: string } | null>(null)
  const [deletingRecord, setDeletingRecord] = useState<{ id: string; title: string } | null>(null)

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    recordId: string
  } | null>(null)

  const filteredRecords = records.filter(r => {
    const matchesFolder = selectedFolderId === null || r.folderId === selectedFolderId
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.fullTranscript.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFolder && matchesSearch
  })

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return
    onAddFolder(newFolderName.trim())
    setNewFolderName('')
    setIsAddingFolder(false)
  }

  const handleContextMenu = (e: React.MouseEvent, recordId: string) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      recordId,
    })
  }

  const handleActionRename = (rec: WhisperRecord) => {
    setRenamingRecord({ id: rec.id, title: rec.title })
  }

  const handleConfirmRename = () => {
    if (renamingRecord && renamingRecord.title.trim() && onRenameRecord) {
      onRenameRecord(renamingRecord.id, renamingRecord.title.trim())
    }
    setRenamingRecord(null)
  }

  const handleActionCopy = (rec: WhisperRecord) => {
    navigator.clipboard.writeText(rec.fullTranscript)
  }

  const handleActionDelete = (rec: WhisperRecord) => {
    setDeletingRecord({ id: rec.id, title: rec.title })
  }

  const handleConfirmDelete = () => {
    if (deletingRecord && onDeleteRecord) {
      onDeleteRecord(deletingRecord.id)
    }
    setDeletingRecord(null)
  }

  const handleActionMove = (rec: WhisperRecord, folderId: string | null) => {
    if (onMoveRecord) {
      onMoveRecord(rec.id, folderId)
    }
  }

  const ctxRecord = contextMenu ? records.find(r => r.id === contextMenu.recordId) || null : null

  return (
    <div
      onClick={() => setContextMenu(null)}
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        position: 'relative',
        fontSize: '12px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Header da Sidebar de Histórico (Harmonizado com o painel de inteligência) */}
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          background: 'var(--color-surface)',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
            <span>Histórico & Pastas</span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Minhas Transcrições
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {onNewTranscript && (
            <button
              onClick={onNewTranscript}
              title="Nova gravação"
              style={{
                padding: '4px 10px',
                height: '28px',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--color-primary)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                lineHeight: '1',
                flexShrink: 0,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Nova</span>
            </button>
          )}
        </div>
      </div>

      {/* Menu de Contexto */}
      <WhisperContextMenu
        ctxMenu={contextMenu}
        record={ctxRecord}
        folders={folders}
        onClose={() => setContextMenu(null)}
        onRename={handleActionRename}
        onCopy={handleActionCopy}
        onMove={handleActionMove}
        onDelete={handleActionDelete}
      />

      {/* Modal/Overlay Inline para Renomear (Sem prompt native) */}
      {renamingRecord && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '16px',
              width: '100%',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }}
          >
            <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
              Renomear Gravação
            </h4>
            <input
              type="text"
              value={renamingRecord.title}
              onChange={e => setRenamingRecord({ ...renamingRecord, title: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && handleConfirmRename()}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '12px',
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRenamingRecord(null)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRename}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal/Overlay Inline para Deletar (Sem confirm native) */}
      {deletingRecord && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(2px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '16px',
              width: '100%',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }}
          >
            <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, color: 'var(--color-text)' }}>
              Excluir Gravação?
            </h4>
            <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
              Tem certeza que deseja excluir "{deletingRecord.title}"? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeletingRecord(null)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-background)',
                  color: 'var(--color-text)',
                  fontSize: '11.5px',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campo de Busca Compacto */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ position: 'absolute', left: '8px', color: 'var(--color-text-muted)', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar gravações..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '5px 24px 5px 26px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-background)',
              color: 'var(--color-text)',
              fontSize: '11.5px',
              outline: 'none',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '6px',
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '2px',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Seção de Pastas */}
      <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '6px' }}>
        <div
          onClick={() => setFoldersCollapsed(!foldersCollapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px 4px 12px',
            fontSize: '10.5px',
            fontWeight: 800,
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            letterSpacing: '0.5px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ transform: foldersCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <span>Pastas</span>
          </div>
          <button
            onClick={e => {
              e.stopPropagation()
              setIsAddingFolder(true)
            }}
            title="Criar nova pasta"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            +
          </button>
        </div>

        {!foldersCollapsed && (
          <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {isAddingFolder && (
              <div style={{ padding: '4px 6px', display: 'flex', gap: '4px' }}>
                <input
                  type="text"
                  placeholder="Nome da pasta"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                  style={{
                    flex: 1,
                    padding: '3px 6px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontSize: '11px',
                  }}
                  autoFocus
                />
                <button
                  onClick={handleCreateFolder}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: 'none',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Criar
                </button>
              </div>
            )}

            <button
              onClick={() => onSelectFolder(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 8px',
                borderRadius: '6px',
                border: 'none',
                background: selectedFolderId === null ? 'color-mix(in srgb, var(--color-primary) 14%, transparent)' : 'transparent',
                color: selectedFolderId === null ? 'var(--color-primary)' : 'var(--color-text)',
                fontSize: '11.5px',
                fontWeight: selectedFolderId === null ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span>Todas as Reuniões</span>
              </div>
              <span style={{ fontSize: '10px', opacity: 0.6 }}>{records.length}</span>
            </button>

            {folders.map(folder => {
              const isSelected = selectedFolderId === folder.id
              const count = records.filter(r => r.folderId === folder.id).length

              return (
                <button
                  key={folder.id}
                  onClick={() => onSelectFolder(folder.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '5px 8px',
                    borderRadius: '6px',
                    border: 'none',
                    background: isSelected ? 'color-mix(in srgb, var(--color-primary) 14%, transparent)' : 'transparent',
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                    fontSize: '11.5px',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={folder.color || 'currentColor'} strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</span>
                  </div>
                  <span style={{ fontSize: '10px', opacity: 0.6 }}>{count}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Lista de Registros / Histórico Estilo Notas */}
      <div style={{ flex: 1, padding: '6px 8px', overflowY: 'auto' }}>
        <div
          onClick={() => setRecordsCollapsed(!recordsCollapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 4px 6px 4px',
            fontSize: '10.5px',
            fontWeight: 800,
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            letterSpacing: '0.5px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ transform: recordsCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <span>Histórico</span>
          </div>
          <span style={{ fontSize: '10px', opacity: 0.6 }}>{filteredRecords.length}</span>
        </div>

        {!recordsCollapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {filteredRecords.length === 0 ? (
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', padding: '12px 8px', textAlign: 'center' }}>
                Nenhuma gravação encontrada.
              </div>
            ) : (
              filteredRecords.map(rec => {
                const isSelected = selectedRecordId === rec.id

                return (
                  <div
                    key={rec.id}
                    onClick={() => onSelectRecord(rec.id)}
                    onContextMenu={e => handleContextMenu(e, rec.id)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--color-primary)' : 'transparent',
                      background: isSelected ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'transparent',
                      color: 'var(--color-text)',
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      transition: 'background 0.12s ease, border-color 0.12s ease',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isSelected ? 'var(--color-primary)' : 'currentColor'} strokeWidth="2" style={{ flexShrink: 0 }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span
                          style={{
                            fontWeight: isSelected ? 700 : 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1,
                          }}
                        >
                          {rec.title}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--color-text-muted)', paddingLeft: '18px' }}>
                        <span>{new Date(rec.createdAt).toLocaleDateString('pt-BR')}</span>
                        <span>·</span>
                        <span style={{ fontFamily: 'monospace' }}>
                          {Math.round(rec.durationSeconds / 60)} min
                        </span>
                      </div>
                    </div>

                    {/* Botão de 3 Pontos (...) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        const rect = e.currentTarget.getBoundingClientRect()
                        setContextMenu({
                          x: rect.left,
                          y: rect.bottom + 4,
                          recordId: rec.id,
                        })
                      }}
                      title="Opções da gravação"
                      style={{
                        padding: '4px 6px',
                        borderRadius: '4px',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        lineHeight: 1,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="1.2" />
                        <circle cx="19" cy="12" r="1.2" />
                        <circle cx="5" cy="12" r="1.2" />
                      </svg>
                    </button>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Popover do Menu de Contexto (Ao Clicar no ... ou Botão Direito) */}
      <WhisperContextMenu
        ctxMenu={contextMenu}
        record={ctxRecord}
        folders={folders}
        onClose={() => setContextMenu(null)}
        onRename={handleActionRename}
        onCopy={handleActionCopy}
        onMove={handleActionMove}
        onDelete={handleActionDelete}
      />
    </div>
  )
}
