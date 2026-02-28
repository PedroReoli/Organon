import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { Header } from '../components/shared/Header'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import {
  STATUS_COLORS, PRIORITY_COLORS, STATUS_ORDER, DAYS_ORDER, DAY_LABELS, PERIOD_LABELS, PERIODS_ORDER,
  type Card, type CardStatus, type CardPriority, type Day, type Period,
} from '../types'

// ── Component ──────────────────────────────────────────────────────────────────

export function BacklogScreen() {
  const theme = useTheme()
  const { store, addCard, updateCard, deleteCard } = useStore()

  const [statusFilter,   setStatusFilter]   = useState<CardStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<CardPriority | 'all'>('all')

  // Edit/create sheet
  const [sheetOpen,  setSheetOpen]  = useState(false)
  const [editCard,   setEditCard]   = useState<Card | null>(null)
  const [form, setForm] = useState<{ title: string; priority: CardPriority | null; status: CardStatus }>({
    title: '', priority: null, status: 'todo',
  })

  // Schedule sheet (assign backlog card to day+period)
  const [scheduleCard,    setScheduleCard]    = useState<Card | null>(null)
  const [scheduleDay,     setScheduleDay]     = useState<Day>('mon')
  const [schedulePeriod,  setSchedulePeriod]  = useState<Period>('morning')

  // Cards without a scheduled day
  const backlogCards = useMemo(() => store.cards.filter(c => !c.location.day), [store.cards])

  const filtered = useMemo(() => backlogCards.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false
    return true
  }), [backlogCards, statusFilter, priorityFilter])

  function openAdd() {
    setEditCard(null)
    setForm({ title: '', priority: null, status: 'todo' })
    setSheetOpen(true)
  }

  function openEdit(card: Card) {
    setEditCard(card)
    setForm({ title: card.title, priority: card.priority, status: card.status })
    setSheetOpen(true)
  }

  function handleSave() {
    if (!form.title.trim()) return
    if (editCard) {
      updateCard(editCard.id, { title: form.title, priority: form.priority, status: form.status })
    } else {
      addCard({ title: form.title, priority: form.priority, status: form.status, location: { day: null, period: null } })
    }
    setSheetOpen(false)
  }

  function openSchedule(card: Card) {
    setScheduleCard(card)
    setScheduleDay('mon')
    setSchedulePeriod('morning')
  }

  function confirmSchedule() {
    if (!scheduleCard) return
    updateCard(scheduleCard.id, { location: { day: scheduleDay, period: schedulePeriod } })
    setScheduleCard(null)
  }

  function cycleStatus(card: Card) {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(card.status) + 1) % STATUS_ORDER.length]
    updateCard(card.id, { status: next })
  }

  const STATUSES: (CardStatus | 'all')[] = ['all', ...STATUS_ORDER]
  const PRIORITIES: (CardPriority | 'all')[] = ['all', 'P1', 'P2', 'P3', 'P4']

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <Header title="Backlog" rightIcon="plus" onRightPress={openAdd} />
      <View style={[styles.summaryBar, { borderBottomColor: theme.text + '12' }]}>
        <Text style={[styles.summaryText, { color: theme.text + '50' }]}>
          {backlogCards.length} nao agendados - {backlogCards.filter(c => c.status === 'done').length} concluidos
        </Text>
      </View>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.text + '12' }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Backlog</Text>
          <Text style={[styles.headerSub, { color: theme.text + '50' }]}>
            {backlogCards.length} não agendados · {backlogCards.filter(c => c.status === 'done').length} concluídos
          </Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.primary }]} onPress={openAdd}>
          <Feather name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Status filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {STATUSES.map(s => {
          const active = statusFilter === s
          const color  = s === 'all' ? theme.primary : STATUS_COLORS[s]
          return (
            <TouchableOpacity
              key={s}
              style={[styles.chip, active ? { backgroundColor: color } : { backgroundColor: theme.text + '08', borderColor: theme.text + '15' }]}
              onPress={() => setStatusFilter(s)}
            >
              {s !== 'all' && <View style={[styles.chipDot, { backgroundColor: active ? '#fff' : STATUS_COLORS[s] }]} />}
              <Text style={[styles.chipText, { color: active ? '#fff' : theme.text + '80' }]}>
                {s === 'all' ? 'Todos' : s.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Priority filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {PRIORITIES.map(p => {
          const active = priorityFilter === p
          const color  = p === 'all' ? theme.primary : PRIORITY_COLORS[p]
          return (
            <TouchableOpacity
              key={p}
              style={[styles.chip, active ? { backgroundColor: color } : { backgroundColor: theme.text + '08', borderColor: theme.text + '15' }]}
              onPress={() => setPriorityFilter(p)}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : p === 'all' ? theme.text + '80' : PRIORITY_COLORS[p] }]}>
                {p === 'all' ? 'Prioridade' : p}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Card list */}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Feather name="inbox" size={44} color={theme.text + '20'} />
            <Text style={[styles.emptyTitle, { color: theme.text + '40' }]}>Backlog vazio</Text>
            <Text style={[styles.emptySub, { color: theme.text + '30' }]}>
              Cards sem dia agendado aparecem aqui
            </Text>
          </View>
        )}

        {filtered.map(card => (
          <View key={card.id} style={[styles.card, { backgroundColor: theme.surface }]}>
            <TouchableOpacity
              style={[styles.statusDot, { backgroundColor: STATUS_COLORS[card.status] }]}
              onPress={() => cycleStatus(card)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            />
            <TouchableOpacity style={styles.cardBody} onPress={() => openEdit(card)}>
              <Text
                style={[
                  styles.cardTitle,
                  { color: theme.text },
                  card.status === 'done' && { opacity: 0.4, textDecorationLine: 'line-through' },
                ]}
                numberOfLines={2}
              >
                {card.title}
              </Text>
              {card.priority && (
                <View style={[styles.priorityTag, { backgroundColor: PRIORITY_COLORS[card.priority] + '18' }]}>
                  <Text style={[styles.priorityTagText, { color: PRIORITY_COLORS[card.priority] }]}>
                    {card.priority}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Schedule button */}
            <TouchableOpacity
              style={[styles.scheduleBtn, { backgroundColor: theme.primary + '15' }]}
              onPress={() => openSchedule(card)}
            >
              <Feather name="calendar" size={14} color={theme.primary} />
            </TouchableOpacity>
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Edit/Create sheet ── */}
      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title={editCard ? 'Editar card' : 'Novo card'}>
        <FormInput
          label="Título"
          value={form.title}
          onChangeText={t => setForm(f => ({ ...f, title: t }))}
          placeholder="O que precisa ser feito?"
          autoFocus
        />

        <Text style={[styles.sheetLabel, { color: theme.text + '70' }]}>STATUS</Text>
        <View style={styles.chips}>
          {STATUS_ORDER.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, form.status === s ? { backgroundColor: STATUS_COLORS[s] + '28', borderColor: STATUS_COLORS[s], borderWidth: 1 } : { backgroundColor: theme.text + '08', borderColor: 'transparent', borderWidth: 1 }]}
              onPress={() => setForm(f => ({ ...f, status: s }))}
            >
              <View style={[styles.chipDot, { backgroundColor: STATUS_COLORS[s] }]} />
              <Text style={[styles.chipText, { color: theme.text }]}>{s.replace('_', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sheetLabel, { color: theme.text + '70', marginTop: 14 }]}>PRIORIDADE</Text>
        <View style={styles.chips}>
          {(['P1', 'P2', 'P3', 'P4'] as CardPriority[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, form.priority === p ? { backgroundColor: PRIORITY_COLORS[p] + '28', borderColor: PRIORITY_COLORS[p], borderWidth: 1 } : { backgroundColor: theme.text + '08', borderColor: 'transparent', borderWidth: 1 }]}
              onPress={() => setForm(f => ({ ...f, priority: f.priority === p ? null : p }))}
            >
              <Text style={[styles.chipText, { color: PRIORITY_COLORS[p], fontWeight: '700' }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.sheetActions, { marginTop: 22 }]}>
          {editCard && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#ef444415', flex: 1 }]}
              onPress={() => { deleteCard(editCard.id); setSheetOpen(false) }}
            >
              <Text style={{ color: '#ef4444', fontWeight: '600' }}>Excluir</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.primary, flex: editCard ? 2 : 1 }]}
            onPress={handleSave}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Salvar</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* ── Schedule sheet ── */}
      <BottomSheet
        visible={!!scheduleCard}
        onClose={() => setScheduleCard(null)}
        title={`Agendar: ${scheduleCard?.title?.slice(0, 30) ?? ''}`}
      >
        <Text style={[styles.sheetLabel, { color: theme.text + '70' }]}>DIA DA SEMANA</Text>
        <View style={styles.chips}>
          {DAYS_ORDER.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.chip, scheduleDay === d ? { backgroundColor: theme.primary, borderColor: theme.primary, borderWidth: 1 } : { backgroundColor: theme.text + '08', borderColor: 'transparent', borderWidth: 1 }]}
              onPress={() => setScheduleDay(d)}
            >
              <Text style={[styles.chipText, { color: scheduleDay === d ? '#fff' : theme.text }]}>{DAY_LABELS[d]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sheetLabel, { color: theme.text + '70', marginTop: 14 }]}>PERÍODO</Text>
        <View style={styles.chips}>
          {PERIODS_ORDER.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, schedulePeriod === p ? { backgroundColor: theme.primary, borderColor: theme.primary, borderWidth: 1 } : { backgroundColor: theme.text + '08', borderColor: 'transparent', borderWidth: 1 }]}
              onPress={() => setSchedulePeriod(p)}
            >
              <Text style={[styles.chipText, { color: schedulePeriod === p ? '#fff' : theme.text }]}>
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.primary, marginTop: 22 }]}
          onPress={confirmSchedule}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Agendar para {DAY_LABELS[scheduleDay]} — {PERIOD_LABELS[schedulePeriod]}</Text>
        </TouchableOpacity>
      </BottomSheet>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:         { flex: 1 },
  summaryBar:   { borderBottomWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  summaryText:  { fontSize: 12.5, fontWeight: '500' },

  header:       { display: 'none', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
  headerTitle:  { fontSize: 18, fontWeight: '700' },
  headerSub:    { fontSize: 12, marginTop: 2 },
  addBtn:       { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

  filterBar:    { flexGrow: 0, maxHeight: 48 },
  filterContent: { paddingHorizontal: 14, paddingVertical: 8, gap: 7, flexDirection: 'row', alignItems: 'center' },

  list:         { padding: 14, gap: 8 },

  card:         { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, gap: 12 },
  statusDot:    { width: 13, height: 13, borderRadius: 7, flexShrink: 0 },
  cardBody:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle:    { flex: 1, fontSize: 14, fontWeight: '500', lineHeight: 20 },
  priorityTag:  { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  priorityTagText: { fontSize: 11, fontWeight: '700' },
  scheduleBtn:  { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  chip:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 5, borderWidth: 1 },
  chipDot:      { width: 8, height: 8, borderRadius: 4 },
  chipText:     { fontSize: 12, fontWeight: '600' },
  chips:        { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },

  sheetLabel:   { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  sheetActions: { flexDirection: 'row', gap: 10 },
  btn:          { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },

  empty:        { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10 },
  emptyTitle:   { fontSize: 16, fontWeight: '600' },
  emptySub:     { fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
})
