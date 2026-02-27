import React, { useState, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { FAB } from '../components/shared/FAB'
import { EmptyState } from '../components/shared/EmptyState'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { now, formatDate } from '../utils/date'
import { truncate } from '../utils/format'
import type { Note, NoteFolder } from '../types'

type View_ = 'list' | 'editor'

export function NotesScreen() {
  const theme = useTheme()
  const { store, addNote, updateNote, deleteNote, addNoteFolder, updateNoteFolder, deleteNoteFolder } = useStore()

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [openNote, setOpenNote] = useState<Note | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [noteTitle, setNoteTitle] = useState('')
  const [view, setView] = useState<View_>('list')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const folders = useMemo(() =>
    store.noteFolders
      .filter(f => f.parentId === currentFolderId)
      .sort((a, b) => a.order - b.order),
  [store.noteFolders, currentFolderId])

  const notes = useMemo(() =>
    store.notes
      .filter(n => n.folderId === currentFolderId)
      .sort((a, b) => a.order - b.order),
  [store.notes, currentFolderId])

  const breadcrumb = useMemo(() => {
    const crumbs: NoteFolder[] = []
    let id = currentFolderId
    while (id) {
      const folder = store.noteFolders.find(f => f.id === id)
      if (!folder) break
      crumbs.unshift(folder)
      id = folder.parentId
    }
    return crumbs
  }, [currentFolderId, store.noteFolders])

  const openEditor = (note: Note) => {
    setOpenNote(note)
    setNoteContent(note.content)
    setNoteTitle(note.title)
    setView('editor')
  }

  const saveNote = () => {
    if (!openNote) return
    updateNote(openNote.id, { title: noteTitle, content: noteContent, updatedAt: now() })
  }

  const closeEditor = () => {
    saveNote()
    setView('list')
    setOpenNote(null)
  }

  const createNote = () => {
    const note = addNote({ folderId: currentFolderId, order: notes.length, createdAt: now(), updatedAt: now() })
    openEditor(note)
  }

  const createFolder = () => {
    if (!newFolderName.trim()) return
    addNoteFolder({ name: newFolderName, parentId: currentFolderId, order: folders.length })
    setNewFolderName('')
    setShowNewFolder(false)
  }

  const confirmDeleteNote = (note: Note) => {
    Alert.alert('Excluir nota', `Excluir "${note.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteNote(note.id) },
    ])
  }

  const confirmDeleteFolder = (folder: NoteFolder) => {
    Alert.alert('Excluir pasta', `Excluir "${folder.name}" e todas as notas dentro?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteNoteFolder(folder.id) },
    ])
  }

  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    breadcrumb: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.surface, gap: 6 },
    crumbTxt: { color: theme.text + '60', fontSize: 13 },
    crumbSep: { color: theme.text + '30', fontSize: 13 },
    crumbActive: { color: theme.primary, fontWeight: '600' },
    list: { flex: 1, padding: 12 },
    folderItem: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: theme.surface, borderRadius: 10, marginBottom: 6, gap: 12 },
    noteItem: { padding: 14, backgroundColor: theme.surface, borderRadius: 10, marginBottom: 6 },
    folderName: { flex: 1, color: theme.text, fontSize: 15 },
    noteTitle: { color: theme.text, fontSize: 15, fontWeight: '500', marginBottom: 4 },
    notePreview: { color: theme.text + '60', fontSize: 12, lineHeight: 16 },
    noteMeta: { color: theme.text + '40', fontSize: 11, marginTop: 6 },
    deleteBtn: { padding: 4 },
    // Editor
    editor: { flex: 1, backgroundColor: theme.background },
    editorHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: theme.surface },
    backBtn: { padding: 4 },
    titleInput: { flex: 1, color: theme.text, fontSize: 18, fontWeight: '600' },
    content: { flex: 1, padding: 16, color: theme.text, fontSize: 16, lineHeight: 24, textAlignVertical: 'top' },
  })

  // Note editor view
  if (view === 'editor' && openNote) {
    return (
      <SafeAreaView style={s.editor}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.editorHeader}>
            <TouchableOpacity style={s.backBtn} onPress={closeEditor}>
              <Feather name="arrow-left" size={22} color={theme.primary} />
            </TouchableOpacity>
            <TextInput
              style={s.titleInput}
              value={noteTitle}
              onChangeText={setNoteTitle}
              placeholder="Título"
              placeholderTextColor={theme.text + '40'}
              onBlur={saveNote}
            />
            <TouchableOpacity onPress={saveNote}>
              <Feather name="save" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={s.content}
            value={noteContent}
            onChangeText={setNoteContent}
            placeholder="Comece a escrever..."
            placeholderTextColor={theme.text + '30'}
            multiline
            textAlignVertical="top"
            onBlur={saveNote}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Notas" rightIcon="folder-plus" onRightPress={() => setShowNewFolder(true)} />

      {/* Breadcrumb */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
        <View style={s.breadcrumb}>
          <TouchableOpacity onPress={() => setCurrentFolderId(null)}>
            <Text style={[s.crumbTxt, currentFolderId === null && s.crumbActive]}>Notas</Text>
          </TouchableOpacity>
          {breadcrumb.map(folder => (
            <React.Fragment key={folder.id}>
              <Text style={s.crumbSep}>›</Text>
              <TouchableOpacity onPress={() => setCurrentFolderId(folder.id)}>
                <Text style={[s.crumbTxt, currentFolderId === folder.id && s.crumbActive]}>{folder.name}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </ScrollView>

      {/* List */}
      <ScrollView style={s.list}>
        {folders.length === 0 && notes.length === 0 && (
          <EmptyState icon="file-text" title="Pasta vazia" subtitle="Toque no + para criar uma nota" />
        )}
        {folders.map(folder => (
          <TouchableOpacity key={folder.id} style={s.folderItem} onPress={() => setCurrentFolderId(folder.id)}>
            <Feather name="folder" size={20} color={theme.primary} />
            <Text style={s.folderName}>{folder.name}</Text>
            <TouchableOpacity style={s.deleteBtn} onPress={() => confirmDeleteFolder(folder)}>
              <Feather name="trash-2" size={15} color={theme.text + '40'} />
            </TouchableOpacity>
            <Feather name="chevron-right" size={16} color={theme.text + '40'} />
          </TouchableOpacity>
        ))}
        {notes.map(note => (
          <TouchableOpacity key={note.id} style={s.noteItem} onPress={() => openEditor(note)}>
            <Text style={s.noteTitle} numberOfLines={1}>{note.title || 'Sem título'}</Text>
            {note.content ? <Text style={s.notePreview} numberOfLines={2}>{note.content.substring(0, 120)}</Text> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={s.noteMeta}>{formatDate(note.updatedAt.split('T')[0])}</Text>
              <TouchableOpacity onPress={() => confirmDeleteNote(note)}>
                <Feather name="trash-2" size={14} color={theme.text + '40'} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB onPress={createNote} />

      {/* New folder sheet */}
      <BottomSheet visible={showNewFolder} onClose={() => setShowNewFolder(false)} title="Nova pasta" onSave={createFolder}>
        <FormInput label="Nome" value={newFolderName} onChangeText={setNewFolderName} placeholder="Nome da pasta" autoFocus />
        <View style={{ height: 20 }} />
      </BottomSheet>
    </SafeAreaView>
  )
}
