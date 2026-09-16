import { useCallback, useEffect, useRef, useState } from 'react'
import type { Note, NoteFolder } from '@types'
import { isElectron } from '@utils'
import { folderContentPath } from '../utils'

interface UseNoteContentParams {
  selectedNoteId:   string | null
  selectedFolderId: string | null
  notes:   Note[]
  folders: NoteFolder[]
  onUpdateNote:   (noteId: string, updates: Partial<Pick<Note, 'title'>>) => void
  onUpdateFolder: (folderId: string, updates: Partial<Pick<NoteFolder, 'name'>>) => void
}

export interface NoteContentApi {
  noteContent:     string
  noteTitle:       string
  setNoteTitle:    (t: string) => void
  folderContent:   string
  folderTitle:     string
  setFolderTitle:  (t: string) => void
  isNoteLoading:   boolean
  isFolderLoading: boolean
  folderTitleInputRef: React.RefObject<HTMLInputElement>
  handleContentChange:       (noteId: string, html: string) => void
  handleTitleBlur:           () => void
  handleFolderContentChange: (folderId: string, html: string) => void
  handleFolderTitleBlur:     () => void
  /** Imperatively prepare state before switching to a new note (e.g. after create) */
  prepareNewNote:      (noteId: string) => void
  /** Set note content directly (e.g. after markdown import) */
  setNoteContentDirect: (html: string) => void
}

