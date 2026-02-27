import React, { useState, useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Alert,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { FAB } from '../components/shared/FAB'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { EmptyState } from '../components/shared/EmptyState'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { today, getDayOfWeek } from '../utils/date'
import { uid } from '../utils/format'
import { now } from '../utils/date'
import {
  DAYS_ORDER, DAY_LABELS, PERIODS_ORDER, PERIOD_LABELS,
  STATUS_COLORS, PRIORITY_COLORS, STATUS_LABELS,
  type Day, type Period, type Card, type CardStatus, type CardPriority,
} from '../types'

const PRIORITIES: CardPriority[] = ['P1', 'P2', 'P3', 'P4']
const STATUSES: CardStatus[] = ['todo', 'in_progress', 'blocked', 'done']

export function PlannerScreen() {
  const theme = useTheme()
  const { store, addCard, updateCard, deleteCard } = useStore()

  const todayDay = getDayOfWeek(today())
  const [activeDay, setActiveDay] = useState<Day>(todayDay)
  const [activePeriod, setActivePeriod] = useState<Period>('morning')
  const [showSheet, setShowSheet] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [form, setForm] = useState({ title: '', priority: null as CardPriority | null, status: 'todo' as CardStatus })

  const cards = useMemo(() =>
    store.cards
      .filter(c => c.location.day === activeDay && c.location.period === activePeriod)
      .sort((a, b) => a.order - b.order),
  [store.cards, activeDay, activePeriod])

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
      addCard({
        title: form.title, priority: form.priority, status: form.status,
        location: { day: activeDay, period: activePeriod },
        order: cards.length, createdAt: now(), updatedAt: now(),
      })
    }
    setShowSheet(false)
  }

  const handleDelete = (card: Card) => {
    Alert.alert('Excluir card', `Excluir "${card.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteCard(card.id) },
    ])
  }

  const cycleStatus = (card: Card) => {
    const idx = STATUSES.indexOf(card.status)
    const next = STATUSES[(idx + 1) % STATUSES.length]
    updateCard(card.id, { status: next })
  }

  const s = StyleSheet.create({
    screen:    { flex: 1, backgroundColor: theme.background },
    dayTabs:   { backgroundColor: theme.surface, flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6 },
    dayTab:    { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 6 },
    dayTabTxt: { fontSize: 12, color: theme.text + '60' },
    dayActive: { backgroundColor: theme.primary },
    dayActTxt: { color: '#fff', fontWeight: '700' },
    periodRow: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: theme.background },
    periodBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.text + '30' },
    periodBtnA: { backgroundColor: theme.primary, borderColor: theme.primary },
    periodTxt: { color: theme.text, fontSize: 13 },
    periodTxtA: { color: '#fff', fontWeight: '600' },
    cardWrap:  { margin: 12, marginTop: 4, backgroundColor: theme.surface, borderRadius: 12, overflow: 'hidden' },
    cardItem:  { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    cardTitle: { flex: 1, color: theme.text, fontSize: 14 },
    priority:  { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    priTxt:    { fontSize: 10, fontWeight: '700', color: '#fff' },
    editBtn:   { padding: 4 },
    divider:   { height: 1, backgroundColor: theme.text + '10', marginHorizontal: 12 },
    list:      { flex: 1 },
    formRow:   { marginBottom: 12 },
    rowLabel:  { color: theme.text + '80', fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
    chips:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
    chipTxt:   { fontSize: 12 },
  })

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Planejador" />

      {/* Day tabs */}
      <View style={s.dayTabs}>
        {DAYS_ORDER.map(day => {
          const isActive = day === activeDay
          const isToday = day === todayDay
          return (
            <TouchableOpacity
              key={day}
              style={[s.dayTab, isActive && s.dayActive]}
              onPress={() => setActiveDay(day)}
            >
              <Text style={[s.dayTabTxt, isActive && s.dayActTxt, isToday && !isActive && { color: theme.primary }]}>
                {DAY_LABELS[day]}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Period tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
        <View style={s.periodRow}>
          {PERIODS_ORDER.map(period => {
            const isActive = period === activePeriod
            return (
              <TouchableOpacity
                key={period}
                style={[s.periodBtn, isActive && s.periodBtnA]}
                onPress={() => setActivePeriod(period)}
              >
                <Text style={[s.periodTxt, isActive && s.periodTxtA]}>{PERIOD_LABELS[period]}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>

      {/* Cards list */}
      <ScrollView style={s.list}>
        {cards.length === 0
          ? <EmptyState icon="grid" title="Nenhum card aqui" subtitle="Toque no + para adicionar" />
          : <View style={s.cardWrap}>
              {cards.map((card, idx) => (
                <React.Fragment key={card.id}>
                  {idx > 0 && <View style={s.divider} />}
                  <View style={s.cardItem}>
                    <TouchableOpacity onPress={() => cycleStatus(card)}>
                      <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[card.status] }]} />
                    </TouchableOpacity>
                    <Text style={[s.cardTitle, card.status === 'done' && { opacity: 0.4 }]} numberOfLines={2}>
                      {card.title}
                    </Text>
                    {card.priority && (
                      <View style={[s.priority, { backgroundColor: PRIORITY_COLORS[card.priority] }]}>
                        <Text style={s.priTxt}>{card.priority}</Text>
                      </View>
                    )}
                    <TouchableOpacity style={s.editBtn} onPress={() => openEdit(card)}>
                      <Feather name="more-vertical" size={16} color={theme.text + '60'} />
                    </TouchableOpacity>
                  </View>
                </React.Fragment>
              ))}
            </View>
        }
        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB onPress={openNew} />

      {/* Card Sheet */}
      <BottomSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        title={editingCard ? 'Editar card' : 'Novo card'}
        onSave={handleSave}
      >
        <FormInput
          label="Título"
          value={form.title}
          onChangeText={t => setForm(f => ({ ...f, title: t }))}
          placeholder="Título do card"
          autoFocus
        />

        {/* Priority */}
        <View style={s.formRow}>
          <Text style={s.rowLabel}>Prioridade</Text>
          <View style={s.chips}>
            {[null, ...PRIORITIES].map(p => {
              const isActive = form.priority === p
              return (
                <TouchableOpacity
                  key={p ?? 'none'}
                  style={[
                    s.chip,
                    { borderColor: p ? PRIORITY_COLORS[p] : theme.text + '30' },
                    isActive && { backgroundColor: p ? PRIORITY_COLORS[p] : theme.text + '20' },
                  ]}
                  onPress={() => setForm(f => ({ ...f, priority: p }))}
                >
                  <Text style={[s.chipTxt, { color: p ? PRIORITY_COLORS[p] : theme.text + '60' }, isActive && { color: p ? '#fff' : theme.text }]}>
                    {p ?? 'Nenhuma'}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Status */}
        <View style={s.formRow}>
          <Text style={s.rowLabel}>Status</Text>
          <View style={s.chips}>
            {STATUSES.map(st => {
              const isActive = form.status === st
              return (
                <TouchableOpacity
                  key={st}
                  style={[s.chip, { borderColor: STATUS_COLORS[st] }, isActive && { backgroundColor: STATUS_COLORS[st] }]}
                  onPress={() => setForm(f => ({ ...f, status: st }))}
                >
                  <Text style={[s.chipTxt, { color: STATUS_COLORS[st] }, isActive && { color: '#fff' }]}>
                    {STATUS_LABELS[st]}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {editingCard && (
          <TouchableOpacity
            style={{ marginTop: 8, padding: 14, backgroundColor: '#ef444420', borderRadius: 10, alignItems: 'center' }}
            onPress={() => { setShowSheet(false); handleDelete(editingCard) }}
          >
            <Text style={{ color: '#ef4444', fontWeight: '600' }}>Excluir card</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 20 }} />
      </BottomSheet>
    </SafeAreaView>
  )
}
