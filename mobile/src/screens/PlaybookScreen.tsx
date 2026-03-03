import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { FAB } from '../components/shared/FAB'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { EmptyState } from '../components/shared/EmptyState'
import { WysiwygEditor } from '../components/shared/WysiwygEditor'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { now } from '../utils/date'
import { uid } from '../utils/format'
import type { Playbook, PlaybookDialog } from '../types'

type Mode = 'catalog' | 'detail'

interface PlaybookForm {
  title: string
  sector: string
  category: string
  summary: string
  content: string
}

interface DialogForm {
  title: string
  text: string
}

const EMPTY_PLAYBOOK_FORM: PlaybookForm = { title: '', sector: '', category: '', summary: '', content: '' }
const EMPTY_DIALOG_FORM: DialogForm = { title: '', text: '' }

const normalize = (value: string): string =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

const stripHtml = (html: string): string => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
const asBucket = (value: string): string => value.trim() || 'Geral'

const toPlainText = (value: string): string =>
  value
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const extractVariables = (text: string): string[] => {
  const found = new Set<string>()
  for (const match of text.matchAll(/{([^{}]+)}/g)) {
    const name = (match[1] ?? '').trim()
    if (name) found.add(name)
  }
  return Array.from(found)
}

const applyVariables = (text: string, values: Record<string, string>, bold: Record<string, boolean>): string =>
  text.replace(/{([^{}]+)}/g, (_, rawName) => {
    const name = String(rawName ?? '').trim()
    if (!name) return '{}'
    const value = values[name]?.trim() ?? ''
    if (!value) return `{${name}}`
    return bold[name] ? `*${value}*` : value
  })

const toPlaybookForm = (playbook: Playbook): PlaybookForm => ({
  title: playbook.title,
  sector: playbook.sector,
  category: playbook.category,
  summary: playbook.summary,
  content: playbook.content,
})

const toDialogForm = (dialog: PlaybookDialog): DialogForm => ({
  title: dialog.title,
  text: dialog.text,
})

