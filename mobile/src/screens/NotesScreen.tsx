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
type EditorMode = 'edit' | 'preview'

function toPlainPreview(markdown: string): string {
  if (!markdown) return ''
  return markdown
    .replace(/```[\s\S]*?```/g, ' [codigo] ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*]\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

function renderMarkdown(content: string, theme: { text: string; surface: string; primary: string }) {
  if (!content.trim()) {
    return <Text style={{ color: theme.text + '45', fontSize: 14 }}>Nota vazia</Text>
  }

  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const nodes: React.ReactNode[] = []
  let inCode = false
  let codeLines: string[] = []

  const flushCode = (key: string) => {
    if (codeLines.length === 0) return
    nodes.push(
      <View
        key={key}
        style={{
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.text + '18',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          marginBottom: 8,
        }}
      >
        <Text style={{ color: theme.text + 'd0', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), fontSize: 13, lineHeight: 19 }}>
          {codeLines.join('\n')}
        </Text>
      </View>,
    )
    codeLines = []
  }

  lines.forEach((rawLine, idx) => {
    const line = rawLine ?? ''

    if (line.trim().startsWith('```')) {
      if (inCode) {
        flushCode(`code-${idx}`)
        inCode = false
      } else {
        inCode = true
        codeLines = []
      }
      return
    }

    if (inCode) {
      codeLines.push(line)
      return
    }

    if (!line.trim()) {
      nodes.push(<View key={`sp-${idx}`} style={{ height: 8 }} />)
      return
    }

    if (/^###\s+/.test(line)) {
      nodes.push(
        <Text key={`h3-${idx}`} style={{ color: theme.text, fontSize: 17, fontWeight: '700', marginBottom: 6 }}>
          {line.replace(/^###\s+/, '')}
        </Text>,
      )
      return
    }

    if (/^##\s+/.test(line)) {
      nodes.push(
        <Text key={`h2-${idx}`} style={{ color: theme.text, fontSize: 19, fontWeight: '700', marginBottom: 7 }}>
          {line.replace(/^##\s+/, '')}
        </Text>,
      )
      return
    }

    if (/^#\s+/.test(line)) {
      nodes.push(
        <Text key={`h1-${idx}`} style={{ color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 8 }}>
          {line.replace(/^#\s+/, '')}
        </Text>,
      )
      return
    }

    if (/^>\s+/.test(line)) {
      nodes.push(
        <View key={`q-${idx}`} style={{ borderLeftWidth: 3, borderLeftColor: theme.primary, paddingLeft: 10, marginBottom: 7 }}>
          <Text style={{ color: theme.text + 'b5', fontSize: 15, lineHeight: 23 }}>{line.replace(/^>\s+/, '')}</Text>
        </View>,
      )
      return
    }

    if (/^[-*]\s+/.test(line)) {
      nodes.push(
        <View key={`ul-${idx}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
          <Text style={{ color: theme.primary, marginTop: 1 }}>•</Text>
          <Text style={{ color: theme.text, flex: 1, fontSize: 15, lineHeight: 23 }}>{line.replace(/^[-*]\s+/, '')}</Text>
        </View>,
      )
      return
    }

    const ordered = line.match(/^(\d+)\.\s+(.*)$/)
    if (ordered) {
      nodes.push(
        <View key={`ol-${idx}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
          <Text style={{ color: theme.primary, marginTop: 1 }}>{ordered[1]}.</Text>
          <Text style={{ color: theme.text, flex: 1, fontSize: 15, lineHeight: 23 }}>{ordered[2]}</Text>
        </View>,
      )
      return
    }

    nodes.push(
      <Text key={`p-${idx}`} style={{ color: theme.text, fontSize: 15, lineHeight: 24, marginBottom: 6 }}>
        {line}
      </Text>,
    )
  })

  if (inCode) flushCode('code-final')

  return <>{nodes}</>
}

export function NotesScreen() {
  const theme = useTheme()
  const { store, addNote, updateNote, deleteNote, addNoteFolder, deleteNoteFolder } = useStore()

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [openNote, setOpenNote] = useState<Note | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [noteTitle, setNoteTitle] = useState('')
  const [view, setView] = useState<View_>('list')
  const [editorMode, setEditorMode] = useState<EditorMode>('preview')
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
    setEditorMode('preview')
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
    setEditorMode('preview')
  }

  const createNote = () => {
    const note = addNote({ folderId: currentFolderId, order: notes.length, createdAt: now(), updatedAt: now() })
    setEditorMode('edit')
    openEditor(note)
    setEditorMode('edit')
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
    editor: { flex: 1, backgroundColor: theme.background },
    editorHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, backgroundColor: theme.surface },
    backBtn: { padding: 4 },
    titleInput: { flex: 1, color: theme.text, fontSize: 18, fontWeight: '600', paddingVertical: 2 },
    editorActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    modeBtn: { padding: 4 },
    content: { flex: 1, padding: 16, color: theme.text, fontSize: 16, lineHeight: 24, textAlignVertical: 'top' },
    previewScroll: { flex: 1 },
    previewContent: { padding: 16, paddingBottom: 40 },
  })

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
              placeholder="Titulo"
              placeholderTextColor={theme.text + '40'}
              onBlur={saveNote}
            />
            <View style={s.editorActions}>
              <TouchableOpacity style={s.modeBtn} onPress={() => setEditorMode(prev => (prev === 'edit' ? 'preview' : 'edit'))}>
                <Feather name={editorMode === 'edit' ? 'eye' : 'edit-3'} size={20} color={theme.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={saveNote}>
                <Feather name="save" size={20} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {editorMode === 'edit' ? (
            <TextInput
              style={s.content}
              value={noteContent}
              onChangeText={setNoteContent}
              placeholder="Comece a escrever em Markdown..."
              placeholderTextColor={theme.text + '30'}
              multiline
              textAlignVertical="top"
              onBlur={saveNote}
            />
          ) : (
            <ScrollView style={s.previewScroll} contentContainerStyle={s.previewContent}>
              {renderMarkdown(noteContent, { text: theme.text, surface: theme.surface, primary: theme.primary })}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Notas" rightIcon="folder-plus" onRightPress={() => setShowNewFolder(true)} />

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
            <Text style={s.noteTitle} numberOfLines={1}>{note.title || 'Sem titulo'}</Text>
            {note.content ? (
              <Text style={s.notePreview} numberOfLines={2}>{truncate(toPlainPreview(note.content), 140)}</Text>
            ) : null}
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

      <BottomSheet visible={showNewFolder} onClose={() => setShowNewFolder(false)} title="Nova pasta" onSave={createFolder}>
        <FormInput label="Nome" value={newFolderName} onChangeText={setNewFolderName} placeholder="Nome da pasta" autoFocus />
        <View style={{ height: 20 }} />
      </BottomSheet>
    </SafeAreaView>
  )
}
