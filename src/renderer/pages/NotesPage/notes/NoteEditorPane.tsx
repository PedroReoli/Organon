import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { Note } from '@types'
import { WysiwygEditor } from '../editor/WysiwygEditor'
import type { BreadcrumbPart } from '@types'
import { organonApi } from '../../../../api/organon'
import { NoteExportModal } from './NoteExportModal'
import { NoteAutoSaveIndicator } from './NoteAutoSaveIndicator'
import type { AutoSaveStatus } from './NoteAutoSaveIndicator'
import {
  Download,
  Folder,
  FileText,
  Star,
  Pin,
  Lock,
  Unlock,
  Trash2,
  Plus,
  History,
  ListTree,
  Link2,
  Bookmark,
  ChevronRight,
  Tag,
  X,
  AlignJustify,
  ArrowLeftRight
} from 'lucide-react'

interface NoteRevision {
  id: string
  content: string
  createdAt: string
  [key: string]: unknown
}

interface NoteEditorPaneProps {
  selectedNote: Note
  notes: Note[]
  noteContent: string
  noteTitle: string
  setNoteTitle: (t: string) => void
  noteBreadcrumb: BreadcrumbPart[]
  subNotes: (parentNoteId: string) => Note[]
  titleInputRef: React.RefObject<HTMLInputElement>
  selectedNoteLocked: boolean
  onContentChange: (noteId: string, html: string) => void
  onTitleBlur: () => void
  onToggleLock: (noteId: string) => void
  onToggleFavorite: (noteId: string) => void
  onTogglePinned: (noteId: string) => void
  onAddNote: (folderId?: string | null, parentNoteId?: string | null) => void
  onRequestDelete: (noteId: string) => void
  onOpenNote: (noteId: string) => void
  onOpenFolder: (folderId: string) => void
  onUpdateNote?: (id: string, updates: Partial<Note>) => void
  // Integrated top tools
  showOutline?: boolean
  onToggleOutline?: () => void
  showBacklinks?: boolean
  onToggleBacklinksPanel?: () => void
  onAddBookmark?: () => void
  autoSaveStatus?: AutoSaveStatus
  lastSavedAt?: string | null
}

function fmtRevDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