export function useNoteContent({
  selectedNoteId, selectedFolderId, notes, folders, onUpdateNote, onUpdateFolder,
}: UseNoteContentParams): NoteContentApi {
  const [noteContent,     setNoteContent]     = useState('')
  const [noteTitle,       setNoteTitle]       = useState('')
  const [folderContent,   setFolderContent]   = useState('')
  const [folderTitle,     setFolderTitle]     = useState('')
  const [isNoteLoading,   setIsNoteLoading]   = useState(false)
  const [isFolderLoading, setIsFolderLoading] = useState(false)

  const saveTimeoutRef       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const folderSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentNoteIdRef     = useRef<string | null>(null)
  const currentFolderIdRef   = useRef<string | null>(null)
  const folderTitleInputRef  = useRef<HTMLInputElement>(null)

  const selectedNote   = notes.find(n => n.id === selectedNoteId)   ?? null
  const selectedFolder = folders.find(f => f.id === selectedFolderId) ?? null

  // Load note content when selected note changes
  useEffect(() => {
    if (!selectedNote) {
      setIsNoteLoading(false); setNoteContent(''); setNoteTitle(''); return
    }
    if (saveTimeoutRef.current) { clearTimeout(saveTimeoutRef.current); saveTimeoutRef.current = null }
    setIsNoteLoading(true); setNoteContent(''); setNoteTitle(selectedNote.title || '')
    currentNoteIdRef.current = selectedNote.id

    if (isElectron() && selectedNote.mdPath) {
      window.electronAPI.readNote(selectedNote.mdPath)
        .then(c => {
          if (currentNoteIdRef.current === selectedNote.id) {
            // Se o conteúdo do disco estiver vazio, verifica se há backup local mais recente
            if (!c && typeof localStorage !== 'undefined') {
              const backup = localStorage.getItem(`organon:note-backup:${selectedNote.id}`)
              if (backup) {
                setNoteContent(backup)
                setIsNoteLoading(false)
                return
              }
            }
            setNoteContent(c)
            setIsNoteLoading(false)
          }
        })
        .catch(() => {
          if (currentNoteIdRef.current === selectedNote.id) {
            if (typeof localStorage !== 'undefined') {
              const backup = localStorage.getItem(`organon:note-backup:${selectedNote.id}`)
              if (backup) {
                setNoteContent(backup)
                setIsNoteLoading(false)
                return
              }
            }
            setNoteContent('')
            setIsNoteLoading(false)
          }
        })
    } else {
      if (typeof localStorage !== 'undefined') {
        const backup = localStorage.getItem(`organon:note-backup:${selectedNote.id}`)
        if (backup) {
          setNoteContent(backup)
          setIsNoteLoading(false)
          return
        }
      }
      setNoteContent('')
      setIsNoteLoading(false)
    }
  }, [selectedNoteId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load folder content when selected folder changes
  useEffect(() => {
    if (!selectedFolder) {
      setIsFolderLoading(false); setFolderContent(''); setFolderTitle(''); currentFolderIdRef.current = null; return
    }
    if (folderSaveTimeoutRef.current) { clearTimeout(folderSaveTimeoutRef.current); folderSaveTimeoutRef.current = null }
    setIsFolderLoading(true); setFolderContent(''); setFolderTitle(selectedFolder.name || '')
    currentFolderIdRef.current = selectedFolder.id

    if (isElectron()) {
      window.electronAPI.readNote(folderContentPath(selectedFolder.id))
        .then(c => { if (currentFolderIdRef.current === selectedFolder.id) { setFolderContent(c); setIsFolderLoading(false) } })
        .catch(() => { if (currentFolderIdRef.current === selectedFolder.id) { setFolderContent(''); setIsFolderLoading(false) } })
    } else {
      setFolderContent(''); setIsFolderLoading(false)
    }
  }, [selectedFolderId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync folder title when folder name changes externally
  useEffect(() => {
    if (!selectedFolder) return
    setFolderTitle(selectedFolder.name || '')
  }, [selectedFolderId, selectedFolder?.name]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => () => {
    if (saveTimeoutRef.current)       clearTimeout(saveTimeoutRef.current)
    if (folderSaveTimeoutRef.current) clearTimeout(folderSaveTimeoutRef.current)
  }, [])

  const handleContentChange = useCallback((noteId: string, html: string) => {
    if (currentNoteIdRef.current !== noteId) return
    
    // Backup instantâneo em memória/localStorage para prevenir perda por fechamento súbito
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(`organon:note-backup:${noteId}`, html)
      } catch {
        // quota limit fallback
      }
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      if (currentNoteIdRef.current !== noteId) return
      const note = notes.find(n => n.id === noteId)
      if (!note || note.isLocked) return
      if (isElectron() && note.mdPath) {
        window.electronAPI.writeNote(note.mdPath, html)
          .then(() => {
            // Sucesso na escrita no disco
          })
          .catch(() => {})
      }
      onUpdateNote(note.id, { title: note.title })
    }, 450)
  }, [notes, onUpdateNote])

  const handleTitleBlur = useCallback(() => {
    if (!selectedNote || !noteTitle.trim() || selectedNote.isLocked) return
    if (noteTitle.trim() === selectedNote.title) return
    onUpdateNote(selectedNote.id, { title: noteTitle.trim() })
  }, [selectedNote, noteTitle, onUpdateNote])

  const handleFolderContentChange = useCallback((folderId: string, html: string) => {
    if (currentFolderIdRef.current !== folderId) return
    if (folderSaveTimeoutRef.current) clearTimeout(folderSaveTimeoutRef.current)
    folderSaveTimeoutRef.current = setTimeout(() => {
      if (currentFolderIdRef.current !== folderId) return
      if (isElectron()) window.electronAPI.writeNote(folderContentPath(folderId), html).catch(() => {})
    }, 600)
  }, [])

  const handleFolderTitleBlur = useCallback(() => {
    if (!selectedFolder) return
    const next = folderTitle.trim()
    if (!next) { setFolderTitle(selectedFolder.name || ''); return }
    if (next === selectedFolder.name) return
    onUpdateFolder(selectedFolder.id, { name: next })
  }, [folderTitle, onUpdateFolder, selectedFolder])

  const prepareNewNote = useCallback((noteId: string) => {
    if (saveTimeoutRef.current) { clearTimeout(saveTimeoutRef.current); saveTimeoutRef.current = null }
    currentNoteIdRef.current   = noteId
    currentFolderIdRef.current = null
    setIsNoteLoading(true); setNoteContent(''); setNoteTitle('')
  }, [])

  const setNoteContentDirect = useCallback((html: string) => { setNoteContent(html) }, [])

  return {
    noteContent, noteTitle, setNoteTitle,
    folderContent, folderTitle, setFolderTitle,
    isNoteLoading, isFolderLoading,
    folderTitleInputRef,
    handleContentChange, handleTitleBlur,
    handleFolderContentChange, handleFolderTitleBlur,
    prepareNewNote, setNoteContentDirect,
  }
}
