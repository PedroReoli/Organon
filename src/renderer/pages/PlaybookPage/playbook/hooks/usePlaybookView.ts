import { useEffect, useMemo, useRef, useState } from 'react'
import type { Playbook, PlaybookDialog, PlaybookFolder, PlaybookVariable } from '@types'
import { copyTextToClipboard } from '@utils'
import { EMPTY_DIALOG_FORM, EMPTY_FORM, type ContextMenuState, type DialogForm, type PlaybookForm } from '../types'
import { normalize, processDialogText, stripHtml, toForm } from '../utils'
import type { FolderSelection } from '../PlaybookFolderSidebar'
import {
  applyVariableValues,
  resolveDialogVariables,
} from '../variables'

interface UsePlaybookViewParams {
  playbooks:        Playbook[]
  playbookFolders?: PlaybookFolder[]
  onAddPlaybook:    (input: { title: string; sector?: string; category?: string; summary?: string; content?: string }) => string | undefined
  onUpdatePlaybook: (playbookId: string, updates: Partial<Pick<Playbook, 'title' | 'sector' | 'category' | 'summary' | 'content'>>) => void
  onRemovePlaybook: (playbookId: string) => void
  onAddDialog:      (playbookId: string, input: { title: string; text: string }) => string
  onUpdateDialog:   (playbookId: string, dialogId: string, updates: Partial<Pick<PlaybookDialog, 'title' | 'text' | 'tags'>>) => void
  onRemoveDialog:   (playbookId: string, dialogId: string) => void
  // Upgrade 15 extensions — todos opcionais (retrocompat)
  onAddPlaybookFromTemplate?: (input: {
    title: string
    sector?: string
    category?: string
    summary?: string
    content?: string
    dialogs: Array<{ title: string; text: string; variables?: PlaybookVariable[] }>
  }) => string | undefined
  onSnapshotPlaybookVersion?: (playbookId: string) => void
  onRestorePlaybookVersion?: (playbookId: string, versionId: string) => void
  onTogglePlaybookFavorite?: (playbookId: string) => void
  onTogglePlaybookArchived?: (playbookId: string) => void
  onMovePlaybookToFolder?: (playbookId: string, folderId: string | null) => void
  onIncrementPlaybookViewCount?: (playbookId: string) => void
  onIncrementDialogCopyCount?: (playbookId: string, dialogId: string) => void
  onUpdateDialogVariables?: (playbookId: string, dialogId: string, variables: PlaybookVariable[]) => void
  onReorderDialogs?: (playbookId: string, orderedIds: string[]) => void
  onDuplicateDialog?: (playbookId: string, dialogId: string) => string
  onAddPlaybookFolder?: (name: string) => string
  onRenamePlaybookFolder?: (folderId: string, name: string) => void
  onRemovePlaybookFolder?: (folderId: string) => void
}

