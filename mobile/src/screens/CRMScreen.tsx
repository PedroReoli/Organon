import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { FAB } from '../components/shared/FAB'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { EmptyState } from '../components/shared/EmptyState'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { now } from '../utils/date'
import { CRM_STAGES, CRM_PRIORITY_COLORS, CRM_PRIORITY_LABELS, type CRMContact, type CRMStageId, type CRMPriority } from '../types'

type Tab = 'list' | 'pipeline'

export function CRMScreen() {
  const theme = useTheme()
  const { store, addCRMContact, updateCRMContact, deleteCRMContact } = useStore()
  const [tab, setTab] = useState<Tab>('list')
  const [search, setSearch] = useState('')
  const [showSheet, setShowSheet] = useState(false)
  const [editingContact, setEditingContact] = useState<CRMContact | null>(null)
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', stageId: 'prospeccao' as CRMStageId, priority: 'media' as CRMPriority, description: '' })

  const filtered = useMemo(() =>
    store.crmContacts.filter(c =>
      !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => a.order - b.order),
  [store.crmContacts, search])

  const byStage = useMemo(() => {
    const map: Record<string, CRMContact[]> = {}
    CRM_STAGES.forEach(s => { map[s.id] = [] })
    store.crmContacts.forEach(c => { if (map[c.stageId]) map[c.stageId].push(c) })
    return map
  }, [store.crmContacts])

  const openNew = () => {
    setEditingContact(null)
    setForm({ name: '', company: '', email: '', phone: '', stageId: 'prospeccao', priority: 'media', description: '' })
    setShowSheet(true)
  }

  const openEdit = (c: CRMContact) => {
    setEditingContact(c)
    setForm({ name: c.name, company: c.company ?? '', email: c.email ?? '', phone: c.phone ?? '', stageId: c.stageId, priority: c.priority, description: c.description })
    setShowSheet(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    const data = {
      name: form.name, company: form.company || null, email: form.email || null,
      phone: form.phone || null, stageId: form.stageId, priority: form.priority, description: form.description,
    }
    if (editingContact) {
      updateCRMContact(editingContact.id, { ...data, updatedAt: now() })
    } else {
      addCRMContact({ ...data, socialMedia: null, context: null, interests: null, tags: [], followUpDate: null, links: { noteIds: [], calendarEventIds: [], cardIds: [] }, order: store.crmContacts.length, createdAt: now(), updatedAt: now() })
    }
    setShowSheet(false)
  }

  const PRIORITIES: CRMPriority[] = ['alta', 'media', 'baixa']

  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    tabRow: { flexDirection: 'row', backgroundColor: theme.surface },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabTxt: { fontSize: 13, color: theme.text + '60' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: theme.primary },
    tabActiveTxt: { color: theme.primary, fontWeight: '700' },
    searchWrap: { margin: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 10, paddingHorizontal: 12, gap: 8 },
    searchInput: { flex: 1, color: theme.text, paddingVertical: 10, fontSize: 14 },
    list: { flex: 1, paddingHorizontal: 12 },
    contactCard: { backgroundColor: theme.surface, borderRadius: 10, padding: 14, marginBottom: 8 },
    contactHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    avatarTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
    contactName: { flex: 1, color: theme.text, fontSize: 15, fontWeight: '500' },
    priDot: { width: 8, height: 8, borderRadius: 4 },
    editBtn: { padding: 4 },
    contactMeta: { color: theme.text + '60', fontSize: 12 },
    stageBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 6, alignSelf: 'flex-start' },
    stageTxt: { fontSize: 11, fontWeight: '600' },
    pipelineWrap: { flex: 1 },
    pipelineScroll: { flex: 1 },
    stage: { marginBottom: 16, paddingHorizontal: 12 },
    stageHeader: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.text + '15', marginBottom: 8 },
    stageTitle: { color: theme.text + '80', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    stageCount: { color: theme.text + '40', fontSize: 11 },
    formRow: { marginBottom: 12 },
    rowLabel: { color: theme.text + '80', fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
    chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
    chipTxt: { fontSize: 12 },
  })

  const renderContact = (contact: CRMContact) => {
    const initial = contact.name.charAt(0).toUpperCase()
    const stageLabel = CRM_STAGES.find(s => s.id === contact.stageId)?.label ?? contact.stageId
    const priColor = CRM_PRIORITY_COLORS[contact.priority]
    return (
      <TouchableOpacity key={contact.id} style={s.contactCard} onPress={() => openEdit(contact)}>
        <View style={s.contactHeader}>
          <View style={[s.avatar, { backgroundColor: priColor + '40' }]}>
            <Text style={[s.avatarTxt, { color: priColor }]}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.contactName} numberOfLines={1}>{contact.name}</Text>
            {contact.company && <Text style={s.contactMeta} numberOfLines={1}>{contact.company}</Text>}
          </View>
          <View style={[s.priDot, { backgroundColor: priColor }]} />
          <TouchableOpacity style={s.editBtn} onPress={() => openEdit(contact)}>
            <Feather name="edit-2" size={15} color={theme.text + '50'} />
          </TouchableOpacity>
        </View>
        <View style={[s.stageBadge, { backgroundColor: theme.primary + '20' }]}>
          <Text style={[s.stageTxt, { color: theme.primary }]}>{stageLabel}</Text>
        </View>
        {contact.email && <Text style={[s.contactMeta, { marginTop: 4 }]}>{contact.email}</Text>}
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={s.screen}>
      <Header title="CRM" />

      <View style={s.tabRow}>
        {(['list', 'pipeline'] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabTxt, tab === t && s.tabActiveTxt]}>{t === 'list' ? 'Lista' : 'Pipeline'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'list' && (
        <>
          <View style={s.searchWrap}>
            <Feather name="search" size={16} color={theme.text + '60'} />
            <FormInput value={search} onChangeText={setSearch} placeholder="Buscar contato..." style={{ borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 0, paddingVertical: 0, flex: 1 }} />
          </View>
          <ScrollView style={s.list}>
            {filtered.length === 0 && <EmptyState icon="users" title="Nenhum contato" subtitle="Toque no + para adicionar" />}
            {filtered.map(renderContact)}
            <View style={{ height: 100 }} />
          </ScrollView>
        </>
      )}

      {tab === 'pipeline' && (
        <ScrollView style={s.pipelineScroll}>
          {CRM_STAGES.map(stage => {
            const contacts = byStage[stage.id] ?? []
            return (
              <View key={stage.id} style={s.stage}>
                <View style={s.stageHeader}>
                  <Text style={s.stageTitle}>{stage.label} <Text style={s.stageCount}>({contacts.length})</Text></Text>
                </View>
                {contacts.length === 0
                  ? <Text style={{ color: theme.text + '40', fontSize: 13, paddingVertical: 8 }}>Vazio</Text>
                  : contacts.map(c => (
                      <TouchableOpacity key={c.id} style={{ backgroundColor: theme.surface, borderRadius: 8, padding: 12, marginBottom: 6 }} onPress={() => openEdit(c)}>
                        <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>{c.name}</Text>
                        {c.company && <Text style={{ color: theme.text + '60', fontSize: 12 }}>{c.company}</Text>}
                      </TouchableOpacity>
                    ))
                }
              </View>
            )
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <FAB onPress={openNew} />

      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)} title={editingContact ? 'Editar contato' : 'Novo contato'} onSave={handleSave}>
        <FormInput label="Nome *" value={form.name} onChangeText={n => setForm(f => ({ ...f, name: n }))} placeholder="Nome completo" autoFocus />
        <FormInput label="Empresa" value={form.company} onChangeText={n => setForm(f => ({ ...f, company: n }))} placeholder="Empresa (opcional)" />
        <FormInput label="E-mail" value={form.email} onChangeText={n => setForm(f => ({ ...f, email: n }))} placeholder="email@exemplo.com" keyboardType="email-address" />
        <FormInput label="Telefone" value={form.phone} onChangeText={n => setForm(f => ({ ...f, phone: n }))} placeholder="+55 11 99999-0000" keyboardType="phone-pad" />

        <View style={s.formRow}>
          <Text style={s.rowLabel}>Estágio</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.chips}>
              {CRM_STAGES.map(stage => {
                const active = form.stageId === stage.id
                return (
                  <TouchableOpacity key={stage.id}
                    style={[s.chip, { borderColor: active ? theme.primary : theme.text + '30', backgroundColor: active ? theme.primary + '20' : 'transparent' }]}
                    onPress={() => setForm(f => ({ ...f, stageId: stage.id }))}>
                    <Text style={[s.chipTxt, { color: active ? theme.primary : theme.text + '60', fontWeight: active ? '600' : '400' }]}>{stage.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>
        </View>

        <View style={s.formRow}>
          <Text style={s.rowLabel}>Prioridade</Text>
          <View style={s.chips}>
            {PRIORITIES.map(p => {
              const active = form.priority === p
              const color = CRM_PRIORITY_COLORS[p]
              return (
                <TouchableOpacity key={p}
                  style={[s.chip, { borderColor: active ? color : theme.text + '30', backgroundColor: active ? color + '20' : 'transparent' }]}
                  onPress={() => setForm(f => ({ ...f, priority: p }))}>
                  <Text style={[s.chipTxt, { color: active ? color : theme.text + '60' }]}>{CRM_PRIORITY_LABELS[p]}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        <FormInput label="Notas" value={form.description} onChangeText={n => setForm(f => ({ ...f, description: n }))} placeholder="Contexto, interesse, observações..." multiline numberOfLines={3} />

        {editingContact && (
          <TouchableOpacity style={{ marginTop: 4, padding: 14, backgroundColor: '#ef444420', borderRadius: 10, alignItems: 'center' }}
            onPress={() => { setShowSheet(false); Alert.alert('Excluir', `Excluir "${editingContact.name}"?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteCRMContact(editingContact.id) }]) }}>
            <Text style={{ color: '#ef4444', fontWeight: '600' }}>Excluir contato</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 20 }} />
      </BottomSheet>
    </SafeAreaView>
  )
}
