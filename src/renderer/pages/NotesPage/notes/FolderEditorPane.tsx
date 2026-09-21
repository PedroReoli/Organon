import React from 'react'
import { FolderTree, Folder } from 'lucide-react'
import type { Note, NoteFolder, BreadcrumbPart } from '@types'
import { WysiwygEditor } from '../editor/WysiwygEditor'
import { FolderIcon, HomeFolderIcon, PageIcon } from './icons'

interface FolderEditorPaneProps {
  selectedFolder:         NoteFolder
  folderContent:          string
  folderTitle:            string
  setFolderTitle:         (t: string) => void
  isFolderLoading:        boolean
  folderBreadcrumb:       BreadcrumbPart[]
  selectedFolderChildren: NoteFolder[]
  folderNotesWithPath:    { note: Note; location: string }[]
  expandedFolders:        Set<string>
  folderTitleInputRef:    React.RefObject<HTMLInputElement>
  newFolderInputRef:      React.RefObject<HTMLInputElement>
  onFolderContentChange:  (folderId: string, html: string) => void
  onFolderTitleBlur:      () => void
  onAddNote:              (folderId?: string | null, parentNoteId?: string | null) => void
  onSetNewFolderParentId: (v: string | null | undefined) => void
  onSetExpandedFolders:   React.Dispatch<React.SetStateAction<Set<string>>>
  onOpenNote:             (noteId: string) => void
  onOpenFolder:           (folderId: string) => void
  onUpdateFolder:         (folderId: string, updates: Partial<Pick<NoteFolder, 'name' | 'parentId' | 'isHome'>>) => void
  buildFolderTrailParts:  (folderId: string | null) => BreadcrumbPart[]
  onOpenTreeManager?:     () => void
}

