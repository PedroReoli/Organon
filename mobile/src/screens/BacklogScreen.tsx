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
import {
  STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS,
  type Card, type CardStatus, type CardPriority,
} from '../types'

const STATUSES: CardStatus[] = ['todo', 'in_progress', 'blocked', 'done']
const PRIORITIES: CardPriority[] = ['P1', 'P2', 'P3', 'P4']

export function BacklogScreen() {
  const theme = useTheme()
  const { store, addCard, updateCard, deleteCard } = useStore()
  const [filterStatus, setFilterStatus] = useState<CardStatus | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<CardPriority | 'all'>('all')
  const [showSheet, setShowSheet] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [form, setForm] = useState({ title: '', priority: null as CardPriority | null, status: 'todo' as CardStatus })

  const backlogCards = useMemo(() =>
    store.cards
      .filter(c => !c.location.day && !c.location.period)
      .filter(c => filterStatus === 'all' || c.status === filterStatus)
      .filter(c => filterPriority === 'all' || c.priority === filterPriority)
      .sort((a, b) => {
        const pOrder = { P1: 0, P2: 1, P3: 2, P4: 3, null: 4 }
        return (pOrder[a.priority ?? 'null'] ?? 4) - (pOrder[b.priority ?? 'null'] ?? 4)
      }),
  [store.cards, filterStatus, filterPriority])

  const openNew = () => {
    setEditingCard(null)
    setForm({ title: '', priority: null, status: 'todo' })
    setShowSheet(true)
  }

  const openEdit = (card: Card) => {
    setEditingCard(card)
    setForm({ title: card.title, priority: card.priority, status: card.status })
    setShowSheet(true)
  }

  const handleSave = () => {
    if (!form.title.trim()) return
    if (editingCard) {
      updateCard(editingCard.id, { title: form.title, priority: form.priority, status: form.status })
    } else {
      addCard({ title: form.title, priority: form.priority, status: form.status, location: { day: null, period: null }, order: backlogCards.length, createdAt: now(), updatedAt: now() })
    }
    setShowSheet(false)
  }

  const cycleStatus = (card: Card) => {
    const idx = STATUSES.indexOf(card.status)
    updateCard(card.id, { status: STATUSES[(idx + 1) % STATUSES.length] })
  }

  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    filters: { backgroundColor: theme.surface, padding: 12, gap: 8 },
    filterRow: { flexDirection: 'row', gap: 6 },
    chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
    chipTxt: { fontSize: 12 },
    list: { flex: 1, padding: 12 },
    card: { backgroundColor: theme.surface, borderRadius: 10, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
    dot: { width: 10, height: 10, borderRadius: 5 },
    cardTitle: { flex: 1, color: theme.text, fontSize: 14 },
    badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    badgeTxt: { fontSize: 10, fontWeight: '700', color: '#fff' },
    editBtn: { padding: 4 },
    formRow: { marginBottom: 12 },
    rowLabel: { color: theme.text + '80', fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
    chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  })

  const chipStyle = (active: boolean, color?: string) => ({
    ...s.chip,
    borderColor: color || (active ? theme.primary : theme.text + '30'),
    backgroundColor: active ? (color || theme.primary) + '30' : 'transparent',
  })
  const chipTxtStyle = (active: boolean, color?: string) => ({
    ...s.chipTxt,
    color: active ? (color || theme.primary) : theme.text + '60',
    fontWeight: active ? '700' as const : '400' as const,
  })

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Backlog" />

      {/* Filters */}
      <View style={s.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.filterRow}>
            <TouchableOpacity style={chipStyle(filterStatus === 'all')} onPress={() => setFilterStatus('all')}>
              <Text style={chipTxtStyle(filterStatus === 'all')}>Todos</Text>
            </TouchableOpacity>
            {STATUSES.map(st => (
              <TouchableOpacity key={st} style={chipStyle(filterStatus === st, STATUS_COLORS[st])} onPress={() => setFilterStatus(st)}>
                <Text style={chipTxtStyle(filterStatus === st, STATUS_COLORS[st])}>{STATUS_LABELS[st]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.filterRow}>
            <TouchableOpacity style={chipStyle(filterPriority === 'all')} onPress={() => setFilterPriority('all')}>
              <Text style={chipTxtStyle(filterPriority === 'all')}>Qualquer prioridade</Text>
            </TouchableOpacity>
            {PRIORITIES.map(p => (
              <TouchableOpacity key={p} style={chipStyle(filterPriority === p, PRIORITY_COLORS[p])} onPress={() => setFilterPriority(p)}>
                <Text style={chipTxtStyle(filterPriority === p, PRIORITY_COLORS[p])}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Count */}
      <Text style={{ color: theme.text + '60', fontSize: 12, paddingHorizontal: 16, paddingTop: 10 }}>
        {backlogCards.length} card{backlogCards.length !== 1 ? 's' : ''}
      </Text>

      <ScrollView style={s.list}>
        {backlogCards.length === 0
          ? <EmptyState icon="list" title="Backlog vazio" subtitle="Toque no + para adicionar" />
          : backlogCards.map(card => (
              <View key={card.id} style={s.card}>
                <TouchableOpacity onPress={() => cycleStatus(card)}>
                  <View style={[s.dot, { backgroundColor: STATUS_COLORS[card.status] }]} />
                </TouchableOpacity>
                <Text style={[s.cardTitle, card.status === 'done' && { opacity: 0.4 }]} numberOfLines={2}>{card.title}</Text>
                {card.priority && (
                  <View style={[s.badge, { backgroundColor: PRIORITY_COLORS[card.priority] }]}>
                    <Text style={s.badgeTxt}>{card.priority}</Text>
                  </View>
                )}
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(card)}>
                  <Feather name="edit-2" size={15} color={theme.text + '60'} />
                </TouchableOpacity>
              </View>
            ))
        }
        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB onPress={openNew} />

      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)} title={editingCard ? 'Editar card' : 'Novo card'} onSave={handleSave}>
        <FormInput label="Título" value={form.title} onChangeText={t => setForm(f => ({ ...f, title: t }))} placeholder="Título do card" autoFocus />
        <View style={s.formRow}>
          <Text style={s.rowLabel}>Prioridade</Text>
          <View style={s.chips}>
            {([null, ...PRIORITIES] as (CardPriority | null)[]).map(p => {
              const active = form.priority === p
              const color = p ? PRIORITY_COLORS[p] : undefined
              return (
                <TouchableOpacity key={p ?? 'none'} style={chipStyle(active, color)} onPress={() => setForm(f => ({ ...f, priority: p }))}>
                  <Text style={chipTxtStyle(active, color)}>{p ?? 'Nenhuma'}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
        <View style={s.formRow}>
          <Text style={s.rowLabel}>Status</Text>
          <View style={s.chips}>
            {STATUSES.map(st => {
              const active = form.status === st
              return (
                <TouchableOpacity key={st} style={chipStyle(active, STATUS_COLORS[st])} onPress={() => setForm(f => ({ ...f, status: st }))}>
                  <Text style={chipTxtStyle(active, STATUS_COLORS[st])}>{STATUS_LABELS[st]}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
        {editingCard && (
          <TouchableOpacity style={{ marginTop: 4, padding: 14, backgroundColor: '#ef444420', borderRadius: 10, alignItems: 'center' }}
            onPress={() => { setShowSheet(false); Alert.alert('Excluir', `Excluir "${editingCard.title}"?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteCard(editingCard.id) }]) }}>
            <Text style={{ color: '#ef4444', fontWeight: '600' }}>Excluir card</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 20 }} />
      </BottomSheet>
    </SafeAreaView>
  )
}
