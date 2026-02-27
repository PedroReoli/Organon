import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert, Linking } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { FAB } from '../components/shared/FAB'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { EmptyState } from '../components/shared/EmptyState'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import type { ShortcutFolder, ShortcutItem } from '../types'

export function ShortcutsScreen() {
  const theme = useTheme()
  const { store, addShortcutFolder, updateShortcutFolder, deleteShortcutFolder, addShortcut, updateShortcut, deleteShortcut } = useStore()
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [showItemSheet, setShowItemSheet] = useState(false)
  const [showFolderSheet, setShowFolderSheet] = useState(false)
  const [editingItem, setEditingItem] = useState<ShortcutItem | null>(null)
  const [editingFolder, setEditingFolder] = useState<ShortcutFolder | null>(null)
  const [itemForm, setItemForm] = useState({ title: '', value: '' })
  const [folderName, setFolderName] = useState('')

  const breadcrumb = useMemo(() => {
    const path: ShortcutFolder[] = []
    let fid = currentFolderId
    while (fid) {
      const folder = store.shortcutFolders.find(f => f.id === fid)
      if (!folder) break
      path.unshift(folder)
      fid = folder.parentId
    }
    return path
  }, [currentFolderId, store.shortcutFolders])

  const folders = useMemo(() =>
    store.shortcutFolders.filter(f => f.parentId === currentFolderId).sort((a, b) => a.order - b.order),
    [store.shortcutFolders, currentFolderId]
  )

  const shortcuts = useMemo(() =>
    store.shortcuts.filter(s => s.folderId === currentFolderId).sort((a, b) => a.order - b.order),
    [store.shortcuts, currentFolderId]
  )

  const openLink = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url)
      if (canOpen) await Linking.openURL(url)
      else Alert.alert('Erro', 'Não foi possível abrir este link.')
    } catch {
      Alert.alert('Erro', 'Link inválido.')
    }
  }

  const openNewItem = () => {
    setEditingItem(null)
    setItemForm({ title: '', value: '' })
    setShowItemSheet(true)
  }

  const openEditItem = (item: ShortcutItem) => {
    setEditingItem(item)
    setItemForm({ title: item.title, value: item.value })
    setShowItemSheet(true)
  }

  const openNewFolder = () => {
    setEditingFolder(null)
    setFolderName('')
    setShowFolderSheet(true)
  }

  const openEditFolder = (folder: ShortcutFolder) => {
    setEditingFolder(folder)
    setFolderName(folder.name)
    setShowFolderSheet(true)
  }

  const handleSaveItem = () => {
    if (!itemForm.title.trim() || !itemForm.value.trim()) return
    if (editingItem) {
      updateShortcut(editingItem.id, { title: itemForm.title, value: itemForm.value })
    } else {
      addShortcut({ title: itemForm.title, value: itemForm.value, kind: 'url', folderId: currentFolderId, icon: null, order: shortcuts.length })
    }
    setShowItemSheet(false)
  }

  const handleSaveFolder = () => {
    if (!folderName.trim()) return
    if (editingFolder) {
      updateShortcutFolder(editingFolder.id, { name: folderName })
    } else {
      addShortcutFolder({ name: folderName, parentId: currentFolderId, order: folders.length })
    }
    setShowFolderSheet(false)
  }

  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    breadcrumb: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
    breadcrumbItem: { color: theme.primary, fontSize: 13 },
    breadcrumbSep: { color: theme.text + '40', fontSize: 13 },
    breadcrumbRoot: { color: theme.text + '60', fontSize: 13 },
    list: { flex: 1, paddingHorizontal: 12 },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 10, padding: 14, marginBottom: 6, gap: 12 },
    rowTitle: { flex: 1, color: theme.text, fontSize: 15 },
    rowSubtitle: { color: theme.text + '50', fontSize: 12, marginTop: 2 },
    addFolderBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.text + '20', borderStyle: 'dashed', justifyContent: 'center' },
    addFolderTxt: { color: theme.text + '60', fontSize: 13 },
  })

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Atalhos" />

      {/* Breadcrumb */}
      <View style={s.breadcrumb}>
        <TouchableOpacity onPress={() => setCurrentFolderId(null)}>
          <Text style={[s.breadcrumbRoot, currentFolderId === null && { color: theme.text, fontWeight: '600' }]}>Início</Text>
        </TouchableOpacity>
        {breadcrumb.map(folder => (
          <React.Fragment key={folder.id}>
            <Text style={s.breadcrumbSep}>›</Text>
            <TouchableOpacity onPress={() => setCurrentFolderId(folder.id)}>
              <Text style={s.breadcrumbItem}>{folder.name}</Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>

      <ScrollView style={s.list}>
        {folders.length === 0 && shortcuts.length === 0 && (
          <EmptyState icon="link" title="Nenhum atalho" subtitle="Toque no + para adicionar" />
        )}

        {/* Folders */}
        {folders.map(folder => (
          <TouchableOpacity key={folder.id} style={s.row} onPress={() => setCurrentFolderId(folder.id)} onLongPress={() => openEditFolder(folder)}>
            <Feather name="folder" size={20} color={theme.primary} />
            <Text style={s.rowTitle}>{folder.name}</Text>
            <Feather name="chevron-right" size={16} color={theme.text + '40'} />
          </TouchableOpacity>
        ))}

        {/* Shortcuts */}
        {shortcuts.map(item => (
          <TouchableOpacity key={item.id} style={s.row} onPress={() => openLink(item.value)} onLongPress={() => openEditItem(item)}>
            <Feather name="external-link" size={18} color={theme.text + '60'} />
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={s.rowSubtitle} numberOfLines={1}>{item.value}</Text>
            </View>
            <TouchableOpacity onPress={() => openEditItem(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="edit-2" size={14} color={theme.text + '40'} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={s.addFolderBtn} onPress={openNewFolder}>
          <Feather name="folder-plus" size={16} color={theme.text + '60'} />
          <Text style={s.addFolderTxt}>Nova pasta</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB onPress={openNewItem} />

      {/* Item Sheet */}
      <BottomSheet visible={showItemSheet} onClose={() => setShowItemSheet(false)} title={editingItem ? 'Editar atalho' : 'Novo atalho'} onSave={handleSaveItem}>
        <FormInput label="Nome *" value={itemForm.title} onChangeText={n => setItemForm(f => ({ ...f, title: n }))} placeholder="Ex: GitHub, Notion, Drive..." autoFocus />
        <FormInput label="URL *" value={itemForm.value} onChangeText={n => setItemForm(f => ({ ...f, value: n }))} placeholder="https://..." keyboardType="url" autoCapitalize="none" />
        {editingItem && (
          <TouchableOpacity style={{ marginTop: 4, padding: 14, backgroundColor: '#ef444420', borderRadius: 10, alignItems: 'center' }}
            onPress={() => { setShowItemSheet(false); Alert.alert('Excluir', `Excluir "${editingItem.title}"?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteShortcut(editingItem.id) }]) }}>
            <Text style={{ color: '#ef4444', fontWeight: '600' }}>Excluir atalho</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 20 }} />
      </BottomSheet>

      {/* Folder Sheet */}
      <BottomSheet visible={showFolderSheet} onClose={() => setShowFolderSheet(false)} title={editingFolder ? 'Renomear pasta' : 'Nova pasta'} onSave={handleSaveFolder}>
        <FormInput label="Nome da pasta *" value={folderName} onChangeText={setFolderName} placeholder="Ex: Trabalho, Pessoal..." autoFocus />
        {editingFolder && (
          <TouchableOpacity style={{ marginTop: 4, padding: 14, backgroundColor: '#ef444420', borderRadius: 10, alignItems: 'center' }}
            onPress={() => { setShowFolderSheet(false); Alert.alert('Excluir', `Excluir pasta "${editingFolder.name}"?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteShortcutFolder(editingFolder.id) }]) }}>
            <Text style={{ color: '#ef4444', fontWeight: '600' }}>Excluir pasta</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 20 }} />
      </BottomSheet>
    </SafeAreaView>
  )
}
