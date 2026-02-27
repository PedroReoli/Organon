import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { FAB } from '../components/shared/FAB'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { EmptyState } from '../components/shared/EmptyState'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { now } from '../utils/date'
import type { Playbook } from '../types'

export function PlaybookScreen() {
  const theme = useTheme()
  const { store, addPlaybook, updatePlaybook, deletePlaybook } = useStore()
  const [search, setSearch] = useState('')
  const [showSheet, setShowSheet] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null)
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null)
  const [form, setForm] = useState({ title: '', sector: '', category: '', summary: '', content: '' })

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return store.playbooks
      .filter(p => !q || p.title.toLowerCase().includes(q) || p.sector.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
      .sort((a, b) => a.order - b.order)
  }, [store.playbooks, search])

  const grouped = useMemo(() => {
    const map: Record<string, Playbook[]> = {}
    filtered.forEach(p => {
      const key = p.sector || 'Geral'
      if (!map[key]) map[key] = []
      map[key].push(p)
    })
    return map
  }, [filtered])

  const openNew = () => {
    setEditingPlaybook(null)
    setForm({ title: '', sector: '', category: '', summary: '', content: '' })
    setShowSheet(true)
  }

  const openEdit = (p: Playbook) => {
    setEditingPlaybook(p)
    setForm({ title: p.title, sector: p.sector, category: p.category, summary: p.summary, content: p.content })
    setShowSheet(true)
  }

  const openDetail = (p: Playbook) => {
    setSelectedPlaybook(p)
    setShowDetail(true)
  }

  const handleSave = () => {
    if (!form.title.trim()) return
    if (editingPlaybook) {
      updatePlaybook(editingPlaybook.id, { ...form, updatedAt: now() })
    } else {
      addPlaybook({ ...form, dialogs: [], order: store.playbooks.length, createdAt: now(), updatedAt: now() })
    }
    setShowSheet(false)
  }

  const handleCopy = (text: string) => {
    Clipboard.setStringAsync(text).catch(() => {})
    Alert.alert('Copiado!', 'Conteúdo copiado para a área de transferência.')
  }

  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    searchWrap: { margin: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 10, paddingHorizontal: 12, gap: 8 },
    list: { flex: 1, paddingHorizontal: 12 },
    sectionTitle: { color: theme.text + '60', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },
    card: { backgroundColor: theme.surface, borderRadius: 10, padding: 14, marginBottom: 8 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    cardTitle: { flex: 1, color: theme.text, fontSize: 15, fontWeight: '600' },
    cardMeta: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: theme.primary + '20' },
    badgeTxt: { color: theme.primary, fontSize: 11, fontWeight: '600' },
    summary: { color: theme.text + '80', fontSize: 13, marginTop: 6, lineHeight: 18 },
    // Detail sheet
    detailContent: { color: theme.text, fontSize: 14, lineHeight: 22, marginTop: 8 },
    copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, backgroundColor: theme.primary + '20', borderRadius: 10, marginTop: 12, justifyContent: 'center' },
    copyTxt: { color: theme.primary, fontWeight: '600', fontSize: 14 },
    deleteBtn: { marginTop: 8, padding: 14, backgroundColor: '#ef444420', borderRadius: 10, alignItems: 'center' },
  })

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Playbook" />

      <View style={s.searchWrap}>
        <Feather name="search" size={16} color={theme.text + '60'} />
        <FormInput value={search} onChangeText={setSearch} placeholder="Buscar playbook..." style={{ borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0, flex: 1 }} />
      </View>

      <ScrollView style={s.list}>
        {filtered.length === 0 && <EmptyState icon="book-open" title="Nenhum playbook" subtitle="Toque no + para adicionar" />}
        {Object.entries(grouped).map(([sector, items]) => (
          <View key={sector}>
            <Text style={s.sectionTitle}>{sector}</Text>
            {items.map(p => (
              <TouchableOpacity key={p.id} style={s.card} onPress={() => openDetail(p)} onLongPress={() => openEdit(p)}>
                <View style={s.cardHeader}>
                  <Text style={s.cardTitle} numberOfLines={2}>{p.title}</Text>
                  <TouchableOpacity onPress={() => openEdit(p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Feather name="edit-2" size={14} color={theme.text + '50'} />
                  </TouchableOpacity>
                </View>
                <View style={s.cardMeta}>
                  {p.sector ? <View style={s.badge}><Text style={s.badgeTxt}>{p.sector}</Text></View> : null}
                  {p.category ? <View style={[s.badge, { backgroundColor: theme.text + '15' }]}><Text style={[s.badgeTxt, { color: theme.text + '80' }]}>{p.category}</Text></View> : null}
                </View>
                {p.summary ? <Text style={s.summary} numberOfLines={2}>{p.summary}</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB onPress={openNew} />

      {/* Detail Sheet */}
      <BottomSheet visible={showDetail} onClose={() => setShowDetail(false)} title={selectedPlaybook?.title ?? ''}>
        {selectedPlaybook && (
          <ScrollView showsVerticalScrollIndicator={false}>
            {selectedPlaybook.summary ? (
              <Text style={{ color: theme.text + '80', fontSize: 13, marginBottom: 12, lineHeight: 18 }}>{selectedPlaybook.summary}</Text>
            ) : null}
            {selectedPlaybook.content ? (
              <>
                <Text style={s.detailContent}>{selectedPlaybook.content}</Text>
                <TouchableOpacity style={s.copyBtn} onPress={() => handleCopy(selectedPlaybook.content)}>
                  <Feather name="copy" size={16} color={theme.primary} />
                  <Text style={s.copyTxt}>Copiar conteúdo</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {selectedPlaybook.dialogs.map(d => (
              <View key={d.id} style={{ marginTop: 16, backgroundColor: theme.surface, borderRadius: 8, padding: 12 }}>
                <Text style={{ color: theme.text, fontWeight: '600', marginBottom: 6 }}>{d.title}</Text>
                <Text style={{ color: theme.text + '80', fontSize: 13, lineHeight: 18 }}>{d.text}</Text>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }} onPress={() => handleCopy(d.text)}>
                  <Feather name="copy" size={13} color={theme.primary} />
                  <Text style={{ color: theme.primary, fontSize: 12 }}>Copiar</Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </BottomSheet>

      {/* Create/Edit Sheet */}
      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)} title={editingPlaybook ? 'Editar playbook' : 'Novo playbook'} onSave={handleSave}>
        <FormInput label="Título *" value={form.title} onChangeText={n => setForm(f => ({ ...f, title: n }))} placeholder="Título do playbook" autoFocus />
        <FormInput label="Setor" value={form.sector} onChangeText={n => setForm(f => ({ ...f, sector: n }))} placeholder="Ex: Vendas, Marketing, Suporte" />
        <FormInput label="Categoria" value={form.category} onChangeText={n => setForm(f => ({ ...f, category: n }))} placeholder="Ex: Prospecção, Onboarding" />
        <FormInput label="Resumo" value={form.summary} onChangeText={n => setForm(f => ({ ...f, summary: n }))} placeholder="Breve descrição..." multiline numberOfLines={2} />
        <FormInput label="Conteúdo" value={form.content} onChangeText={n => setForm(f => ({ ...f, content: n }))} placeholder="Texto completo do playbook..." multiline numberOfLines={5} />
        {editingPlaybook && (
          <TouchableOpacity style={s.deleteBtn}
            onPress={() => { setShowSheet(false); Alert.alert('Excluir', `Excluir "${editingPlaybook.title}"?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deletePlaybook(editingPlaybook.id) }]) }}>
            <Text style={{ color: '#ef4444', fontWeight: '600' }}>Excluir playbook</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 20 }} />
      </BottomSheet>
    </SafeAreaView>
  )
}