export const NoteEditorPane: React.FC<NoteEditorPaneProps> = ({
  selectedNote,
  notes,
  noteContent,
  noteTitle,
  setNoteTitle,
  noteBreadcrumb,
  subNotes,
  titleInputRef,
  selectedNoteLocked,
  onContentChange,
  onTitleBlur,
  onToggleLock,
  onToggleFavorite,
  onTogglePinned,
  onAddNote,
  onRequestDelete,
  onOpenNote,
  onOpenFolder,
  onUpdateNote,
  showOutline = false,
  onToggleOutline,
  showBacklinks = false,
  onToggleBacklinksPanel,
  onAddBookmark,
  autoSaveStatus = 'saved',
  lastSavedAt = null,
}) => {
  const [newTagInput, setNewTagInput] = useState('')
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [isFullWidth, setIsFullWidth] = useState<boolean>(() => {
    return localStorage.getItem('organon_notes_fullwidth') === 'true'
  })

  const toggleFullWidth = useCallback(() => {
    setIsFullWidth(prev => {
      const next = !prev
      localStorage.setItem('organon_notes_fullwidth', String(next))
      return next
    })
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

  const { wordCount, readingTime } = useMemo(() => {
    const text = noteContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const words = text ? text.split(' ').filter(Boolean).length : 0
    return { wordCount: words, readingTime: Math.max(1, Math.ceil(words / 200)) }
  }, [noteContent])

  // ── Revision history ───────────────────────────────────────────────────────
  const [historyOpen, setHistoryOpen] = useState(false)
  const [revisions, setRevisions] = useState<NoteRevision[]>([])
  const [revisionsLoading, setRevisionsLoading] = useState(false)
  const [revisionsError, setRevisionsError] = useState<string | null>(null)
  const [previewRevision, setPreviewRevision] = useState<NoteRevision | null>(null)

  const loadRevisions = useCallback(async (noteId: string) => {
    setRevisionsLoading(true)
    setRevisionsError(null)
    try {
      const res = await organonApi.notes.revisions(noteId)
      const data = (res.data ?? []) as NoteRevision[]
      setRevisions(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    } catch {
      setRevisionsError('Não foi possível carregar o histórico.')
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

  useEffect(() => {
    setHistoryOpen(false)
    setRevisions([])
    setRevisionsError(null)
    setPreviewRevision(null)
  }, [selectedNote.id])

  return (
    <div
      style={{
        background: 'transparent',
        color: 'var(--color-text)',
      }}
      className="w-full h-full flex flex-col overflow-hidden relative"
    >
      {/* ========================================================
          STICKY TOP TOOLBAR & HEADER DA NOTA (COLADA NO TOPO)
          ======================================================== */}
      <div
        style={{
          background: 'color-mix(in srgb, var(--color-background) 80%, transparent)',
          borderColor: 'color-mix(in srgb, var(--color-border) 40%, transparent)',
        }}
        className="sticky top-0 z-20 border-b px-4 py-2.5 space-y-2 shrink-0 select-none backdrop-blur-md"
      >
        {/* LINHA 1: BREADCRUMBS & FERRAMENTAS DE ESTRUTURA */}
        <div className="flex items-center justify-between gap-3 text-xs">
          {/* Breadcrumb Path */}
          <div className="flex items-center gap-1.5 text-[var(--color-text-muted)] truncate flex-1 min-w-0">
            {noteBreadcrumb.map((part: BreadcrumbPart) => (
              <React.Fragment key={part.id}>
                <button
                  type="button"
                  onClick={() => part.kind === 'note' ? onOpenNote(part.id || '') : onOpenFolder(part.id || '')}
                  className="flex items-center gap-1 hover:text-[var(--color-text)] transition-colors truncate max-w-[140px] cursor-pointer"
                >
                  {part.kind === 'folder' ? (
                    <Folder className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate">{part.label}</span>
                </button>
                <ChevronRight className="w-3 h-3 opacity-40 shrink-0" />
              </React.Fragment>
            ))}
            <span className="font-semibold text-[var(--color-text)] truncate max-w-[200px]">
              {selectedNote.title || 'Sem título'}
            </span>
          </div>

          {/* Ferramentas de Conteúdo: Sumário, Backlinks, Grafo, Bookmarks, AutoSave */}
          <div className="flex items-center gap-1.5 shrink-0">
            <NoteAutoSaveIndicator status={autoSaveStatus} lastSavedAt={lastSavedAt} />

            <div className="h-3.5 w-px bg-neutral-700/30 mx-1" />

            {onToggleOutline && (
              <button
                type="button"
                onClick={onToggleOutline}
                title="Sumário de Tópicos / Outline (Ctrl+Shift+O)"
                style={{
                  background: showOutline ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'transparent',
                  color: showOutline ? 'var(--color-primary)' : 'var(--color-text-muted)',
                }}
                className="p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] hover:text-[var(--color-text)] transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
              >
                <ListTree className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sumário</span>
              </button>
            )}

            {onToggleBacklinksPanel && (
              <button
                type="button"
                onClick={onToggleBacklinksPanel}
                title="Visualizar Backlinks / Conexões"
                style={{
                  background: showBacklinks ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'transparent',
                  color: showBacklinks ? 'var(--color-primary)' : 'var(--color-text-muted)',
                }}
                className="p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] hover:text-[var(--color-text)] transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Backlinks</span>
              </button>
            )}



            {onAddBookmark && (
              <button
                type="button"
                onClick={onAddBookmark}
                title="Adicionar aos Bookmarks"
                className="p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* LINHA 2: TÍTULO DA NOTA & AÇÕES PRINCIPAIS */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <input
              ref={titleInputRef}
              className={`w-full text-xl sm:text-2xl font-black tracking-tight text-[var(--color-text)] bg-transparent outline-none ${selectedNoteLocked ? 'opacity-80 cursor-not-allowed' : ''}`}
              value={noteTitle}
              onChange={e => setNoteTitle(e.target.value)}
              onBlur={onTitleBlur}
              placeholder="Título da nota..."
              readOnly={selectedNoteLocked}
            />
            {selectedNoteLocked && (
              <span className="text-rose-400 p-1 rounded bg-rose-500/10 shrink-0" title="Nota trancada">
                <Lock className="w-4 h-4" />
              </span>
            )}
          </div>

          {/* Grupo de Ações da Nota */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Favorito ⭐ */}
            <button
              type="button"
              onClick={() => onToggleFavorite(selectedNote.id)}
              title={selectedNote.isFavorite ? 'Remover dos favoritos' : 'Favoritar nota'}
              style={{
                color: selectedNote.isFavorite ? '#f59e0b' : 'var(--color-text-muted)',
                background: selectedNote.isFavorite ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
              }}
              className="p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] transition-all cursor-pointer"
              disabled={selectedNoteLocked}
            >
              <Star className={`w-4 h-4 ${selectedNote.isFavorite ? 'fill-amber-500' : ''}`} />
            </button>

            {/* Fixar 📌 */}
            <button
              type="button"
              onClick={() => onTogglePinned(selectedNote.id)}
              title={selectedNote.isPinned ? 'Desafixar nota' : 'Fixar nota'}
              style={{
                color: selectedNote.isPinned ? '#10b981' : 'var(--color-text-muted)',
                background: selectedNote.isPinned ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
              }}
              className="p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] transition-all cursor-pointer"
              disabled={selectedNoteLocked}
            >
              <Pin className="w-4 h-4" />
            </button>

            {/* Trancar 🔒 */}
            <button
              type="button"
              onClick={() => onToggleLock(selectedNote.id)}
              title={selectedNoteLocked ? 'Destrancar nota' : 'Proteger nota com trava'}
              style={{
                color: selectedNoteLocked ? '#f43f5e' : 'var(--color-text-muted)',
                background: selectedNoteLocked ? 'rgba(244, 63, 94, 0.12)' : 'transparent',
              }}
              className="p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] transition-all cursor-pointer"
            >
              {selectedNoteLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>

            {/* Histórico 🕒 */}
            <button
              type="button"
              onClick={toggleHistory}
              title="Histórico de revisões"
              style={{
                color: historyOpen ? 'var(--color-primary)' : 'var(--color-text-muted)',
                background: historyOpen ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'transparent',
              }}
              className="p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] transition-all cursor-pointer"
            >
              <History className="w-4 h-4" />
            </button>

            {/* Nova Subpágina */}
            <button
              type="button"
              onClick={() => onAddNote(selectedNote.folderId, selectedNote.id)}
              title="Criar nova subpágina"
              className="p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all cursor-pointer"
              disabled={selectedNoteLocked}
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Exportar .md / PDF */}
            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              title="Exportar Nota (.md, PDF, Texto)"
              className="p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Alternar Largura: Centralizado vs Full Width (Notion) */}
            <button
              type="button"
              onClick={toggleFullWidth}
              title={isFullWidth ? 'Modo Centralizado (Notion)' : 'Modo Largura Total (Full Width)'}
              style={{
                color: isFullWidth ? 'var(--color-primary)' : 'var(--color-text-muted)',
                background: isFullWidth ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)' : 'transparent',
              }}
              className="p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] hover:text-[var(--color-text)] transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
            >
              {isFullWidth ? <ArrowLeftRight className="w-4 h-4" /> : <AlignJustify className="w-4 h-4" />}
              <span className="hidden sm:inline">{isFullWidth ? 'Full Width' : 'Centralizado'}</span>
            </button>

            {/* Excluir Nota */}
            <button
              type="button"
              onClick={() => onRequestDelete(selectedNote.id)}
              title="Mover para Lixeira"
              className="p-1.5 rounded-lg border border-transparent hover:border-rose-500/30 text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
              disabled={selectedNoteLocked}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* LINHA 3: TAGS & METADADOS DA NOTA */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-xs">
          <Tag className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0 opacity-70" />

          {/* Chips de Tags */}
          {(selectedNote.tags || []).map((tag: string) => (
            <span
              key={tag}
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                color: 'var(--color-primary)',
                borderColor: 'color-mix(in srgb, var(--color-primary) 25%, transparent)',
              }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold"
            >
              <span>#{tag}</span>
              {!selectedNoteLocked && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-rose-400 cursor-pointer text-xs ml-0.5"
                  title="Remover tag"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}

          {/* Input para adicionar nova tag */}
          {!selectedNoteLocked && (
            <div className="flex items-center">
              <input
                type="text"
                value={newTagInput}
                onChange={e => setNewTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddTag() }}
                placeholder="+ Tag..."
                style={{
                  background: 'color-mix(in srgb, var(--color-background) 80%, var(--color-surface))',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text)',
                }}
                className="px-2 py-0.5 rounded-full border text-[11px] outline-none w-20 focus:w-28 focus:border-[var(--color-primary)] transition-all font-medium"
              />
            </div>
          )}

          {/* Word count & Reading time indicator */}
          <div className="ml-auto text-[11px] text-[var(--color-text-muted)] font-medium">
            {wordCount} palavras • ~{readingTime} min
          </div>
        </div>
      </div>

      {/* ========================================================
          HISTÓRICO DE REVISÕES (DRAWER / PANEL SE ABERTO)
          ======================================================== */}
      {historyOpen && (
        <div
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
          className="p-3 border-b space-y-2 text-xs"
        >
          <div className="flex items-center justify-between font-bold text-[var(--color-text)]">
            <span>Histórico de Versões</span>
            <button
              type="button"
              onClick={() => {
                setHistoryOpen(false)
                setPreviewRevision(null)
              }}
              className="text-[var(--color-text-muted)] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {previewRevision ? (
            <div className="space-y-2 p-2 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-400">{fmtRevDate(previewRevision.createdAt)}</span>
                <button
                  type="button"
                  onClick={() => setPreviewRevision(null)}
                  className="text-xs text-[var(--color-primary)] font-bold hover:underline"
                >
                  ← Voltar para lista
                </button>
              </div>
              <div
                className="max-h-40 overflow-y-auto text-xs p-2 rounded bg-black/20"
                dangerouslySetInnerHTML={{ __html: previewRevision.content }}
              />
            </div>
          ) : revisionsLoading ? (
            <div className="py-3 text-center text-[var(--color-text-muted)]">Carregando histórico...</div>
          ) : revisionsError ? (
            <div className="py-2 text-rose-400">{revisionsError}</div>
          ) : revisions.length === 0 ? (
            <div className="py-2 text-[var(--color-text-muted)]">Nenhuma versão anterior registrada.</div>
          ) : (
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {revisions.map(rev => (
                <div
                  key={rev.id}
                  onClick={() => setPreviewRevision(rev)}
                  className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/[0.05] cursor-pointer"
                >
                  <span className="font-medium text-[var(--color-text)]">{fmtRevDate(rev.createdAt)}</span>
                  <span className="text-[10px] text-[var(--color-primary)] font-bold">Ver &rarr;</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          CORPO DO EDITOR PRINCIPAL (NOTION STYLE - TRANSPARENTE E CENTRALIZADO)
          ======================================================== */}
      <div className="flex-1 overflow-y-auto">
        <div className={`transition-all duration-200 py-6 ${isFullWidth ? 'w-full max-w-none px-6 sm:px-12' : 'max-w-3xl mx-auto w-full px-4 sm:px-8'}`}>
          <WysiwygEditor
            content={noteContent}
            onChange={(html) => onContentChange(selectedNote.id, html)}
            readOnly={selectedNoteLocked}
            placeholder="Comece a escrever sua nota... Digite / para comandos ou selecione texto para formatar."
            mode="full"
            currentNoteId={selectedNote.id}
            noteTitlesById={noteTitlesById}
            onNoteMentionClick={onOpenNote}
          />

          {/* Subpáginas Vinculadas no Rodapé */}
          {noteSubpages.length > 0 && (
            <div className="mt-12 pt-6 border-t border-neutral-800/40 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                Subpáginas desta Nota ({noteSubpages.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {noteSubpages.map(sub => (
                  <div
                    key={sub.id}
                    onClick={() => onOpenNote(sub.id)}
                    style={{
                      background: 'color-mix(in srgb, var(--color-surface) 40%, transparent)',
                      borderColor: 'var(--color-border)',
                    }}
                    className="p-2.5 rounded-lg border hover:border-[var(--color-primary)] transition-all cursor-pointer flex items-center gap-2 group"
                  >
                    <FileText className="w-3.5 h-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors" />
                    <span className="text-xs font-semibold text-[var(--color-text)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                      {sub.title || 'Sem título'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Exportação */}
      <NoteExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        noteTitle={noteTitle || selectedNote.title || 'Nota'}
        noteContent={noteContent}
      />
    </div>
  )
}
