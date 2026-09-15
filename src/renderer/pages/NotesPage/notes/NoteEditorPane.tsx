import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Note } from '@types'
import { WysiwygEditor } from '../../shared/WysiwygEditor'
import type { BreadcrumbPart } from '@types'
import { organonApi } from '../../../../api/organon'
import { isElectron } from '@utils'

interface NoteRevision {
  id: string
  content: string
  createdAt: string
  [key: string]: unknown
}

interface NoteEditorPaneProps {
  selectedNote:      Note
  notes:             Note[]
  noteContent:    string
  noteTitle:      string
  setNoteTitle:   (t: string) => void
  noteBreadcrumb: BreadcrumbPart[]
  subNotes:          (parentNoteId: string) => Note[]
  titleInputRef:     React.RefObject<HTMLInputElement>
  selectedNoteLocked: boolean
  onContentChange:   (noteId: string, html: string) => void
  onTitleBlur:       () => void
  onToggleLock:      (noteId: string) => void
  onToggleFavorite:  (noteId: string) => void
  onTogglePinned:    (noteId: string) => void
  onAddNote:         (folderId?: string | null, parentNoteId?: string | null) => void
  onRequestDelete:   (noteId: string) => void
  onOpenNote:        (noteId: string) => void
  onOpenFolder:      (folderId: string) => void
  onUpdateNote?:     (id: string, updates: Partial<Note>) => void
}

// ── History panel ────────────────────────────────────────────────────────────

function fmtRevDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