function fmtTimeRelative(iso?: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  const hr = Math.floor(diff / 3600000)
  const day = Math.floor(diff / 86400000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}m`
  if (hr < 24) return `${hr}h`
  if (day < 7) return `${day}d`
  return `${Math.floor(day / 7)}sem`
}

export const FolderEditorPane = ({
  selectedFolder, folderContent, folderTitle, setFolderTitle, isFolderLoading,
  folderBreadcrumb, selectedFolderChildren, folderNotesWithPath,
  expandedFolders, folderTitleInputRef, newFolderInputRef,
  onFolderContentChange, onFolderTitleBlur,
  onAddNote, onSetNewFolderParentId, onSetExpandedFolders,
  onOpenNote, onOpenFolder, onUpdateFolder, onOpenTreeManager,
}: FolderEditorPaneProps) => {
  const isHomeHub = selectedFolder.isHome

  return (
    <div className="notes-editor-inner">
      {/* ── Breadcrumb Header ────────────────────────────────────────── */}
      {folderBreadcrumb.length > 0 && (
        <div className="notes-editor-breadcrumb">
          {folderBreadcrumb.slice(0, -1).map((part, i) => (
            <span key={part.id} className="notes-bc-item-wrap">
              {i > 0 && <span className="notes-bc-sep">&gt;</span>}
              <button className="notes-bc-item" onClick={() => onOpenFolder(part.id || '')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12" style={{ marginRight: 3 }}>
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                {part.label}
              </button>
            </span>
          ))}
          {folderBreadcrumb.length > 1 && <span className="notes-bc-sep">&gt;</span>}
          <span className="notes-bc-current">{folderBreadcrumb[folderBreadcrumb.length - 1]?.label || selectedFolder.name}</span>
        </div>
      )}

      {/* ── Hero Banner do Hub/Pasta ────────────────────────────────────────── */}
      <div 
        style={{
          margin: '12px 20px 20px 20px',
          padding: '20px 24px',
          borderRadius: '16px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient Glow Background Accent */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: isHomeHub 
              ? 'linear-gradient(90deg, #6366f1, #818cf8, #a855f7)' 
              : 'linear-gradient(90deg, var(--color-primary), var(--color-border))',
          }} 
        />

        {/* Top Header Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          {/* Badge Indicador */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.03em',
                textTransform: 'uppercase',
                background: isHomeHub ? 'rgba(99, 102, 241, 0.15)' : 'var(--color-surface-hover)',
                color: isHomeHub ? 'var(--color-primary)' : 'var(--color-text-muted)',
                border: `1px solid ${isHomeHub ? 'rgba(99, 102, 241, 0.3)' : 'var(--color-border)'}`,
              }}
            >
              {isHomeHub ? <HomeFolderIcon /> : <FolderIcon open={false} />}
              <span>{isHomeHub ? 'Hub Central' : 'Pasta de Notas'}</span>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onOpenTreeManager && (
              <button
                onClick={onOpenTreeManager}
                title="Abrir Central de Gerenciamento da Estrutura em Árvore"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--color-primary)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                <FolderTree size={14} />
                <span>Gerenciar Estrutura</span>
              </button>
            )}

            <button
              className="notes-editor-action"
              onClick={() => onUpdateFolder(selectedFolder.id, { isHome: !selectedFolder.isHome })}
              title={isHomeHub ? 'Remover status de Hub' : 'Transformar esta pasta em um Hub Central'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: isHomeHub ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: isHomeHub ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                border: `1px solid ${isHomeHub ? 'rgba(99, 102, 241, 0.3)' : 'var(--color-border)'}`,
                transition: 'all 0.15s ease',
              }}
            >
              <svg viewBox="0 0 24 24" fill={isHomeHub ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
                <path d="M9 21V12h6v9" fill="var(--color-surface)" />
              </svg>
              <span>{isHomeHub ? 'Hub Ativo' : 'Ativar Hub'}</span>
            </button>

            <button
              onClick={() => onAddNote(selectedFolder.id, null)}
              title="Nova nota nesta pasta"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: 'var(--color-primary)',
                color: '#ffffff',
                border: 'none',
                boxShadow: '0 2px 8px var(--color-primary-glow)',
                transition: 'all 0.15s ease',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Nova Nota</span>
            </button>

            <button
              onClick={() => {
                onSetNewFolderParentId(selectedFolder.id)
                onSetExpandedFolders(prev => new Set([...prev, selectedFolder.id]))
                setTimeout(() => newFolderInputRef.current?.focus(), 50)
              }}
              title="Nova subpasta"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: 'var(--color-surface-hover)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                transition: 'all 0.15s ease',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
              </svg>
              <span>Nova Subpasta</span>
            </button>
          </div>
        </div>

        {/* Title Input */}
        <div style={{ width: '100%' }}>
          <input
            ref={folderTitleInputRef}
            className="notes-editor-title-input notes-folder-title-input"
            value={folderTitle}
            onChange={e => setFolderTitle(e.target.value)}
            onBlur={onFolderTitleBlur}
            placeholder="Nome da pasta..."
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--color-text)',
              letterSpacing: '-0.02em',
            }}
          />
        </div>

        {/* Stats Summary Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '4px', borderTop: '1px dashed var(--color-border)' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            {selectedFolderChildren.length} subpasta{selectedFolderChildren.length !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--color-border)' }}>•</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            </svg>
            {folderNotesWithPath.length} nota{folderNotesWithPath.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── Subpastas ────────────────────────────────────────── */}
      <div className="notes-folder-overview" style={{ padding: '0 20px 24px 20px', gap: '28px' }}>
        
        <section className="notes-folder-section">
          <div className="notes-folder-section-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Subpastas
              </span>
              <span className="notes-folder-section-count">{selectedFolderChildren.length}</span>
            </div>
          </div>
          
          <div className="notes-folder-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '12px' }}>
            {/* Botão Criar Pasta */}
            <button 
              className="notes-folder-card notes-folder-card--create"
              onClick={() => {
                onSetNewFolderParentId(selectedFolder.id)
                onSetExpandedFolders(prev => new Set([...prev, selectedFolder.id]))
                setTimeout(() => newFolderInputRef.current?.focus(), 50)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '12px',
                minWidth: 0,
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <div 
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary)',
                  flexShrink: 0,
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" />
                </svg>
              </div>
              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-primary)' }}>Nova subpasta</span>
            </button>

            {/* Subfolders List */}
            {selectedFolderChildren.map(folder => (
              <button
                key={folder.id}
                className="notes-folder-card"
                onClick={() => {
                  if (folder.isHome) onOpenFolder(folder.id)
                  else onSetExpandedFolders(prev => new Set([...prev, folder.id]))
                }}
                title={folder.isHome ? `Abrir Hub: ${folder.name}` : folder.name || 'Sem nome'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  minWidth: 0,
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <div 
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: folder.isHome ? 'rgba(99, 102, 241, 0.2)' : 'var(--color-surface-hover)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: folder.isHome ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    flexShrink: 0,
                  }}
                >
                  {folder.isHome ? <HomeFolderIcon /> : <FolderIcon open={expandedFolders.has(folder.id)} />}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <span 
                    style={{
                      fontWeight: 600,
                      fontSize: '13px',
                      color: 'var(--color-text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: 1.3,
                    }}
                  >
                    {folder.name || 'Sem nome'}
                  </span>
                  <span style={{ fontSize: '11px', color: folder.isHome ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: 500 }}>
                    {folder.isHome ? 'Hub Central' : 'Pasta'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Notas Soltas Nesta Pasta ────────────────────────────────────────── */}
        <section className="notes-folder-section">
          <div className="notes-folder-section-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Notas nesta pasta
              </span>
              <span className="notes-folder-section-count">{folderNotesWithPath.length}</span>
            </div>
          </div>
          
          <div className="notes-folder-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '12px' }}>
            {/* Botão Criar Nota */}
            <button 
              className="notes-folder-card notes-folder-card--create"
              onClick={() => onAddNote(selectedFolder.id, null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                minWidth: 0,
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <div 
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-primary)',
                  flexShrink: 0,
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="12" x2="12" y2="18" /><line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-primary)' }}>Nova nota aqui</span>
            </button>

            {/* Note Cards */}
            {folderNotesWithPath.map(item => (
              <button 
                key={item.note.id} 
                className="notes-folder-card" 
                onClick={() => onOpenNote(item.note.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '14px 16px',
                  minWidth: 0,
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                {/* Top Row: Icon + Title + Status Badges */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', width: '100%', minWidth: 0 }}>
                  <div 
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--color-surface-hover)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-text-secondary)',
                      flexShrink: 0,
                    }}
                  >
                    <PageIcon />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                      <span 
                        style={{
                          fontWeight: 600,
                          fontSize: '13.5px',
                          color: 'var(--color-text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.3,
                          flex: 1,
                          minWidth: 0,
                        }}
                        title={item.note.title || 'Sem título'}
                      >
                        {item.note.title || 'Sem título'}
                      </span>
                      {item.note.isPinned && (
                        <span style={{ color: '#10b981', flexShrink: 0 }} title="Fixada">
                          <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                          </svg>
                        </span>
                      )}
                      {item.note.isFavorite && (
                        <span style={{ color: '#f59e0b', flexShrink: 0 }} title="Favorita">
                          <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Path / Location Badge + Relative Time */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%', minWidth: 0, paddingTop: '8px', borderTop: '1px solid color-mix(in srgb, var(--color-border) 50%, transparent)' }}>
                  <span 
                    style={{
                      fontSize: '11px',
                      color: 'var(--color-text-muted)',
                      background: 'var(--color-background)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '80%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title={item.location}
                  >
                    <Folder size={11} style={{ flexShrink: 0 }} />
                    <span>{item.location}</span>
                  </span>
                  {item.note.updatedAt && (
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 500, flexShrink: 0 }}>
                      {fmtTimeRelative(item.note.updatedAt)}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* ── Editor de Conteúdo / Rascunhos do Hub ────────────────────────────────────────── */}
      <div 
        style={{
          margin: '0 20px 24px 20px',
          padding: '16px 20px',
          borderRadius: '16px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ color: 'var(--color-primary)' }}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
            Anotações e Conteúdo desta Pasta Hub
          </span>
        </div>

        <div className="notes-editor-content notes-folder-editor-content" style={{ padding: 0 }}>
          {isFolderLoading ? (
            <div className="notes-folder-loading">Carregando conteúdo da pasta...</div>
          ) : (
            <WysiwygEditor
              key={`folder-${selectedFolder.id}`}
              content={folderContent}
              onChange={(html) => onFolderContentChange(selectedFolder.id, html)}
              mode="full"
              placeholder="Escreva aqui o conteúdo, índice ou rascunhos desta pasta hub..."
              floatingToolbox
              disableImages
              hideToolbar={true}
            />
          )}
        </div>
      </div>
    </div>
  )
}
