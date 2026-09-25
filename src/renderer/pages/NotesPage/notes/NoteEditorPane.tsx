import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { Note } from '@types'
import { WysiwygEditor } from '../editor/WysiwygEditor'
import type { BreadcrumbPart } from '@types'
import { organonApi } from '../../../../api/organon'
import { NoteExportModal } from './NoteExportModal'
import { NoteAutoSaveIndicator } from './NoteAutoSaveIndicator'
import type { AutoSaveStatus } from './NoteAutoSaveIndicator'
import { PageCustomizationMenu, type NoteFontFamily } from '../editor/menus/PageCustomizationMenu'
import {
  Folder,
  FileText,
  Star,
  Pin,
  Lock,
  Plus,
  ListTree,
  Link2,
  Bookmark,
  ChevronRight,
  Tag,
  X,
  MoreHorizontal,
  Smile,
  Image as ImageIcon,
  Undo2,
  Redo2,
  LayoutTemplate,
  Minimize2,
} from 'lucide-react'

const EMOJI_PRESETS = ['📝', '💡', '🚀', '⭐', '🎯', '📂', '🔥', '⚡', '🧠', '💻', '🎨', '📚', '⚙️', '✨', '🔒', '📊', '🌐', '☕', '🏷️', '💎']
const COVER_PRESETS = [
  { label: 'Aurora', value: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)' },
  { label: 'Midnight', value: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' },
  { label: 'Esmeralda', value: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)' },
  { label: 'Sunset', value: 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)' },
  { label: 'Cyberpunk', value: 'linear-gradient(135deg, #0891b2 0%, #4f46e5 50%, #9333ea 100%)' },
  { label: 'Ruby', value: 'linear-gradient(135deg, #881337 0%, #be123c 50%, #f43f5e 100%)' },
]

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
  const [isCustomMenuOpen, setIsCustomMenuOpen] = useState(false)
  const [fontFamily, setFontFamily] = useState<NoteFontFamily>(() => {
    return (localStorage.getItem('organon_notes_font') as NoteFontFamily) || (selectedNote.fontFamily as NoteFontFamily) || 'sans'
  })
  const [isSmallText, setIsSmallText] = useState<boolean>(() => {
    return localStorage.getItem('organon_notes_smalltext') === 'true' || !!selectedNote.isSmallText
  })
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
  const [isCoverPickerOpen, setIsCoverPickerOpen] = useState(false)
  const [customCoverUrl, setCustomCoverUrl] = useState('')

  const [isFullWidth, setIsFullWidth] = useState<boolean>(() => {
    return localStorage.getItem('organon_notes_fullwidth') === 'true' || !!selectedNote.isFullWidth
  })

  const toggleFullWidth = useCallback(() => {
    setIsFullWidth(prev => {
      const next = !prev
      localStorage.setItem('organon_notes_fullwidth', String(next))
      if (onUpdateNote) onUpdateNote(selectedNote.id, { isFullWidth: next })
      return next
    })
  }, [onUpdateNote, selectedNote.id])

  const handleChangeFontFamily = useCallback((font: NoteFontFamily) => {
    setFontFamily(font)
    localStorage.setItem('organon_notes_font', font)
    if (onUpdateNote) onUpdateNote(selectedNote.id, { fontFamily: font })
  }, [onUpdateNote, selectedNote.id])

  const [showFixedToolbar, setShowFixedToolbar] = useState<boolean>(() => {
    try {
      return localStorage.getItem('organon_notes_show_toolbar') === 'true'
    } catch {
      return false
    }
  })

  const handleToggleFixedToolbar = useCallback(() => {
    setShowFixedToolbar(prev => {
      const next = !prev
      try {
        localStorage.setItem('organon_notes_show_toolbar', String(next))
      } catch {}
      return next
    })
  }, [])

  const handleToggleSmallText = useCallback(() => {
    setIsSmallText(prev => {
      const next = !prev
      localStorage.setItem('organon_notes_smalltext', String(next))
      if (onUpdateNote) onUpdateNote(selectedNote.id, { isSmallText: next })
      return next
    })
  }, [onUpdateNote, selectedNote.id])

  const handleSetIcon = useCallback((icon: string | null) => {
    if (onUpdateNote) onUpdateNote(selectedNote.id, { icon })
    setIsIconPickerOpen(false)
  }, [onUpdateNote, selectedNote.id])

  const handleSetCover = useCallback((cover: string | null) => {
    if (onUpdateNote) onUpdateNote(selectedNote.id, { cover })
    setIsCoverPickerOpen(false)
  }, [onUpdateNote, selectedNote.id])

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

  const { wordCount, charCount, readingTime } = useMemo(() => {
    const text = noteContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const words = text ? text.split(' ').filter(Boolean).length : 0
    const chars = text ? text.length : 0
    return { wordCount: words, charCount: chars, readingTime: Math.max(1, Math.ceil(words / 200)) }
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

  const handleUndo = useCallback(() => {
    document.dispatchEvent(new CustomEvent('editor-undo'))
  }, [])

  const handleRedo = useCallback(() => {
    document.dispatchEvent(new CustomEvent('editor-redo'))
  }, [])

  return (
    <div
      style={{
        background: 'var(--color-background)',
      }}
      className="w-full h-full flex flex-col overflow-hidden relative"
    >
      {/* ========================================================
          STICKY TOP TOOLBAR (NOTION-STYLE BREADCRUMBS & ACTIONS)
          ======================================================== */}
      <div
        style={{
          background: 'color-mix(in srgb, var(--color-background) 85%, transparent)',
          borderColor: 'color-mix(in srgb, var(--color-border) 40%, transparent)',
        }}
        className="sticky top-0 z-20 border-b px-4 py-2 flex items-center justify-between gap-3 text-xs shrink-0 select-none backdrop-blur-md"
      >
        {/* Breadcrumbs Path */}
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
          <span className="font-semibold text-[var(--color-text)] truncate max-w-[200px] flex items-center gap-1.5">
            {selectedNote.icon && <span className="text-sm">{selectedNote.icon}</span>}
            <span>{selectedNote.title || 'Sem título'}</span>
          </span>
        </div>

        {/* Quick Actions & Menu ··· */}
        <div className="flex items-center gap-1.5 shrink-0 relative">
          <NoteAutoSaveIndicator status={autoSaveStatus} lastSavedAt={lastSavedAt} />

          <div className="h-3.5 w-px bg-white/10 mx-1 hidden sm:block" />

          {/* Desfazer & Refazer */}
          {!selectedNoteLocked && (
            <div className="flex items-center gap-0.5 bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06]">
              <button
                type="button"
                onClick={handleUndo}
                title="Desfazer (Ctrl+Z)"
                className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                title="Refazer (Ctrl+Y / Ctrl+Shift+Z)"
                className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Alternar Modo Página (Folha) / Largura Total */}
          <button
            type="button"
            onClick={toggleFullWidth}
            title={isFullWidth ? 'Mudar para Modo Página (Folha Centralizada A4)' : 'Mudar para Modo Tela Cheia (Largura Total)'}
            style={{
              background: isFullWidth ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.06)',
              borderColor: isFullWidth ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255, 255, 255, 0.1)',
              color: isFullWidth ? 'var(--color-primary)' : 'var(--color-text)',
            }}
            className="px-2.5 py-1 rounded-lg border flex items-center gap-1.5 text-[11px] font-medium transition-all cursor-pointer hover:border-[var(--color-primary)]"
          >
            {isFullWidth ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Modo Página</span>
              </>
            ) : (
              <>
                <LayoutTemplate className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span className="hidden sm:inline font-semibold">Página A4</span>
              </>
            )}
          </button>

          {onToggleOutline && (
            <button
              type="button"
              onClick={onToggleOutline}
              title="Sumário de Tópicos (Ctrl+Shift+O)"
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
              title="Painel de Backlinks"
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
              className="p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all cursor-pointer hidden sm:flex"
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>
          )}

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
            <Star className={`w-3.5 h-3.5 ${selectedNote.isFavorite ? 'fill-amber-500' : ''}`} />
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
            <Pin className="w-3.5 h-3.5" />
          </button>

          {/* Nova Subpágina */}
          <button
            type="button"
            onClick={() => onAddNote(selectedNote.folderId, selectedNote.id)}
            title="Criar nova subpágina"
            className="p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all cursor-pointer"
            disabled={selectedNoteLocked}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Menu Customização Notion (···) */}
          <button
            type="button"
            onClick={() => setIsCustomMenuOpen(prev => !prev)}
            title="Opções da Página & Estilo"
            style={{
              background: isCustomMenuOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
            }}
            className="p-1.5 rounded-lg border border-transparent hover:border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all cursor-pointer"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Popover Menu Customização */}
          <PageCustomizationMenu
            isOpen={isCustomMenuOpen}
            onClose={() => setIsCustomMenuOpen(false)}
            fontFamily={fontFamily}
            onChangeFontFamily={handleChangeFontFamily}
            isSmallText={isSmallText}
            onToggleSmallText={handleToggleSmallText}
            isFullWidth={isFullWidth}
            onToggleFullWidth={toggleFullWidth}
            showFixedToolbar={showFixedToolbar}
            onToggleFixedToolbar={handleToggleFixedToolbar}
            isLocked={selectedNoteLocked}
            onToggleLock={() => onToggleLock(selectedNote.id)}
            onOpenHistory={toggleHistory}
            onOpenExport={() => setExportModalOpen(true)}
            onDelete={() => onRequestDelete(selectedNote.id)}
          />
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
          className="p-3 border-b space-y-2 text-xs select-none"
        >
          <div className="flex items-center justify-between font-bold text-[var(--color-text)]">
            <span>Histórico de Versões</span>
            <button
              type="button"
              onClick={() => {
                setHistoryOpen(false)
                setPreviewRevision(null)
              }}
              className="text-[var(--color-text-muted)] hover:text-white cursor-pointer"
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
                  className="text-xs text-[var(--color-primary)] font-bold hover:underline cursor-pointer"
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
          CORPO DO CANVAS NOTION (SCROLL PRINCIPAL)
          ======================================================== */}
      <div
        className={`flex-1 overflow-y-auto ${
          isFullWidth
            ? 'px-4 sm:px-8 py-6'
            : 'px-3 sm:px-8 py-6 sm:py-10 bg-gradient-to-b from-[#080d1a]/80 via-[#0b1120]/40 to-[#070b14]/90'
        }`}
      >
        <div className={`mx-auto transition-all duration-300 ${isFullWidth ? 'w-full max-w-none' : 'max-w-4xl'}`}>
          {/* BANNER DE CAPA (PAGE COVER) */}
          {selectedNote.cover && (
            <div
              style={{
                background: selectedNote.cover.startsWith('http') || selectedNote.cover.startsWith('data:')
                  ? `url(${selectedNote.cover}) center/cover no-repeat`
                  : selectedNote.cover,
              }}
              className="w-full h-36 sm:h-48 relative group/cover transition-all rounded-t-2xl overflow-hidden mb-[-2rem] z-0"
            >
              {!selectedNoteLocked && (
                <div className="absolute right-4 bottom-3 flex items-center gap-1.5 opacity-0 group-hover/cover:opacity-100 transition-opacity z-10">
                  <button
                    type="button"
                    onClick={() => setIsCoverPickerOpen(prev => !prev)}
                    className="px-2.5 py-1 rounded-md bg-black/60 hover:bg-black/80 text-white text-[11px] font-medium backdrop-blur-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ImageIcon size={12} />
                    <span>Mudar Capa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetCover(null)}
                    className="px-2 py-1 rounded-md bg-black/60 hover:bg-rose-900/80 text-rose-300 text-[11px] font-medium backdrop-blur-xs transition-all cursor-pointer"
                    title="Remover Capa"
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CONTAINER DA FOLHA DE PÁGINA (DOCUMENT SHEET) */}
          <div
            className={`transition-all duration-300 relative z-10 flex flex-col ${
              isFullWidth
                ? 'w-full px-6 sm:px-12 py-8 min-h-[88vh] bg-[#0f172a]/60 border border-white/[0.05] rounded-2xl shadow-xl'
                : 'w-full px-6 sm:px-14 py-10 sm:py-14 min-h-[90vh] bg-[#0f172a]/95 border border-white/[0.09] rounded-2xl shadow-2xl shadow-black/80 backdrop-blur-md'
            }`}
            style={{
              boxShadow: isFullWidth
                ? '0 10px 30px -5px rgba(0, 0, 0, 0.3)'
                : '0 25px 60px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)',
            }}
          >
            <div className="relative group/headerActions mb-2">
            {/* Ícone da Página */}
            {selectedNote.icon ? (
              <div className={`relative inline-block ${selectedNote.cover ? '-mt-12 sm:-mt-14 mb-2 z-10' : 'mb-3'}`}>
                <button
                  type="button"
                  onClick={() => !selectedNoteLocked && setIsIconPickerOpen(prev => !prev)}
                  className={`text-4xl sm:text-5xl hover:scale-110 active:scale-95 transition-transform cursor-pointer p-1 rounded-xl hover:bg-white/10 ${
                    selectedNoteLocked ? 'cursor-default' : ''
                  }`}
                  title={selectedNoteLocked ? '' : 'Clique para alterar o ícone'}
                >
                  {selectedNote.icon}
                </button>
              </div>
            ) : null}

            {/* Ações de Hover: + Adicionar Ícone / + Adicionar Capa */}
            {!selectedNoteLocked && (
              <div
                className={`flex items-center gap-3 text-xs text-[var(--color-text-muted)] transition-opacity mb-2 ${
                  selectedNote.icon && selectedNote.cover
                    ? 'opacity-0 hover:opacity-100'
                    : 'opacity-0 group-hover/headerActions:opacity-100'
                }`}
              >
                {!selectedNote.icon && (
                  <button
                    type="button"
                    onClick={() => setIsIconPickerOpen(true)}
                    className="flex items-center gap-1.5 hover:text-[var(--color-text)] hover:bg-white/5 px-2 py-1 rounded cursor-pointer transition-colors"
                  >
                    <Smile size={13} className="text-[var(--color-primary)]" />
                    <span>+ Adicionar Ícone</span>
                  </button>
                )}
                {!selectedNote.cover && (
                  <button
                    type="button"
                    onClick={() => setIsCoverPickerOpen(true)}
                    className="flex items-center gap-1.5 hover:text-[var(--color-text)] hover:bg-white/5 px-2 py-1 rounded cursor-pointer transition-colors"
                  >
                    <ImageIcon size={13} className="text-[var(--color-primary)]" />
                    <span>+ Adicionar Capa</span>
                  </button>
                )}
              </div>
            )}

            {/* POPOVER DO SELETOR DE ÍCONE */}
            {isIconPickerOpen && (
              <div
                style={{
                  background: 'var(--color-surface, #181f33)',
                  borderColor: 'var(--color-border, rgba(255,255,255,0.12))',
                  boxShadow: '0 16px 36px -8px rgba(0,0,0,0.5)',
                }}
                className="absolute left-0 top-12 z-30 p-3 rounded-xl border w-72 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="flex items-center justify-between text-xs font-bold text-[var(--color-text)] mb-2">
                  <span>Escolha um Ícone</span>
                  {selectedNote.icon && (
                    <button
                      type="button"
                      onClick={() => handleSetIcon(null)}
                      className="text-rose-400 hover:underline text-[11px] cursor-pointer"
                    >
                      Remover
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-1.5 p-1 bg-white/[0.03] rounded-lg mb-2">
                  {EMOJI_PRESETS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSetIcon(emoji)}
                      className="text-xl p-1.5 rounded hover:bg-white/10 transition-transform active:scale-95 cursor-pointer text-center"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setIsIconPickerOpen(false)}
                  className="w-full text-center text-xs text-slate-400 hover:text-white py-1 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            )}

            {/* POPOVER DO SELETOR DE CAPA */}
            {isCoverPickerOpen && (
              <div
                style={{
                  background: 'var(--color-surface, #181f33)',
                  borderColor: 'var(--color-border, rgba(255,255,255,0.12))',
                  boxShadow: '0 16px 36px -8px rgba(0,0,0,0.5)',
                }}
                className="absolute left-0 top-12 z-30 p-3 rounded-xl border w-80 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="flex items-center justify-between text-xs font-bold text-[var(--color-text)] mb-2">
                  <span>Gradientes de Capa</span>
                  {selectedNote.cover && (
                    <button
                      type="button"
                      onClick={() => handleSetCover(null)}
                      className="text-rose-400 hover:underline text-[11px] cursor-pointer"
                    >
                      Remover
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {COVER_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleSetCover(preset.value)}
                      style={{ background: preset.value }}
                      className="h-12 rounded-lg border border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-end p-1 shadow-xs"
                    >
                      <span className="text-[9px] font-bold text-white drop-shadow-md truncate">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="space-y-1 text-xs">
                  <span className="text-[11px] text-[var(--color-text-muted)]">Ou URL de imagem:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="https://images.unsplash..."
                      value={customCoverUrl}
                      onChange={(e) => setCustomCoverUrl(e.target.value)}
                      className="flex-1 px-2 py-1 rounded border border-white/10 bg-black/20 text-xs text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => customCoverUrl.trim() && handleSetCover(customCoverUrl.trim())}
                      className="px-2.5 py-1 rounded bg-[var(--color-primary)] text-white text-xs font-bold cursor-pointer"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCoverPickerOpen(false)}
                  className="w-full text-center text-xs text-slate-400 hover:text-white py-1 mt-2 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>

          {/* TÍTULO NATIVO NO CANVAS (SEM CARA DE FORMULÁRIO) */}
          <div className="flex items-start gap-2 mb-3">
            <input
              ref={titleInputRef}
              className={`w-full text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text)] bg-transparent border-none outline-none py-1 placeholder:text-slate-500/30 transition-opacity ${
                selectedNoteLocked ? 'opacity-80 cursor-not-allowed' : ''
              }`}
              value={noteTitle}
              onChange={e => setNoteTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const editorDom = document.querySelector('.tiptap-editor .ProseMirror') as HTMLElement | null
                  if (editorDom) {
                    editorDom.focus()
                  }
                }
              }}
              onBlur={onTitleBlur}
              placeholder="Sem título"
              readOnly={selectedNoteLocked}
            />
            {selectedNoteLocked && (
              <span className="text-rose-400 p-1 rounded bg-rose-500/10 shrink-0 mt-2" title="Nota trancada">
                <Lock className="w-4 h-4" />
              </span>
            )}
          </div>

          {/* TAGS & METADADOS DA NOTA */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5 pb-4 text-xs border-b border-white/5 mb-6">
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

          {/* EDITOR WYSIWYG TIPOGRAFICAMENTE CONFIGURÁVEL */}
          <div
            className={`transition-all ${
              fontFamily === 'serif' ? 'font-serif' : fontFamily === 'mono' ? 'font-mono' : 'font-sans'
            } ${isSmallText ? 'text-[13px] leading-relaxed' : 'text-[15px] leading-relaxed'}`}
          >
            <WysiwygEditor
              content={noteContent}
              onChange={(html) => onContentChange(selectedNote.id, html)}
              readOnly={selectedNoteLocked}
              placeholder="Comece a escrever sua nota... Digite / para comandos ou selecione texto para formatar."
              mode="full"
              hideToolbar={!showFixedToolbar}
              currentNoteId={selectedNote.id}
              noteTitlesById={noteTitlesById}
              onNoteMentionClick={onOpenNote}
            />
          </div>

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
    </div>

      {/* Barra de Status e Métricas de Escrita no Rodapé */}
      <div
        style={{
          background: 'color-mix(in srgb, var(--color-surface) 92%, var(--color-background))',
          borderColor: 'var(--color-border)',
        }}
        className="px-4 py-1.5 border-t flex items-center justify-between text-[11px] text-[var(--color-text-muted)] select-none shrink-0 z-20"
      >
        <div className="flex items-center gap-3">
          <span className="font-medium text-[var(--color-text)] flex items-center gap-1.5">
            <FileText size={12} className="text-[var(--color-primary)]" />
            {wordCount} palavras
          </span>
          <span>•</span>
          <span>{charCount} caracteres</span>
          <span>•</span>
          <span>⏱ ~{readingTime} min de leitura</span>
        </div>

        <div className="flex items-center gap-2">
          {autoSaveStatus && (
            <NoteAutoSaveIndicator status={autoSaveStatus} lastSavedAt={lastSavedAt} />
          )}
          <button
            type="button"
            onClick={toggleFullWidth}
            className="hover:text-[var(--color-text)] px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors cursor-pointer"
            title={isFullWidth ? 'Modo centralizado' : 'Modo tela cheia / largura total'}
          >
            {isFullWidth ? '⇥ Centrado' : '⇤ Largura Total'}
          </button>
          <button
            type="button"
            onClick={handleToggleSmallText}
            className="hover:text-[var(--color-text)] px-1.5 py-0.5 rounded hover:bg-white/5 transition-colors cursor-pointer"
            title="Alternar tamanho da fonte"
          >
            {isSmallText ? 'A+ Padrão' : 'A- Compacto'}
          </button>
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