function stripHtml(html: string, maxLen = 120) {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

// ── Main component ────────────────────────────────────────────────────────────

export const NoteEditorPane = ({
  selectedNote, notes, noteContent, noteTitle, setNoteTitle, noteBreadcrumb, subNotes, titleInputRef, selectedNoteLocked,
  onContentChange, onTitleBlur,
  onToggleLock, onToggleFavorite, onTogglePinned, onAddNote, onRequestDelete,
  onOpenNote, onOpenFolder, onUpdateNote,
}: NoteEditorPaneProps) => {
  const [newTagInput, setNewTagInput] = useState('')

  const handleExportMarkdown = useCallback(() => {
    const title = selectedNote.title || 'nota'
    const textContent = noteContent.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]*>/g, '')
    const blob = new Blob([`# ${title}\n\n${textContent}`], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.toLowerCase().replace(/[^a-z0-9_-]/gi, '_')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [selectedNote.title, noteContent])

  const handleExportPDF = useCallback(() => {
    window.print()
  }, [])

  const handleAddTag = useCallback(() => {
    const tag = newTagInput.trim().replace(/^#/, '')
    if (!tag || !onUpdateNote) return
    const currentTags = selectedNote.tags || []
    if (!currentTags.includes(tag)) {
      onUpdateNote(selectedNote.id, { tags: [...currentTags, tag] })
    }
    setNewTagInput('')
  }, [newTagInput, onUpdateNote, selectedNote.id, selectedNote.tags])

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    if (!onUpdateNote) return
    const currentTags = selectedNote.tags || []
    onUpdateNote(selectedNote.id, { tags: currentTags.filter(t => t !== tagToRemove) })
  }, [onUpdateNote, selectedNote.id, selectedNote.tags])
  const noteSubpages = subNotes(selectedNote.id)
  const noteTitlesById = useMemo(
    () => Object.fromEntries(notes.map((note) => [note.id, note.title || 'Nova nota'])),
    [notes],
  )

  // ── Word count ─────────────────────────────────────────────────────────────
  const { wordCount, readingTime } = useMemo(() => {
    const text = noteContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const words = text ? text.split(' ').filter(Boolean).length : 0
    return { wordCount: words, readingTime: Math.max(1, Math.ceil(words / 200)) }
  }, [noteContent])

  // ── Revision history ───────────────────────────────────────────────────────
  const [historyOpen,      setHistoryOpen]      = useState(false)
  const [revisions,        setRevisions]        = useState<NoteRevision[]>([])
  const [revisionsLoading, setRevisionsLoading] = useState(false)
  const [revisionsError,   setRevisionsError]   = useState<string | null>(null)
  const [previewRevision,  setPreviewRevision]  = useState<NoteRevision | null>(null)

  const loadRevisions = useCallback(async (noteId: string) => {
    setRevisionsLoading(true)
    setRevisionsError(null)
    try {
      const res = await organonApi.notes.revisions(noteId)
      const data = (res.data ?? []) as NoteRevision[]
      setRevisions(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch {
      setRevisionsError('Não foi possível carregar o histórico. Verifique sua conexão.')
      setRevisions([])
    } finally {
      setRevisionsLoading(false)
    }
  }, [])

  const toggleHistory = useCallback(() => {
    setHistoryOpen(prev => {
      const next = !prev
      if (next && revisions.length === 0 && !revisionsLoading) loadRevisions(selectedNote.id)
      return next
    })
    setPreviewRevision(null)
  }, [revisions.length, revisionsLoading, loadRevisions, selectedNote.id])

  // Reset history when note changes
  useEffect(() => {
    setHistoryOpen(false)
    setRevisions([])
    setRevisionsError(null)
    setPreviewRevision(null)
  }, [selectedNote.id])

  // ── Backlinks ──────────────────────────────────────────────────────────────
  const [backlinksExpanded, setBacklinksExpanded] = useState(false)
  const [backlinkNotes,     setBacklinkNotes]     = useState<Note[]>([])
  const [backlinksLoaded,   setBacklinksLoaded]   = useState(false)
  const [backlinksLoading,  setBacklinksLoading]  = useState(false)
  const backlinksAbortRef = useRef(false)

  const loadBacklinks = useCallback(async () => {
    if (!isElectron() || backlinksLoaded) return
    setBacklinksLoading(true)
    backlinksAbortRef.current = false
    const results: Note[] = []
    const others = notes.filter(n => n.id !== selectedNote.id)
    await Promise.all(
      others.map(async n => {
        try {
          if (!n.mdPath) return
          const content = await window.electronAPI.readNote(n.mdPath)
          if (!backlinksAbortRef.current && content.includes(selectedNote.id)) {
            results.push(n)
          }
        } catch { /* ignora */ }
      })
    )
    if (!backlinksAbortRef.current) {
      setBacklinkNotes(results)
      setBacklinksLoaded(true)
    }
    setBacklinksLoading(false)
  }, [notes, selectedNote.id, backlinksLoaded])

  const handleToggleBacklinks = useCallback(() => {
    setBacklinksExpanded(prev => {
      if (!prev && !backlinksLoaded) loadBacklinks()
      return !prev
    })
  }, [backlinksLoaded, loadBacklinks])

  // Reset backlinks when note changes
  useEffect(() => {
    backlinksAbortRef.current = true
    setBacklinksExpanded(false)
    setBacklinkNotes([])
    setBacklinksLoaded(false)
    setBacklinksLoading(false)
  }, [selectedNote.id])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="notes-editor-inner">
      {noteBreadcrumb.length > 0 && (
        <div className="notes-editor-breadcrumb">
          {noteBreadcrumb.map((part: BreadcrumbPart, i: number) => (
            <span key={part.id} className="notes-bc-item-wrap">
              {i > 0 && <span className="notes-bc-sep">&gt;</span>}
              <button className="notes-bc-item" onClick={() => part.kind === 'note' ? onOpenNote(part.id) : onOpenFolder(part.id)}>
                {part.kind === 'folder' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12" style={{ marginRight: 3 }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12" style={{ marginRight: 3 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                )}
                {part.label}
              </button>
            </span>
          ))}
          <span className="notes-bc-sep">&gt;</span>
          <span className="notes-bc-current">{selectedNote.title || 'Sem titulo'}</span>
        </div>
      )}

      <div className="notes-editor-top-bar">
        <div className="notes-editor-title-wrap">
          <input
            ref={titleInputRef}
            className={`notes-editor-title-input${selectedNoteLocked ? ' is-locked' : ''}`}
            value={noteTitle}
            onChange={e => setNoteTitle(e.target.value)}
            onBlur={onTitleBlur}
            placeholder="Sem titulo"
            readOnly={selectedNoteLocked}
          />
          {selectedNoteLocked && (
            <span className="notes-editor-locked-icon" title="Nota trancada">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v1" /></svg>
            </span>
          )}
        </div>
        <div className="notes-editor-toolbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Chips de Tags inline na barra direita */}
          {(selectedNote.tags || []).map((tag: string) => (
            <span key={tag} style={{ fontSize: '11px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '12px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              #{tag}
              {!selectedNoteLocked && (
                <button
                  onClick={() => handleRemoveTag(tag)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '11px', padding: 0, lineHeight: 1 }}
                  title="Remover tag"
                >
                  &times;
                </button>
              )}
            </span>
          ))}
          {!selectedNoteLocked && (
            <input
              type="text"
              value={newTagInput}
              onChange={e => setNewTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddTag() }}
              placeholder="+ Tag..."
              style={{ background: 'transparent', border: 'none', borderBottom: '1px dashed var(--color-border)', fontSize: '11px', color: 'var(--color-text-muted)', outline: 'none', width: '60px', padding: '1px 4px', marginRight: '6px' }}
            />
          )}

          <button className={`notes-editor-action${historyOpen ? ' active' : ''}`} onClick={toggleHistory} title="Histórico de revisões">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </button>
          <button className={`notes-editor-action${selectedNoteLocked ? ' active' : ''}`} onClick={() => onToggleLock(selectedNote.id)} title={selectedNoteLocked ? 'Destrancar nota' : 'Trancar nota'}>
            {selectedNoteLocked ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v1" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            )}
          </button>
          <button className={`notes-editor-action${selectedNote.isFavorite ? ' active' : ''}`} onClick={() => onToggleFavorite(selectedNote.id)} title={selectedNote.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} disabled={selectedNoteLocked}>
            <svg viewBox="0 0 24 24" fill={selectedNote.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          </button>
          <button className={`notes-editor-action${selectedNote.isPinned ? ' active' : ''}`} onClick={() => onTogglePinned(selectedNote.id)} title={selectedNote.isPinned ? 'Desafixar' : 'Fixar'} disabled={selectedNoteLocked}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" /></svg>
          </button>
          <button className="notes-editor-action" onClick={() => onAddNote(selectedNote.folderId, selectedNote.id)} title="Nova subpagina" disabled={selectedNoteLocked}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="12" x2="12" y2="18" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
          </button>
          <button className="notes-editor-action" onClick={handleExportMarkdown} title="Exportar nota como Markdown (.md)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
          </button>
          <button className="notes-editor-action" onClick={handleExportPDF} title="Imprimir / Exportar PDF">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
          </button>
          <button className="notes-editor-action danger" onClick={() => onRequestDelete(selectedNote.id)} title="Excluir nota" disabled={selectedNoteLocked}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
          </button>
        </div>
      </div>

      {/* ── Revision history panel ─────────────────────────────────────────── */}
      {historyOpen && (
        <div className="notes-history-panel">
          <div className="notes-history-panel-header">
            <span>Histórico de revisões</span>
            <button className="notes-history-close" onClick={() => { setHistoryOpen(false); setPreviewRevision(null) }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M4 4l8 8M12 4l-8 8" /></svg>
            </button>
          </div>

          {previewRevision ? (
            <div className="notes-history-preview">
              <div className="notes-history-preview-bar">
                <span className="notes-history-preview-date">{fmtRevDate(previewRevision.createdAt)}</span>
                <button className="notes-history-back" onClick={() => setPreviewRevision(null)}>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><polyline points="10 4 6 8 10 12"/></svg>
                  Voltar
                </button>
              </div>
              <div
                className="notes-history-preview-content tiptap ProseMirror"
                dangerouslySetInnerHTML={{ __html: previewRevision.content }}
              />
            </div>
          ) : revisionsLoading ? (
            <div className="notes-history-loading">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ animation: 'spin 1s linear infinite' }}><circle cx="12" cy="12" r="10" strokeDasharray="30 10" /></svg>
              Carregando…
            </div>
          ) : revisionsError ? (
            <div className="notes-history-error">{revisionsError}</div>
          ) : revisions.length === 0 ? (
            <div className="notes-history-empty">Nenhuma revisão salva ainda.</div>
          ) : (
            <div className="notes-history-list">
              {revisions.map(rev => (
                <button key={rev.id} className="notes-history-item" onClick={() => setPreviewRevision(rev)}>
                  <span className="notes-history-item-date">{fmtRevDate(rev.createdAt)}</span>
                  <span className="notes-history-item-preview">{stripHtml(rev.content)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {noteSubpages.length > 0 && (
        <div className="notes-subpages-row">
          {noteSubpages.map(sub => (
            <button key={sub.id} className="notes-subpage-chip" onClick={() => onOpenNote(sub.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              {sub.title || 'Sem titulo'}
            </button>
          ))}
        </div>
      )}

      <div className="notes-editor-content">
        <WysiwygEditor
          key={selectedNote.id}
          content={noteContent}
          onChange={(html) => onContentChange(selectedNote.id, html)}
          mode="full"
          currentNoteId={selectedNote.id}
          readOnly={selectedNoteLocked}
          floatingToolbox
          disableImages
          noteTitlesById={noteTitlesById}
        />
      </div>

      {/* ── Backlinks ─────────────────────────────────────────────────────── */}
      <div className="notes-backlinks-section">
        <button className="notes-backlinks-toggle" onClick={handleToggleBacklinks}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"
            style={{ transform: backlinksExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" style={{ flexShrink: 0 }}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <span>Mencionado em</span>
          {backlinksLoaded && (
            <span className="notes-backlinks-count">{backlinkNotes.length}</span>
          )}
        </button>

        {backlinksExpanded && (
          <div className="notes-backlinks-body">
            {backlinksLoading ? (
              <span className="notes-backlinks-loading">Buscando menções…</span>
            ) : backlinkNotes.length === 0 ? (
              <span className="notes-backlinks-empty">Nenhuma nota menciona esta</span>
            ) : (
              backlinkNotes.map(n => (
                <button key={n.id} className="notes-backlink-item" onClick={() => onOpenNote(n.id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13" style={{ flexShrink: 0 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span>{n.title || 'Sem titulo'}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="notes-editor-footer">
        <span className="notes-editor-wordcount">
          {wordCount > 0 ? `${wordCount} palavras · ${readingTime} min de leitura` : 'Nota vazia'}
        </span>
      </div>
    </div>
  )
}
