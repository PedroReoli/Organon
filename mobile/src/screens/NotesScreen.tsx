import React, { useState, useMemo, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Alert, KeyboardAvoidingView, Platform,
  TouchableWithoutFeedback,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { FAB } from '../components/shared/FAB'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { WysiwygEditor } from '../components/shared/WysiwygEditor'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { now, formatDate } from '../utils/date'
import type { Note, NoteFolder } from '../types'

type ScreenView = 'tree' | 'editor'

function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getExcerpt(html: string, maxLen = 80): string {
  const plain = stripHtml(html)
  if (!plain) return ''
  return plain.length > maxLen ? plain.slice(0, maxLen) + '…' : plain
}

export function NotesScreen() {
  const theme = useTheme()
  const { store, addNote, updateNote, deleteNote, addNoteFolder, deleteNoteFolder } = useStore()

  const [screenView, setScreenView] = useState<ScreenView>('tree')
  const [openNote, setOpenNote] = useState<Note | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [noteTitle, setNoteTitle] = useState('')

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())

  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const [contextMenuNote, setContextMenuNote] = useState<Note | null>(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // ---- Tree data ----

  const rootFolders = useMemo(() =>
    store.noteFolders.filter(f => !f.parentId).sort((a, b) => a.order - b.order),
  [store.noteFolders])

  const rootNotes = useMemo(() =>
    store.notes.filter(n => !n.folderId && !n.parentNoteId).sort((a, b) => a.order - b.order),
  [store.notes])

  const notesInFolder = useCallback((folderId: string) =>
    store.notes.filter(n => n.folderId === folderId && !n.parentNoteId).sort((a, b) => a.order - b.order),
  [store.notes])

  const subNotes = useCallback((parentNoteId: string) =>
    store.notes.filter(n => n.parentNoteId === parentNoteId).sort((a, b) => a.order - b.order),
  [store.notes])

  const childFolders = useCallback((parentId: string) =>
    store.noteFolders.filter(f => f.parentId === parentId).sort((a, b) => a.order - b.order),
  [store.noteFolders])

  const favorites = useMemo(() =>
    store.notes.filter(n => n.isFavorite).sort((a, b) => a.order - b.order),
  [store.notes])

  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return []
    return store.notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      stripHtml(n.content).toLowerCase().includes(q)
    ).slice(0, 30)
  }, [store.notes, searchQuery])

  // ---- Actions ----

  const openEditor = useCallback((note: Note) => {
    setOpenNote(note)
    setNoteContent(note.content)
    setNoteTitle(note.title)
    setScreenView('editor')
  }, [])

  const saveNote = useCallback(() => {
    if (!openNote) return
    updateNote(openNote.id, { title: noteTitle, content: noteContent, updatedAt: now() })
  }, [openNote, noteTitle, noteContent, updateNote])

  const closeEditor = useCallback(() => {
    saveNote()
    setScreenView('tree')
    setOpenNote(null)
  }, [saveNote])

  const createNote = useCallback((folderId: string | null = null, parentNoteId: string | null = null) => {
    const note = addNote({
      folderId,
      parentNoteId,
      order: store.notes.length,
      createdAt: now(),
      updatedAt: now(),
    })
    if (folderId) setExpandedFolders(prev => new Set([...prev, folderId]))
    if (parentNoteId) setExpandedNotes(prev => new Set([...prev, parentNoteId]))
    openEditor(note)
  }, [addNote, store.notes.length, openEditor])

  const createFolder = useCallback(() => {
    if (!newFolderName.trim()) return
    addNoteFolder({ name: newFolderName, parentId: null, order: store.noteFolders.length })
    setNewFolderName('')
    setShowNewFolder(false)
  }, [addNoteFolder, newFolderName, store.noteFolders.length])

  const confirmDeleteNote = useCallback((note: Note) => {
    Alert.alert('Excluir nota', `Excluir "${note.title || 'Sem título'}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteNote(note.id) },
    ])
  }, [deleteNote])

  const confirmDeleteFolder = useCallback((folder: NoteFolder) => {
    Alert.alert('Excluir pasta', `Excluir "${folder.name}" e todas as notas?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteNoteFolder(folder.id) },
    ])
  }, [deleteNoteFolder])

  const toggleFolder = useCallback((id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleNote = useCallback((id: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ---- Styles ----

  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    // Search bar
    searchBar: { flexDirection: 'row', alignItems: 'center', margin: 10, backgroundColor: theme.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, gap: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.text + '20' },
    searchInput: { flex: 1, color: theme.text, fontSize: 14, padding: 0 },
    // Tree
    treeBody: { flex: 1 },
    // Sections
    sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 5 },
    sectionLabelText: { fontSize: 10, fontWeight: '700', color: theme.text + '55', textTransform: 'uppercase', letterSpacing: 0.8 },
    // Row
    treeRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 12, minHeight: 38, borderRadius: 6, marginHorizontal: 6 },
    treeRowActive: { backgroundColor: theme.primary + '20' },
    chevronBtn: { width: 28, height: 38, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    chevronPlaceholder: { width: 28, height: 38 },
    rowIcon: { marginRight: 4, flexShrink: 0 },
    rowLabel: { flex: 1, fontSize: 14, color: theme.text, lineHeight: 20 },
    rowLabelActive: { color: theme.primary, fontWeight: '600' },
    rowMeta: { fontSize: 10, color: theme.text + '50', marginTop: 1 },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    starBadge: { fontSize: 10, color: '#eab308' },
    // Editor
    editorSafeArea: { flex: 1, backgroundColor: theme.background },
    editorHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 10, backgroundColor: theme.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.text + '18' },
    backBtn: { padding: 4 },
    titleInput: { flex: 1, color: theme.text, fontSize: 20, fontWeight: '700', paddingVertical: 0 },
    editorActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    subpagesRow: { flexGrow: 0, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.text + '12' },
    subpageChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.primary + '18', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, marginRight: 8 },
    subpageChipText: { color: theme.primary, fontSize: 12 },
    // Context menu
    ctxOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    ctxMenu: { backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, paddingTop: 4 },
    ctxHandle: { width: 36, height: 4, backgroundColor: theme.text + '30', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
    ctxTitle: { color: theme.text + '70', fontSize: 12, fontWeight: '700', textAlign: 'center', paddingVertical: 10, paddingHorizontal: 16 },
    ctxItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14 },
    ctxItemText: { color: theme.text, fontSize: 15 },
    ctxItemDanger: { color: '#ef4444' },
    ctxDivider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.text + '15', marginVertical: 4, marginHorizontal: 16 },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 60 },
    emptyText: { color: theme.text + '55', fontSize: 15, textAlign: 'center' },
  })

  // ---- Tree item renderers ----

  const NoteRow = ({ note, depth = 0 }: { note: Note; depth?: number }) => {
    const children = subNotes(note.id)
    const isExpanded = expandedNotes.has(note.id)
    const isActive = openNote?.id === note.id && screenView === 'editor'

    return (
      <>
        <TouchableOpacity
          style={[s.treeRow, isActive && s.treeRowActive, { paddingLeft: 12 + depth * 20 }]}
          onPress={() => openEditor(note)}
          onLongPress={() => setContextMenuNote(note)}
          activeOpacity={0.7}
        >
          {children.length > 0 ? (
            <TouchableOpacity style={s.chevronBtn} onPress={() => toggleNote(note.id)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
              <Feather
                name={isExpanded ? 'chevron-down' : 'chevron-right'}
                size={13}
                color={theme.text + '60'}
              />
            </TouchableOpacity>
          ) : (
            <View style={s.chevronPlaceholder} />
          )}
          <Feather name="file-text" size={14} color={isActive ? theme.primary : theme.text + '70'} style={s.rowIcon} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[s.rowLabel, isActive && s.rowLabelActive]} numberOfLines={1}>
              {note.title || 'Sem título'}
            </Text>
            {note.content ? (
              <Text style={s.rowMeta} numberOfLines={1}>{getExcerpt(note.content, 50)}</Text>
            ) : null}
          </View>
          <View style={s.rowRight}>
            {note.isFavorite && <Text style={s.starBadge}>★</Text>}
            {note.isPinned && <Feather name="bookmark" size={10} color={theme.primary} />}
          </View>
        </TouchableOpacity>
        {isExpanded && children.map(child => (
          <NoteRow key={child.id} note={child} depth={depth + 1} />
        ))}
      </>
    )
  }

  const FolderRow = ({ folder, depth = 0 }: { folder: NoteFolder; depth?: number }) => {
    const isExpanded = expandedFolders.has(folder.id)
    const childNts = notesInFolder(folder.id)
    const childFlds = childFolders(folder.id)
    const total = childNts.length + childFlds.length

    return (
      <>
        <TouchableOpacity
          style={[s.treeRow, { paddingLeft: 12 + depth * 20 }]}
          onPress={() => toggleFolder(folder.id)}
          onLongPress={() => Alert.alert(
            folder.name,
            'O que deseja fazer?',
            [
              { text: 'Nova nota aqui', onPress: () => createNote(folder.id) },
              { text: 'Excluir pasta', style: 'destructive', onPress: () => confirmDeleteFolder(folder) },
              { text: 'Cancelar', style: 'cancel' },
            ]
          )}
          activeOpacity={0.7}
        >
          <TouchableOpacity style={s.chevronBtn} onPress={() => toggleFolder(folder.id)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
            <Feather
              name={isExpanded ? 'chevron-down' : 'chevron-right'}
              size={13}
              color={theme.text + '60'}
            />
          </TouchableOpacity>
          <Feather
            name="folder"
            size={14}
            color={isExpanded ? theme.primary : theme.text + '70'}
            style={s.rowIcon}
          />
          <Text style={[s.rowLabel, { fontWeight: '500' }]} numberOfLines={1}>{folder.name}</Text>
          {total > 0 && (
            <Text style={{ fontSize: 11, color: theme.text + '40', marginLeft: 4 }}>{total}</Text>
          )}
        </TouchableOpacity>
        {isExpanded && (
          <>
            {childFlds.map(f => <FolderRow key={f.id} folder={f} depth={depth + 1} />)}
            {childNts.map(n => <NoteRow key={n.id} note={n} depth={depth + 1} />)}
          </>
        )}
      </>
    )
  }

  // ---- EDITOR VIEW ----

  if (screenView === 'editor' && openNote) {
    const subs = subNotes(openNote.id)
    return (
      <SafeAreaView style={s.editorSafeArea}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.editorHeader}>
            <TouchableOpacity style={s.backBtn} onPress={closeEditor}>
              <Feather name="arrow-left" size={22} color={theme.primary} />
            </TouchableOpacity>
            <TextInput
              style={s.titleInput}
              value={noteTitle}
              onChangeText={setNoteTitle}
              placeholder="Sem título"
              placeholderTextColor={theme.text + '40'}
              onBlur={saveNote}
            />
            <View style={s.editorActions}>
              <TouchableOpacity onPress={() => {
                updateNote(openNote.id, { isFavorite: !openNote.isFavorite })
                setOpenNote(n => n ? { ...n, isFavorite: !n.isFavorite } : n)
              }}>
                <Feather name="star" size={20} color={openNote.isFavorite ? '#eab308' : theme.text + '50'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => createNote(openNote.folderId, openNote.id)}>
                <Feather name="file-plus" size={20} color={theme.text + '50'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                saveNote()
              }}>
                <Feather name="check" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {subs.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.subpagesRow}>
              {subs.map(sub => (
                <TouchableOpacity key={sub.id} style={s.subpageChip} onPress={() => openEditor(sub)}>
                  <Feather name="file-text" size={11} color={theme.primary} />
                  <Text style={s.subpageChipText}>{sub.title || 'Sem título'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <WysiwygEditor
            value={noteContent}
            onChangeText={setNoteContent}
            placeholder="Comece a escrever..."
            onBlur={saveNote}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  // ---- TREE VIEW ----

  const isEmpty = store.notes.length === 0 && store.noteFolders.length === 0

  return (
    <SafeAreaView style={s.screen}>
      <Header
        title="Notas"
        rightIcon={showSearch ? 'x' : 'search'}
        onRightPress={() => {
          setShowSearch(v => !v)
          if (showSearch) setSearchQuery('')
        }}
      />

      {showSearch && (
        <View style={s.searchBar}>
          <Feather name="search" size={15} color={theme.text + '55'} />
          <TextInput
            autoFocus
            style={s.searchInput}
            placeholder="Buscar notas..."
            placeholderTextColor={theme.text + '40'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={15} color={theme.text + '55'} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <ScrollView style={s.treeBody} keyboardShouldPersistTaps="handled">
        {/* Search results */}
        {showSearch && searchQuery ? (
          searchResults.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: theme.text + '55', fontSize: 14 }}>Nenhum resultado para "{searchQuery}"</Text>
            </View>
          ) : (
            <>
              <View style={s.sectionLabel}>
                <Text style={s.sectionLabelText}>Resultados ({searchResults.length})</Text>
              </View>
              {searchResults.map(note => <NoteRow key={note.id} note={note} />)}
            </>
          )
        ) : (
          <>
            {/* Favorites */}
            {favorites.length > 0 && (
              <>
                <View style={s.sectionLabel}>
                  <Feather name="star" size={10} color={theme.text + '55'} />
                  <Text style={s.sectionLabelText}>Favoritos</Text>
                </View>
                {favorites.map(note => <NoteRow key={note.id} note={note} />)}
              </>
            )}

            {/* Main tree */}
            {(rootFolders.length > 0 || rootNotes.length > 0) && (
              <>
                {(favorites.length > 0) && (
                  <View style={s.sectionLabel}>
                    <Text style={s.sectionLabelText}>Todas as notas</Text>
                  </View>
                )}
                {rootFolders.map(folder => <FolderRow key={folder.id} folder={folder} />)}
                {rootNotes.map(note => <NoteRow key={note.id} note={note} />)}
              </>
            )}

            {isEmpty && (
              <View style={s.emptyState}>
                <Feather name="file-text" size={40} color={theme.text + '25'} />
                <Text style={s.emptyText}>Nenhuma nota ainda.{'\n'}Toque no + para criar!</Text>
              </View>
            )}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB onPress={() => createNote()} />

      {/* New folder bottom sheet */}
      <BottomSheet visible={showNewFolder} onClose={() => setShowNewFolder(false)} title="Nova pasta" onSave={createFolder}>
        <FormInput label="Nome" value={newFolderName} onChangeText={setNewFolderName} placeholder="Nome da pasta" autoFocus />
        <View style={{ height: 20 }} />
      </BottomSheet>

      {/* Context menu */}
      {contextMenuNote && (
        <TouchableWithoutFeedback onPress={() => setContextMenuNote(null)}>
          <View style={s.ctxOverlay}>
            <TouchableWithoutFeedback>
              <View style={s.ctxMenu}>
                <View style={s.ctxHandle} />
                <Text style={s.ctxTitle} numberOfLines={1}>{contextMenuNote.title || 'Sem título'}</Text>
                <View style={s.ctxDivider} />
                <TouchableOpacity style={s.ctxItem} onPress={() => {
                  updateNote(contextMenuNote.id, { isFavorite: !contextMenuNote.isFavorite })
                  setContextMenuNote(null)
                }}>
                  <Feather name="star" size={18} color={contextMenuNote.isFavorite ? '#eab308' : theme.text} />
                  <Text style={s.ctxItemText}>{contextMenuNote.isFavorite ? 'Remover dos favoritos' : 'Favoritar'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.ctxItem} onPress={() => {
                  updateNote(contextMenuNote.id, { isPinned: !contextMenuNote.isPinned })
                  setContextMenuNote(null)
                }}>
                  <Feather name="bookmark" size={18} color={contextMenuNote.isPinned ? theme.primary : theme.text} />
                  <Text style={s.ctxItemText}>{contextMenuNote.isPinned ? 'Desafixar' : 'Fixar'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.ctxItem} onPress={() => {
                  setContextMenuNote(null)
                  createNote(contextMenuNote.folderId, contextMenuNote.id)
                }}>
                  <Feather name="file-plus" size={18} color={theme.text} />
                  <Text style={s.ctxItemText}>Nova subpágina</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.ctxItem} onPress={() => {
                  setContextMenuNote(null)
                  openEditor(contextMenuNote)
                }}>
                  <Feather name="edit-2" size={18} color={theme.text} />
                  <Text style={s.ctxItemText}>Abrir</Text>
                </TouchableOpacity>
                <View style={s.ctxDivider} />
                <TouchableOpacity style={s.ctxItem} onPress={() => {
                  setContextMenuNote(null)
                  confirmDeleteNote(contextMenuNote)
                }}>
                  <Feather name="trash-2" size={18} color="#ef4444" />
                  <Text style={[s.ctxItemText, s.ctxItemDanger]}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
    </SafeAreaView>
  )
}