export function usePlaybookView({
  playbooks, playbookFolders = [],
  onAddPlaybook, onUpdatePlaybook, onRemovePlaybook,
  onAddDialog, onUpdateDialog, onRemoveDialog,
  onAddPlaybookFromTemplate,
  onSnapshotPlaybookVersion,
  onRestorePlaybookVersion,
  onTogglePlaybookFavorite,
  onTogglePlaybookArchived,
  onMovePlaybookToFolder,
  onIncrementPlaybookViewCount,
  onIncrementDialogCopyCount,
  onUpdateDialogVariables,
  onReorderDialogs,
  onDuplicateDialog,
  onAddPlaybookFolder,
  onRenamePlaybookFolder,
  onRemovePlaybookFolder,
}: UsePlaybookViewParams) {
  const [screen,          setScreen]          = useState<'catalog' | 'detail'>('catalog')
  const [search,          setSearch]          = useState('')
  const [sectorFilter,    setSectorFilter]    = useState('todos')
  const [categoryFilter,  setCategoryFilter]  = useState('todas')
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(null)
  const [selectedDialogId,   setSelectedDialogId]   = useState<string | null>(null)
  const [showCreateModal,    setShowCreateModal]    = useState(false)
  const [createForm,         setCreateForm]         = useState<PlaybookForm>(EMPTY_FORM)
  const [showPlaybookEditModal, setShowPlaybookEditModal] = useState(false)
  const [editingPlaybookId,     setEditingPlaybookId]     = useState<string | null>(null)
  const [editForm,              setEditForm]              = useState<PlaybookForm>(EMPTY_FORM)
  const [showDialogModal,       setShowDialogModal]       = useState(false)
  const [showDialogPreviewModal, setShowDialogPreviewModal] = useState(false)
  const [editingDialogId,       setEditingDialogId]       = useState<string | null>(null)
  const [dialogForm,            setDialogForm]            = useState<DialogForm>(EMPTY_DIALOG_FORM)
  const [dialogVariableValues,  setDialogVariableValues]  = useState<Record<string, string>>({})
  const [dialogVariableBold,    setDialogVariableBold]    = useState<Record<string, boolean>>({})
  const [dialogCopyStatus,      setDialogCopyStatus]      = useState('')
  const [isDetailEditing,       setIsDetailEditing]       = useState(false)
  const [detailContentDraft,    setDetailContentDraft]    = useState('')
  const [contextMenu,           setContextMenu]           = useState<ContextMenuState | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  // Upgrade 15 state
  const [showTemplateGallery, setShowTemplateGallery] = useState(false)
  const [showVersionsPanel,   setShowVersionsPanel]   = useState(false)
  const [folderSelection,     setFolderSelection]     = useState<FolderSelection>({ kind: 'all' })
  const [dialogSearch,        setDialogSearch]        = useState('')
  const [quickCopiedId,       setQuickCopiedId]       = useState<string | null>(null)

  // ── Computed ──────────────────────────────────────────────────────────────

  const sortedPlaybooks = useMemo(
    () => [...playbooks].sort((a, b) => a.order - b.order),
    [playbooks],
  )

  const sectors = useMemo(
    () => Array.from(new Set(sortedPlaybooks.map(p => p.sector))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [sortedPlaybooks],
  )

  const categories = useMemo(() => {
    const source = sectorFilter === 'todos' ? sortedPlaybooks : sortedPlaybooks.filter(p => p.sector === sectorFilter)
    return Array.from(new Set(source.map(p => p.category))).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [sectorFilter, sortedPlaybooks])

  const filteredPlaybooks = useMemo(() => {
    const q = normalize(search)
    return sortedPlaybooks
      .filter(p => {
        // Folder selection (upgrade 15)
        switch (folderSelection.kind) {
          case 'all':
            if (p.isArchived) return false
            break
          case 'favorites':
            if (!p.isFavorite || p.isArchived) return false
            break
          case 'archived':
            if (!p.isArchived) return false
            break
          case 'none':
            if (p.isArchived || p.folderId) return false
            break
          case 'folder':
            if (p.isArchived || p.folderId !== folderSelection.folderId) return false
            break
        }
        return true
      })
      .filter(p => {
        if (sectorFilter !== 'todos' && p.sector !== sectorFilter) return false
        if (categoryFilter !== 'todas' && p.category !== categoryFilter) return false
        if (!q) return true
        return normalize([p.title, p.sector, p.category, p.summary, stripHtml(p.content)].join(' ')).includes(q)
      })
      .sort((a, b) => {
        // Favoritos primeiro, depois por viewCount desc (mais usados), depois por order
        if ((a.isFavorite ?? false) !== (b.isFavorite ?? false)) {
          return (b.isFavorite ?? false) ? 1 : -1
        }
        const va = a.viewCount ?? 0
        const vb = b.viewCount ?? 0
        if (va !== vb) return vb - va
        return a.order - b.order
      })
  }, [categoryFilter, search, sectorFilter, sortedPlaybooks, folderSelection])

  const selectedPlaybook = useMemo(
    () => sortedPlaybooks.find(p => p.id === selectedPlaybookId) ?? null,
    [selectedPlaybookId, sortedPlaybooks],
  )

  const sortedDialogs = useMemo(
    () => selectedPlaybook ? [...selectedPlaybook.dialogs].sort((a, b) => a.order - b.order) : [],
    [selectedPlaybook],
  )

  const selectedDialog = useMemo(
    () => sortedDialogs.find(d => d.id === selectedDialogId) ?? null,
    [selectedDialogId, sortedDialogs],
  )

  const editingPlaybook = useMemo(
    () => sortedPlaybooks.find(p => p.id === editingPlaybookId) ?? null,
    [editingPlaybookId, sortedPlaybooks],
  )

  const selectedDialogBaseText = useMemo(
    () => (selectedDialog ? processDialogText(selectedDialog.text) : ''),
    [selectedDialog],
  )
  const selectedDialogResolvedVariables = useMemo(
    () =>
      selectedDialog
        ? resolveDialogVariables(selectedDialogBaseText, selectedDialog.variables)
        : [],
    [selectedDialog, selectedDialogBaseText],
  )
  /** Legacy: lista de chaves para compat com codigo antigo. */
  const selectedDialogVariables = useMemo(
    () => selectedDialogResolvedVariables.map((v) => v.key),
    [selectedDialogResolvedVariables],
  )
  const selectedDialogPreviewHtml = useMemo(
    () =>
      applyVariableValues(
        selectedDialogBaseText,
        selectedDialogResolvedVariables,
        dialogVariableValues,
        dialogVariableBold,
      ),
    [
      dialogVariableBold,
      dialogVariableValues,
      selectedDialogBaseText,
      selectedDialogResolvedVariables,
    ],
  )

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (categoryFilter !== 'todas' && !categories.includes(categoryFilter)) setCategoryFilter('todas')
  }, [categories, categoryFilter])

  useEffect(() => {
    if (!selectedPlaybookId) return
    if (sortedPlaybooks.some(p => p.id === selectedPlaybookId)) return
    setSelectedPlaybookId(null); setSelectedDialogId(null); setScreen('catalog')
  }, [selectedPlaybookId, sortedPlaybooks])

  useEffect(() => {
    if (!selectedPlaybook) { setSelectedDialogId(null); return }
    if (!selectedPlaybook.dialogs.some(d => d.id === selectedDialogId)) {
      setSelectedDialogId(selectedPlaybook.dialogs[0]?.id ?? null)
    }
  }, [selectedDialogId, selectedPlaybook])

  useEffect(() => {
    if (!contextMenu) return
    const onMouseDown = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) setContextMenu(null)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [contextMenu])

  useEffect(() => { setIsDetailEditing(false) }, [selectedPlaybookId])

  useEffect(() => { if (screen !== 'detail') setShowDialogPreviewModal(false) }, [screen, selectedPlaybookId])

  useEffect(() => {
    if (!selectedPlaybook) { setDetailContentDraft(''); return }
    if (isDetailEditing) return
    setDetailContentDraft(selectedPlaybook.content)
  }, [isDetailEditing, selectedPlaybook])

  useEffect(() => {
    if (!selectedDialog) {
      setShowDialogPreviewModal(false); setDialogVariableValues({}); setDialogVariableBold({}); setDialogCopyStatus(''); return
    }
    const nextValues: Record<string, string> = {}; const nextBold: Record<string, boolean> = {}
    selectedDialogResolvedVariables.forEach(v => {
      nextValues[v.key] = v.defaultValue ?? ''
      nextBold[v.key] = false
    })
    setDialogVariableValues(nextValues); setDialogVariableBold(nextBold); setDialogCopyStatus('')
  }, [selectedDialog, selectedDialogResolvedVariables])

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openPlaybook = (playbookId: string) => {
    setSelectedPlaybookId(playbookId); setScreen('detail'); setContextMenu(null)
    onIncrementPlaybookViewCount?.(playbookId)
  }

  const goBackToCatalog = () => { setScreen('catalog'); setIsDetailEditing(false) }

  const removePlaybookById = (playbookId: string) => {
    onRemovePlaybook(playbookId)
    if (selectedPlaybookId === playbookId) {
      setSelectedPlaybookId(null); setSelectedDialogId(null); setScreen('catalog')
    }
  }

  const openCreateModal = () => {
    // Mostra a galeria de templates primeiro. Escolher "em branco" abre o form antigo.
    setShowTemplateGallery(true)
  }
  const closeTemplateGallery = () => setShowTemplateGallery(false)
  const selectTemplate = (template: import('../templates/types').PlaybookTemplate | null) => {
    setShowTemplateGallery(false)
    if (!template) {
      setCreateForm(EMPTY_FORM)
      setShowCreateModal(true)
      return
    }
    // Cria direto a partir do template
    if (onAddPlaybookFromTemplate) {
      const newId = onAddPlaybookFromTemplate({
        title: `${template.name} (copia)`,
        sector: template.sector,
        category: template.category,
        summary: template.summary,
        content: template.content,
        dialogs: template.dialogs.map(d => ({
          title: d.title,
          text: d.text,
          variables: d.variables,
        })),
      })
      if (newId) {
        setSelectedPlaybookId(newId)
        setScreen('detail')
      }
    }
  }
  const closeCreateModal = () => { setShowCreateModal(false); setCreateForm(EMPTY_FORM) }

  const createPlaybook = () => {
    const title = createForm.title.trim(); if (!title) return
    const newId = onAddPlaybook({
      title, sector: createForm.sector.trim() || 'Geral',
      category: createForm.category.trim() || 'Geral', summary: createForm.summary.trim(), content: '',
    })
    if (!newId) return
    setShowCreateModal(false); setCreateForm(EMPTY_FORM)
    setSelectedPlaybookId(newId); setScreen('detail')
  }

  const openPlaybookEditModal = (playbookId: string) => {
    const pb = sortedPlaybooks.find(p => p.id === playbookId); if (!pb) return
    setEditingPlaybookId(playbookId); setEditForm(toForm(pb)); setShowPlaybookEditModal(true); setContextMenu(null)
  }

  const closePlaybookEditModal = () => {
    setShowPlaybookEditModal(false); setEditingPlaybookId(null); setEditForm(EMPTY_FORM)
  }

  const savePlaybookEdit = () => {
    if (!editingPlaybookId) return
    const title = editForm.title.trim(); if (!title) return
    onUpdatePlaybook(editingPlaybookId, {
      title, sector: editForm.sector.trim() || 'Geral',
      category: editForm.category.trim() || 'Geral', summary: editForm.summary.trim(),
    })
    closePlaybookEditModal()
  }

  // Auto-save do draft com debounce durante edicao
  const draftAutoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!isDetailEditing || !selectedPlaybook) return
    if (draftAutoSaveRef.current) clearTimeout(draftAutoSaveRef.current)
    draftAutoSaveRef.current = setTimeout(() => {
      if (selectedPlaybook.content !== detailContentDraft) {
        onUpdatePlaybook(selectedPlaybook.id, { content: detailContentDraft })
      }
    }, 2000)
    return () => { if (draftAutoSaveRef.current) clearTimeout(draftAutoSaveRef.current) }
  }, [detailContentDraft, isDetailEditing, selectedPlaybook, onUpdatePlaybook])

  const startDetailEdit  = () => { if (!selectedPlaybook) return; setDetailContentDraft(selectedPlaybook.content); setIsDetailEditing(true) }
  const cancelDetailEdit = () => { setDetailContentDraft(selectedPlaybook?.content ?? ''); setIsDetailEditing(false) }
  const saveDetailContent = () => {
    if (!selectedPlaybook) return
    if (selectedPlaybook.content !== detailContentDraft) {
      onSnapshotPlaybookVersion?.(selectedPlaybook.id)
    }
    onUpdatePlaybook(selectedPlaybook.id, { content: detailContentDraft }); setIsDetailEditing(false)
  }

  const updatePlaybookTitle = (title: string) => {
    if (!selectedPlaybook) return
    onUpdatePlaybook(selectedPlaybook.id, { title })
  }

  const openCreateDialogModal = () => {
    if (!selectedPlaybook) return
    setEditingDialogId(null)
    setDialogForm({
      title: `Dialogo ${selectedPlaybook.dialogs.length + 1}`,
      text: '',
      variables: [],
      tags: [],
    })
    setShowDialogModal(true)
  }

  const openDialogEditModal = (dialog: PlaybookDialog) => {
    setEditingDialogId(dialog.id)
    setDialogForm({
      title: dialog.title,
      text: dialog.text,
      variables: resolveDialogVariables(dialog.text, dialog.variables),
      tags: dialog.tags ?? [],
    })
    setShowDialogModal(true)
  }

  const closeDialogModal = () => { setShowDialogModal(false); setEditingDialogId(null); setDialogForm(EMPTY_DIALOG_FORM) }

  const saveDialogModal = () => {
    if (!selectedPlaybook) return
    const resolvedTitle = dialogForm.title.trim() || `Dialogo ${selectedPlaybook.dialogs.length + 1}`
    if (editingDialogId) {
      onSnapshotPlaybookVersion?.(selectedPlaybook.id)
      onUpdateDialog(selectedPlaybook.id, editingDialogId, {
        title: resolvedTitle,
        text: dialogForm.text,
        tags: dialogForm.tags,
      })
      onUpdateDialogVariables?.(selectedPlaybook.id, editingDialogId, dialogForm.variables)
      setSelectedDialogId(editingDialogId)
      closeDialogModal()
      return
    }
    const dialogId = onAddDialog(selectedPlaybook.id, {
      title: resolvedTitle,
      text: dialogForm.text,
    })
    if (dialogForm.tags.length > 0) {
      onUpdateDialog(selectedPlaybook.id, dialogId, { tags: dialogForm.tags })
    }
    if (dialogForm.variables.length > 0) {
      onUpdateDialogVariables?.(selectedPlaybook.id, dialogId, dialogForm.variables)
    }
    setSelectedDialogId(dialogId)
    closeDialogModal()
  }

  const removeDialogInModal = () => {
    if (!selectedPlaybook || !editingDialogId) return
    onRemoveDialog(selectedPlaybook.id, editingDialogId)
    if (selectedDialogId === editingDialogId) setSelectedDialogId(null)
    closeDialogModal()
  }

  const removeDialog = (dialogId: string) => {
    if (!selectedPlaybook) return
    onRemoveDialog(selectedPlaybook.id, dialogId)
    if (selectedDialogId === dialogId) setSelectedDialogId(null)
  }

  // Upgrade 15 handlers
  const togglePlaybookFavorite = (playbookId: string) => {
    onTogglePlaybookFavorite?.(playbookId)
  }
  const togglePlaybookArchived = (playbookId: string) => {
    onTogglePlaybookArchived?.(playbookId)
    setContextMenu(null)
  }
  const movePlaybookToFolder = (playbookId: string, folderId: string | null) => {
    onMovePlaybookToFolder?.(playbookId, folderId)
    setContextMenu(null)
  }
  const restorePlaybookVersion = (versionId: string) => {
    if (!selectedPlaybook) return
    onRestorePlaybookVersion?.(selectedPlaybook.id, versionId)
    setShowVersionsPanel(false)
  }
  const openVersionsPanel = () => setShowVersionsPanel(true)
  const closeVersionsPanel = () => setShowVersionsPanel(false)

  const createFolder = (name: string) => {
    onAddPlaybookFolder?.(name)
  }
  const renameFolder = (folderId: string, name: string) => {
    onRenamePlaybookFolder?.(folderId, name)
  }
  const removeFolder = (folderId: string) => {
    onRemovePlaybookFolder?.(folderId)
    if (folderSelection.kind === 'folder' && folderSelection.folderId === folderId) {
      setFolderSelection({ kind: 'all' })
    }
  }

  const openDialogPreviewModal  = (dialogId: string) => { setSelectedDialogId(dialogId); setShowDialogPreviewModal(true) }
  const closeDialogPreviewModal = () => { setShowDialogPreviewModal(false); setDialogCopyStatus('') }

  const reorderDialogUp = (dialogId: string) => {
    if (!selectedPlaybook) return
    const ids = sortedDialogs.map(d => d.id)
    const idx = ids.indexOf(dialogId)
    if (idx <= 0) return
    ;[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
    onReorderDialogs?.(selectedPlaybook.id, ids)
  }

  const reorderDialogDown = (dialogId: string) => {
    if (!selectedPlaybook) return
    const ids = sortedDialogs.map(d => d.id)
    const idx = ids.indexOf(dialogId)
    if (idx < 0 || idx >= ids.length - 1) return
    ;[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
    onReorderDialogs?.(selectedPlaybook.id, ids)
  }

  const duplicateDialog = (dialogId: string) => {
    if (!selectedPlaybook || !onDuplicateDialog) return
    const newId = onDuplicateDialog(selectedPlaybook.id, dialogId)
    setSelectedDialogId(newId)
  }

  const quickCopyDialog = async (dialog: PlaybookDialog) => {
    if (!selectedPlaybook) return
    const text = stripHtml(processDialogText(dialog.text))
    if (!text) return
    const ok = await copyTextToClipboard(text)
    if (ok) {
      onIncrementDialogCopyCount?.(selectedPlaybook.id, dialog.id)
      setQuickCopiedId(dialog.id)
      setTimeout(() => setQuickCopiedId(null), 2000)
    }
  }

  const openSelectedDialogForEdit = () => {
    if (!selectedDialog) return
    setShowDialogPreviewModal(false); openDialogEditModal(selectedDialog)
  }

  const copyDialogMessage = () => {
    const textToCopy = stripHtml(selectedDialogPreviewHtml)
    if (!textToCopy) { setDialogCopyStatus('Mensagem vazia para copiar.'); return }
    void copyTextToClipboard(textToCopy).then(success => {
      setDialogCopyStatus(success ? 'Mensagem copiada.' : 'Nao foi possivel copiar automaticamente.')
      if (success && selectedPlaybook && selectedDialog) {
        onIncrementDialogCopyCount?.(selectedPlaybook.id, selectedDialog.id)
      }
    })
  }

  return {
    // Navigation
    screen, search, setSearch, sectorFilter, setSectorFilter, categoryFilter, setCategoryFilter,
    // Data
    sortedPlaybooks, sectors, categories, filteredPlaybooks,
    selectedPlaybook, sortedDialogs, selectedDialog, editingPlaybook,
    selectedPlaybookId, selectedDialogId,
    // Computed dialog
    selectedDialogVariables, selectedDialogResolvedVariables, selectedDialogPreviewHtml, dialogCopyStatus,
    dialogVariableValues, setDialogVariableValues, dialogVariableBold, setDialogVariableBold, setDialogCopyStatus,
    // Context menu
    contextMenu, setContextMenu, contextMenuRef,
    // Create modal
    showCreateModal, createForm, setCreateForm,
    openCreateModal, closeCreateModal, createPlaybook,
    // Edit playbook modal
    showPlaybookEditModal, editForm, setEditForm,
    openPlaybookEditModal, closePlaybookEditModal, savePlaybookEdit,
    // Detail edit
    isDetailEditing, detailContentDraft, setDetailContentDraft,
    startDetailEdit, cancelDetailEdit, saveDetailContent, updatePlaybookTitle,
    // Dialog form modal
    showDialogModal, editingDialogId, dialogForm, setDialogForm,
    openCreateDialogModal, openDialogEditModal, closeDialogModal, saveDialogModal, removeDialogInModal, removeDialog,
    // Dialog preview modal
    showDialogPreviewModal,
    openDialogPreviewModal, closeDialogPreviewModal, openSelectedDialogForEdit, copyDialogMessage,
    // Dialog reorder / duplicate / quick copy
    reorderDialogUp, reorderDialogDown, duplicateDialog, quickCopyDialog, quickCopiedId,
    // Dialog search
    dialogSearch, setDialogSearch,
    // Playbook actions
    openPlaybook, goBackToCatalog, removePlaybookById,
    // Upgrade 15 — template gallery
    showTemplateGallery, closeTemplateGallery, selectTemplate,
    // Upgrade 15 — versions
    showVersionsPanel, openVersionsPanel, closeVersionsPanel, restorePlaybookVersion,
    // Upgrade 15 — folders
    playbookFolders, folderSelection, setFolderSelection,
    createFolder, renameFolder, removeFolder,
    // Upgrade 15 — favorite / archive / move
    togglePlaybookFavorite, togglePlaybookArchived, movePlaybookToFolder,
  }
}