export function PlaybookScreen() {
  const theme = useTheme()
  const { store, addPlaybook, updatePlaybook, deletePlaybook } = useStore()

  const [mode, setMode] = useState<Mode>('catalog')
  const [search, setSearch] = useState('')
  const [sectorFilter, setSectorFilter] = useState('todos')
  const [categoryFilter, setCategoryFilter] = useState('todas')
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(null)
  const [selectedDialogId, setSelectedDialogId] = useState<string | null>(null)

  const [showPlaybookSheet, setShowPlaybookSheet] = useState(false)
  const [editingPlaybookId, setEditingPlaybookId] = useState<string | null>(null)
  const [playbookForm, setPlaybookForm] = useState<PlaybookForm>(EMPTY_PLAYBOOK_FORM)

  const [showDialogSheet, setShowDialogSheet] = useState(false)
  const [editingDialogId, setEditingDialogId] = useState<string | null>(null)
  const [dialogForm, setDialogForm] = useState<DialogForm>(EMPTY_DIALOG_FORM)

  const [showPreviewSheet, setShowPreviewSheet] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [variableBold, setVariableBold] = useState<Record<string, boolean>>({})

  const sortedPlaybooks = useMemo(() => [...store.playbooks].sort((a, b) => a.order - b.order), [store.playbooks])

  const sectors = useMemo(
    () => Array.from(new Set(sortedPlaybooks.map(p => asBucket(p.sector)))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [sortedPlaybooks],
  )

  const categories = useMemo(() => {
    const source = sectorFilter === 'todos'
      ? sortedPlaybooks
      : sortedPlaybooks.filter(p => asBucket(p.sector) === sectorFilter)
    return Array.from(new Set(source.map(p => asBucket(p.category)))).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [sectorFilter, sortedPlaybooks])

  const filteredPlaybooks = useMemo(() => {
    const q = normalize(search)
    return sortedPlaybooks.filter(playbook => {
      const pbSector = asBucket(playbook.sector)
      const pbCategory = asBucket(playbook.category)
      if (sectorFilter !== 'todos' && pbSector !== sectorFilter) return false
      if (categoryFilter !== 'todas' && pbCategory !== categoryFilter) return false
      if (!q) return true
      const haystack = normalize([playbook.title, pbSector, pbCategory, playbook.summary, stripHtml(playbook.content)].join(' '))
      return haystack.includes(q)
    })
  }, [categoryFilter, search, sectorFilter, sortedPlaybooks])

  const selectedPlaybook = useMemo(
    () => sortedPlaybooks.find(playbook => playbook.id === selectedPlaybookId) ?? null,
    [selectedPlaybookId, sortedPlaybooks],
  )

  const sortedDialogs = useMemo(
    () => selectedPlaybook ? [...selectedPlaybook.dialogs].sort((a, b) => a.order - b.order) : [],
    [selectedPlaybook],
  )

  const selectedDialog = useMemo(
    () => sortedDialogs.find(dialog => dialog.id === selectedDialogId) ?? null,
    [selectedDialogId, sortedDialogs],
  )

  const selectedDialogText = useMemo(() => (selectedDialog ? toPlainText(selectedDialog.text) : ''), [selectedDialog])
  const selectedVariables = useMemo(() => extractVariables(selectedDialogText), [selectedDialogText])
  const previewMessage = useMemo(
    () => applyVariables(selectedDialogText, variableValues, variableBold),
    [selectedDialogText, variableValues, variableBold],
  )

  useEffect(() => {
    if (categoryFilter !== 'todas' && !categories.includes(categoryFilter)) setCategoryFilter('todas')
  }, [categories, categoryFilter])

  useEffect(() => {
    if (!selectedPlaybookId) return
    if (sortedPlaybooks.some(playbook => playbook.id === selectedPlaybookId)) return
    setSelectedPlaybookId(null)
    setSelectedDialogId(null)
    setMode('catalog')
    setShowPreviewSheet(false)
  }, [selectedPlaybookId, sortedPlaybooks])

  useEffect(() => {
    if (!selectedPlaybook) {
      setSelectedDialogId(null)
      return
    }
    if (!selectedPlaybook.dialogs.some(dialog => dialog.id === selectedDialogId)) {
      const firstId = [...selectedPlaybook.dialogs].sort((a, b) => a.order - b.order)[0]?.id ?? null
      setSelectedDialogId(firstId)
    }
  }, [selectedDialogId, selectedPlaybook])

  useEffect(() => {
    if (!selectedDialog) {
      setVariableValues({})
      setVariableBold({})
      setCopyStatus('')
      return
    }
    const nextValues: Record<string, string> = {}
    const nextBold: Record<string, boolean> = {}
    selectedVariables.forEach(name => {
      nextValues[name] = ''
      nextBold[name] = false
    })
    setVariableValues(nextValues)
    setVariableBold(nextBold)
    setCopyStatus('')
  }, [selectedDialog, selectedVariables])

  const openPlaybook = (playbookId: string) => {
    setSelectedPlaybookId(playbookId)
    setMode('detail')
  }

  const openCreatePlaybook = () => {
    setEditingPlaybookId(null)
    setPlaybookForm({
      ...EMPTY_PLAYBOOK_FORM,
      sector: sectorFilter !== 'todos' ? sectorFilter : '',
      category: categoryFilter !== 'todas' ? categoryFilter : '',
    })
    setShowPlaybookSheet(true)
  }

  const openEditPlaybook = (playbook: Playbook) => {
    setEditingPlaybookId(playbook.id)
    setPlaybookForm(toPlaybookForm(playbook))
    setShowPlaybookSheet(true)
  }

  const savePlaybook = () => {
    const title = playbookForm.title.trim()
    if (!title) return Alert.alert('Titulo obrigatorio', 'Informe um titulo para o playbook.')
    const payload: Partial<Playbook> = {
      title,
      sector: playbookForm.sector.trim() || 'Geral',
      category: playbookForm.category.trim() || 'Geral',
      summary: playbookForm.summary.trim(),
      content: playbookForm.content,
    }
    if (editingPlaybookId) {
      updatePlaybook(editingPlaybookId, payload)
      setShowPlaybookSheet(false)
      return
    }
    const created = addPlaybook({
      ...payload,
      dialogs: [],
      order: sortedPlaybooks.length,
      createdAt: now(),
      updatedAt: now(),
    })
    setSelectedPlaybookId(created.id)
    setMode('detail')
    setShowPlaybookSheet(false)
  }

  const askDeletePlaybook = (playbook: Playbook) => {
    Alert.alert('Excluir playbook', `Deseja excluir "${playbook.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deletePlaybook(playbook.id)
          if (selectedPlaybookId === playbook.id) {
            setSelectedPlaybookId(null)
            setSelectedDialogId(null)
            setMode('catalog')
            setShowPreviewSheet(false)
          }
        },
      },
    ])
  }

  const openCreateDialog = () => {
    if (!selectedPlaybook) return
    setEditingDialogId(null)
    setDialogForm({ title: `Dialogo ${sortedDialogs.length + 1}`, text: '' })
    setShowDialogSheet(true)
  }

  const openEditDialog = (dialog: PlaybookDialog) => {
    setEditingDialogId(dialog.id)
    setDialogForm(toDialogForm(dialog))
    setShowDialogSheet(true)
  }

  const saveDialog = () => {
    if (!selectedPlaybook) return
    const title = dialogForm.title.trim() || `Dialogo ${sortedDialogs.length + 1}`

    if (editingDialogId) {
      updatePlaybook(selectedPlaybook.id, {
        dialogs: selectedPlaybook.dialogs.map(dialog =>
          dialog.id === editingDialogId ? { ...dialog, title, text: dialogForm.text, updatedAt: now() } : dialog
        ),
      })
      setSelectedDialogId(editingDialogId)
      setShowDialogSheet(false)
      return
    }

    const nextOrder = selectedPlaybook.dialogs.length > 0
      ? Math.max(...selectedPlaybook.dialogs.map(dialog => dialog.order)) + 1
      : 0
    const createdDialog: PlaybookDialog = {
      id: uid(),
      title,
      text: dialogForm.text,
      order: nextOrder,
      createdAt: now(),
      updatedAt: now(),
    }
    updatePlaybook(selectedPlaybook.id, { dialogs: [...selectedPlaybook.dialogs, createdDialog] })
    setSelectedDialogId(createdDialog.id)
    setShowDialogSheet(false)
  }

  const askDeleteDialog = (dialog: PlaybookDialog) => {
    if (!selectedPlaybook) return
    Alert.alert('Excluir dialogo', `Deseja excluir "${dialog.title || 'Dialogo'}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          updatePlaybook(selectedPlaybook.id, { dialogs: selectedPlaybook.dialogs.filter(item => item.id !== dialog.id) })
          if (selectedDialogId === dialog.id) setSelectedDialogId(null)
          setShowDialogSheet(false)
          setShowPreviewSheet(false)
        },
      },
    ])
  }

  const copyText = async (text: string, success = 'Copiado.') => {
    if (!text.trim()) return
    try {
      await Clipboard.setStringAsync(text)
      setCopyStatus(success)
    } catch {
      setCopyStatus('Nao foi possivel copiar automaticamente.')
    }
  }

  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    body: { flex: 1, paddingHorizontal: 12, paddingTop: 12 },
    panel: { backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.text + '1d', padding: 12, marginBottom: 10 },
    title: { color: theme.text, fontSize: 16, fontWeight: '700' },
    subtitle: { color: theme.text + '96', fontSize: 12, marginTop: 3, lineHeight: 18 },
    searchRow: { marginTop: 10, borderWidth: 1, borderColor: theme.text + '20', borderRadius: 12, backgroundColor: theme.background, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 44 },
    searchInput: { flex: 1, color: theme.text, fontSize: 14 },
    label: { color: theme.text + '90', fontSize: 11, marginTop: 10, marginBottom: 6, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
    chipRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
    chip: { borderWidth: 1, borderColor: theme.text + '2b', backgroundColor: theme.background, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
    chipOn: { borderColor: theme.primary, backgroundColor: theme.primary + '20' },
    chipText: { color: theme.text + 'be', fontSize: 12, fontWeight: '600' },
    chipTextOn: { color: theme.primary },
    sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 2 },
    badge: { borderRadius: 999, backgroundColor: theme.primary + '22', borderWidth: 1, borderColor: theme.primary + '5a', paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { color: theme.primary, fontSize: 11, fontWeight: '700' },
    list: { gap: 10, paddingBottom: 110 },
    card: { backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.text + '1d', padding: 12, gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    hRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { flex: 1, color: theme.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
    count: { borderWidth: 1, borderColor: theme.text + '32', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    countText: { color: theme.text + 'b8', fontSize: 11, fontWeight: '700' },
    tag: { borderWidth: 1, borderColor: theme.text + '2f', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: theme.background },
    tagText: { color: theme.text + 'b8', fontSize: 11, fontWeight: '600' },
    summary: { color: theme.text + '9f', fontSize: 13, lineHeight: 18 },
    iconBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, borderColor: theme.text + '2b', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background },
    topBar: { backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.text + '1d', paddingHorizontal: 10, paddingVertical: 9, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    backBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: theme.text + '2b', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background },
    detailTitle: { flex: 1, color: theme.text, fontSize: 15, fontWeight: '700' },
    content: { color: theme.text + 'cb', fontSize: 14, lineHeight: 22 },
    helper: { color: theme.text + '8a', fontSize: 12, lineHeight: 18 },
    actionBtn: { marginTop: 2, borderRadius: 10, borderWidth: 1, borderColor: theme.primary + '5a', backgroundColor: theme.primary + '19', height: 38, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
    actionBtnText: { color: theme.primary, fontSize: 13, fontWeight: '700' },
    deleteBtn: { marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: '#ef444466', backgroundColor: '#ef444418', height: 40, alignItems: 'center', justifyContent: 'center' },
    deleteText: { color: '#ef4444', fontSize: 13, fontWeight: '700' },
    dialogItem: { borderWidth: 1, borderColor: theme.text + '26', borderRadius: 12, backgroundColor: theme.background, padding: 10, gap: 6 },
    orderDot: { width: 24, height: 24, borderRadius: 999, borderWidth: 1, borderColor: theme.primary + '72', backgroundColor: theme.primary + '22', alignItems: 'center', justifyContent: 'center' },
    orderText: { color: theme.primary, fontSize: 11, fontWeight: '700' },
    dialogTitle: { flex: 1, color: theme.text, fontSize: 13, fontWeight: '700' },
    dialogPreview: { marginLeft: 32, color: theme.text + '96', fontSize: 12, lineHeight: 18 },
    box: { borderWidth: 1, borderColor: theme.text + '22', borderRadius: 12, backgroundColor: theme.surface, padding: 10, marginBottom: 10, gap: 8 },
    varLabel: { color: theme.text + '95', fontSize: 12, fontWeight: '600' },
    varInput: { flex: 1, minHeight: 40, borderWidth: 1, borderColor: theme.text + '28', borderRadius: 10, backgroundColor: theme.background, color: theme.text, paddingHorizontal: 12, paddingVertical: 8 },
    boldBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: theme.text + '2c', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background },
    boldBtnOn: { borderColor: theme.primary, backgroundColor: theme.primary + '22' },
    boldText: { color: theme.text + 'b8', fontWeight: '700' },
    boldTextOn: { color: theme.primary },
    previewText: { borderWidth: 1, borderColor: theme.text + '1e', borderRadius: 10, backgroundColor: theme.background, color: theme.text + 'd5', minHeight: 140, padding: 10, fontSize: 14, lineHeight: 20 },
    status: { color: theme.text + '90', fontSize: 12 },
  })

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Playbook" />

      {mode === 'catalog' ? (
        <View style={s.body}>
          <View style={s.panel}>
            <Text style={s.title}>Biblioteca de Playbooks</Text>
            <Text style={s.subtitle}>Filtro por setor e categoria com cards mais completos.</Text>
            <View style={s.searchRow}>
              <Feather name="search" size={16} color={theme.text + '72'} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar por titulo, resumo ou conteudo..."
                placeholderTextColor={theme.text + '56'}
                style={s.searchInput}
              />
            </View>
            <Text style={s.label}>Setor</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
              <TouchableOpacity style={[s.chip, sectorFilter === 'todos' && s.chipOn]} onPress={() => { setSectorFilter('todos'); setCategoryFilter('todas') }}>
                <Text style={[s.chipText, sectorFilter === 'todos' && s.chipTextOn]}>Todos</Text>
              </TouchableOpacity>
              {sectors.map(sector => (
                <TouchableOpacity key={sector} style={[s.chip, sectorFilter === sector && s.chipOn]} onPress={() => { setSectorFilter(sector); setCategoryFilter('todas') }}>
                  <Text style={[s.chipText, sectorFilter === sector && s.chipTextOn]}>{sector}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={s.label}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
              <TouchableOpacity style={[s.chip, categoryFilter === 'todas' && s.chipOn]} onPress={() => setCategoryFilter('todas')}>
                <Text style={[s.chipText, categoryFilter === 'todas' && s.chipTextOn]}>Todas</Text>
              </TouchableOpacity>
              {categories.map(category => (
                <TouchableOpacity key={category} style={[s.chip, categoryFilter === category && s.chipOn]} onPress={() => setCategoryFilter(category)}>
                  <Text style={[s.chipText, categoryFilter === category && s.chipTextOn]}>{category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={s.sectionHead}>
            <Text style={s.title}>Playbooks</Text>
            <View style={s.badge}><Text style={s.badgeText}>{filteredPlaybooks.length}</Text></View>
          </View>

          <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
            {filteredPlaybooks.length === 0 ? (
              <EmptyState icon="book-open" title="Nenhum playbook encontrado" subtitle="Toque no + para criar um playbook." />
            ) : filteredPlaybooks.map(playbook => (
              <TouchableOpacity key={playbook.id} style={s.card} onPress={() => openPlaybook(playbook.id)} onLongPress={() => openEditPlaybook(playbook)} activeOpacity={0.9}>
                <View style={s.row}>
                  <Text style={s.cardTitle} numberOfLines={2}>{playbook.title}</Text>
                  <View style={s.count}><Text style={s.countText}>{playbook.dialogs.length}</Text></View>
                </View>
                <View style={s.hRow}>
                  <View style={s.tag}><Text style={s.tagText}>{asBucket(playbook.sector)}</Text></View>
                  <View style={s.tag}><Text style={s.tagText}>{asBucket(playbook.category)}</Text></View>
                </View>
                <Text style={s.summary} numberOfLines={3}>
                  {playbook.summary.trim() || toPlainText(playbook.content) || 'Sem resumo.'}
                </Text>
                <View style={s.row}>
                  <Text style={s.actionBtnText}>Abrir detalhe</Text>
                  <TouchableOpacity style={s.iconBtn} onPress={() => openEditPlaybook(playbook)}>
                    <Feather name="edit-2" size={14} color={theme.text + 'c2'} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={s.body}>
          {!selectedPlaybook ? (
            <EmptyState icon="book" title="Playbook nao encontrado" subtitle="Volte ao catalogo e selecione outro playbook." />
          ) : (
            <>
              <View style={s.topBar}>
                <View style={[s.hRow, { flex: 1, minWidth: 0 }]}>
                  <TouchableOpacity style={s.backBtn} onPress={() => setMode('catalog')}>
                    <Feather name="arrow-left" size={16} color={theme.text} />
                  </TouchableOpacity>
                  <Text style={s.detailTitle} numberOfLines={1}>{selectedPlaybook.title}</Text>
                </View>
                <View style={s.hRow}>
                  <TouchableOpacity style={s.iconBtn} onPress={() => openEditPlaybook(selectedPlaybook)}>
                    <Feather name="edit-2" size={14} color={theme.text + 'c2'} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.iconBtn, { borderColor: '#ef444466', backgroundColor: '#ef444418' }]} onPress={() => askDeletePlaybook(selectedPlaybook)}>
                    <Feather name="trash-2" size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.hRow}>
                <View style={s.tag}><Text style={s.tagText}>{asBucket(selectedPlaybook.sector)}</Text></View>
                <View style={s.tag}><Text style={s.tagText}>{asBucket(selectedPlaybook.category)}</Text></View>
              </View>

              <ScrollView contentContainerStyle={{ paddingBottom: 110, paddingTop: 10, gap: 10 }} showsVerticalScrollIndicator={false}>
                <View style={s.panel}>
                  <View style={s.row}>
                    <Text style={s.title}>Conteudo</Text>
                    <TouchableOpacity style={s.iconBtn} onPress={() => openEditPlaybook(selectedPlaybook)}>
                      <Feather name="edit-2" size={14} color={theme.text + 'c2'} />
                    </TouchableOpacity>
                  </View>
                  {selectedPlaybook.summary ? <Text style={s.helper}>{selectedPlaybook.summary}</Text> : null}
                  <Text style={s.content}>{toPlainText(selectedPlaybook.content) || 'Sem conteudo cadastrado.'}</Text>
                  {!!toPlainText(selectedPlaybook.content) && (
                    <TouchableOpacity style={s.actionBtn} onPress={() => void copyText(toPlainText(selectedPlaybook.content), 'Conteudo copiado.')}>
                      <Feather name="copy" size={14} color={theme.primary} />
                      <Text style={s.actionBtnText}>Copiar conteudo</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={s.panel}>
                  <View style={s.row}>
                    <Text style={s.title}>Dialogos</Text>
                    <View style={s.hRow}>
                      <View style={s.badge}><Text style={s.badgeText}>{sortedDialogs.length}</Text></View>
                      <TouchableOpacity style={s.iconBtn} onPress={openCreateDialog}>
                        <Feather name="plus" size={15} color={theme.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {sortedDialogs.length === 0 ? (
                    <EmptyState icon="message-square" title="Nenhum dialogo" subtitle="Toque em + para criar o primeiro dialogo." />
                  ) : (
                    <View style={{ gap: 8 }}>
                      {sortedDialogs.map((dialog, index) => (
                        <TouchableOpacity key={dialog.id} style={s.dialogItem} onPress={() => { setSelectedDialogId(dialog.id); setShowPreviewSheet(true) }} activeOpacity={0.9}>
                          <View style={s.row}>
                            <View style={[s.hRow, { flex: 1, minWidth: 0 }]}>
                              <View style={s.orderDot}><Text style={s.orderText}>{index + 1}</Text></View>
                              <Text style={s.dialogTitle} numberOfLines={1}>{dialog.title || `Dialogo ${index + 1}`}</Text>
                            </View>
                            <View style={s.hRow}>
                              <TouchableOpacity style={s.iconBtn} onPress={() => { setSelectedDialogId(dialog.id); setShowPreviewSheet(true) }}>
                                <Feather name="eye" size={14} color={theme.text + 'c2'} />
                              </TouchableOpacity>
                              <TouchableOpacity style={s.iconBtn} onPress={() => openEditDialog(dialog)}>
                                <Feather name="edit-2" size={14} color={theme.text + 'c2'} />
                              </TouchableOpacity>
                            </View>
                          </View>
                          <Text style={s.dialogPreview} numberOfLines={2}>{toPlainText(dialog.text) || 'Sem conteudo.'}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>
            </>
          )}
        </View>
      )}

      <FAB onPress={mode === 'catalog' ? openCreatePlaybook : openCreateDialog} />

      <BottomSheet visible={showPlaybookSheet} onClose={() => setShowPlaybookSheet(false)} title={editingPlaybookId ? 'Editar playbook' : 'Novo playbook'} onSave={savePlaybook} saveLabel={editingPlaybookId ? 'Salvar' : 'Criar'} maxHeight="94%">
        <FormInput label="Titulo *" value={playbookForm.title} onChangeText={value => setPlaybookForm(prev => ({ ...prev, title: value }))} placeholder="Ex: Qualificacao de lead" autoFocus />
        <FormInput label="Setor" value={playbookForm.sector} onChangeText={value => setPlaybookForm(prev => ({ ...prev, sector: value }))} placeholder="Ex: Comercial" />
        <FormInput label="Categoria" value={playbookForm.category} onChangeText={value => setPlaybookForm(prev => ({ ...prev, category: value }))} placeholder="Ex: Atendimento" />
        <FormInput label="Resumo" value={playbookForm.summary} onChangeText={value => setPlaybookForm(prev => ({ ...prev, summary: value }))} placeholder="Resumo rapido" multiline numberOfLines={3} style={{ minHeight: 90, textAlignVertical: 'top' }} />
        <Text style={s.label}>Conteudo (WYSIWYG)</Text>
        <WysiwygEditor
          value={playbookForm.content}
          onChangeText={value => setPlaybookForm(prev => ({ ...prev, content: value }))}
          placeholder="Texto principal do playbook..."
          minHeight={260}
        />
        {editingPlaybookId && selectedPlaybook && (
          <TouchableOpacity style={s.deleteBtn} onPress={() => askDeletePlaybook(selectedPlaybook)}>
            <Text style={s.deleteText}>Excluir playbook</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 16 }} />
      </BottomSheet>

      <BottomSheet visible={showDialogSheet} onClose={() => setShowDialogSheet(false)} title={editingDialogId ? 'Editar dialogo' : 'Novo dialogo'} onSave={saveDialog} saveLabel={editingDialogId ? 'Salvar' : 'Criar'} maxHeight="94%">
        <FormInput label="Titulo" value={dialogForm.title} onChangeText={value => setDialogForm(prev => ({ ...prev, title: value }))} placeholder="Ex: Abertura da conversa" autoFocus />
        <Text style={s.helper}>Use variaveis no formato {'{nome}'} para personalizar a mensagem.</Text>
        <Text style={s.label}>Conteudo (WYSIWYG)</Text>
        <WysiwygEditor
          value={dialogForm.text}
          onChangeText={value => setDialogForm(prev => ({ ...prev, text: value }))}
          placeholder="Escreva o dialogo..."
          minHeight={260}
        />
        {editingDialogId && selectedDialog && (
          <TouchableOpacity style={s.deleteBtn} onPress={() => askDeleteDialog(selectedDialog)}>
            <Text style={s.deleteText}>Excluir dialogo</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 16 }} />
      </BottomSheet>

      <BottomSheet visible={showPreviewSheet} onClose={() => setShowPreviewSheet(false)} title={selectedDialog?.title || 'Preview do dialogo'} maxHeight="94%">
        {selectedDialog ? (
          <View>
            <View style={[s.row, { marginBottom: 10 }]}>
              <Text style={s.helper}>Preencha variaveis e copie a mensagem.</Text>
              <TouchableOpacity style={s.iconBtn} onPress={() => { setShowPreviewSheet(false); openEditDialog(selectedDialog) }}>
                <Feather name="edit-2" size={14} color={theme.text + 'c2'} />
              </TouchableOpacity>
            </View>
            {selectedVariables.length > 0 && (
              <View style={s.box}>
                <Text style={s.title}>Variaveis</Text>
                {selectedVariables.map(name => (
                  <View key={name} style={{ gap: 6 }}>
                    <Text style={s.varLabel}>{`{${name}}`}</Text>
                    <View style={s.hRow}>
                      <TextInput
                        value={variableValues[name] ?? ''}
                        onChangeText={value => { setVariableValues(prev => ({ ...prev, [name]: value })); setCopyStatus('') }}
                        placeholder={`Digite ${name}`}
                        placeholderTextColor={theme.text + '55'}
                        style={s.varInput}
                      />
                      <TouchableOpacity style={[s.boldBtn, variableBold[name] && s.boldBtnOn]} onPress={() => { setVariableBold(prev => ({ ...prev, [name]: !prev[name] })); setCopyStatus('') }}>
                        <Text style={[s.boldText, variableBold[name] && s.boldTextOn]}>B</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={s.box}>
              <View style={s.row}>
                <Text style={s.title}>Preview</Text>
                <TouchableOpacity style={s.iconBtn} onPress={() => void copyText(previewMessage, 'Mensagem copiada.')}>
                  <Feather name="copy" size={14} color={theme.text + 'c2'} />
                </TouchableOpacity>
              </View>
              <Text selectable style={s.previewText}>{previewMessage || 'Sem conteudo.'}</Text>
              {copyStatus ? <Text style={s.status}>{copyStatus}</Text> : null}
            </View>
            <View style={{ height: 16 }} />
          </View>
        ) : null}
      </BottomSheet>
    </SafeAreaView>
  )
}
