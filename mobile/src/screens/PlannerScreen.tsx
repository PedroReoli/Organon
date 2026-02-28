import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { getDayOfWeek, today } from '../utils/date'
import {
  DAYS_ORDER, DAY_LABELS, DAY_LABELS_FULL, PERIODS_ORDER, PERIOD_LABELS,
  STATUS_COLORS, PRIORITY_COLORS, STATUS_ORDER,
  type Day, type Period, type Card, type CardStatus, type CardPriority,
} from '../types'

// ── Period config — cores idênticas ao desktop ─────────────────────────────────
//   desktop colors.css: morning=#fbbf24  afternoon=#f97316  night=#6366f1

const PERIOD_CONFIG: Record<Period, {
  icon: string
  color: string
  textColor: string
  bg: string
}> = {
  morning:   { icon: 'sunrise', color: '#fbbf24', textColor: '#fcd34d', bg: 'rgba(251,191,36,0.12)'  },
  afternoon: { icon: 'sun',     color: '#f97316', textColor: '#fb923c', bg: 'rgba(249,115,22,0.12)'  },
  night:     { icon: 'moon',    color: '#818cf8', textColor: '#a5b4fc', bg: 'rgba(99,102,241,0.12)'  },
}

const STATUS_ICONS: Record<CardStatus, string | null> = {
  todo:        null,
  in_progress: 'loader',
  blocked:     'alert-circle',
  done:        'check-circle',
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PlannerScreen() {
  const theme = useTheme()
  const { store, addCard, updateCard, deleteCard } = useStore()

  const todayDay = getDayOfWeek(today())
  const [selectedDay,  setSelectedDay]  = useState<Day>(todayDay)
  const [viewMode,     setViewMode]     = useState<'week' | 'day'>('week')
  const [sheetOpen,    setSheetOpen]    = useState(false)
  const [editCard,     setEditCard]     = useState<Card | null>(null)
  const [activePeriod, setActivePeriod] = useState<Period>('morning')
  const [form, setForm] = useState<{
    title: string; priority: CardPriority | null; status: CardStatus
  }>({ title: '', priority: null, status: 'todo' })

  // Day mode always shows today; week mode shows selected day
  const activeDay = viewMode === 'day' ? todayDay : selectedDay

  const dayCards = store.cards.filter(c => c.location.day === activeDay)
  const doneCount = dayCards.filter(c => c.status === 'done').length
  const totalCount = dayCards.length

  function openAdd(period: Period) {
    setEditCard(null)
    setActivePeriod(period)
    setForm({ title: '', priority: null, status: 'todo' })
    setSheetOpen(true)
  }

  function openEdit(card: Card) {
    setEditCard(card)
    setActivePeriod(card.location.period ?? 'morning')
    setForm({ title: card.title, priority: card.priority, status: card.status })
    setSheetOpen(true)
  }

  function handleSave() {
    if (!form.title.trim()) return
    if (editCard) {
      updateCard(editCard.id, { title: form.title, priority: form.priority, status: form.status })
    } else {
      addCard({
        title: form.title,
        priority: form.priority,
        status: form.status,
        location: { day: activeDay, period: activePeriod },
      })
    }
    setSheetOpen(false)
  }

  function cycleStatus(card: Card) {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(card.status) + 1) % STATUS_ORDER.length]
    updateCard(card.id, { status: next })
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>

      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: theme.text + '14' }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Planejador</Text>
        <View style={[styles.modeToggle, { backgroundColor: theme.text + '0e' }]}>
          <TouchableOpacity
            style={[styles.modeBtn, viewMode === 'week' && { backgroundColor: theme.primary }]}
            onPress={() => setViewMode('week')}
          >
            <Feather name="grid" size={13} color={viewMode === 'week' ? '#fff' : theme.text + '80'} />
            <Text style={[styles.modeBtnLabel, { color: viewMode === 'week' ? '#fff' : theme.text + '80' }]}>
              Semana
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, viewMode === 'day' && { backgroundColor: theme.primary }]}
            onPress={() => setViewMode('day')}
          >
            <Feather name="calendar" size={13} color={viewMode === 'day' ? '#fff' : theme.text + '80'} />
            <Text style={[styles.modeBtnLabel, { color: viewMode === 'day' ? '#fff' : theme.text + '80' }]}>
              Hoje
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Day selector (week mode only) ── */}
      {viewMode === 'week' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dayBar}
          contentContainerStyle={styles.dayBarContent}
        >
          {DAYS_ORDER.map(day => {
            const isToday    = day === todayDay
            const isSelected = day === selectedDay
            const pending    = store.cards.filter(
              c => c.location.day === day && c.status !== 'done'
            ).length
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayChip,
                  isSelected
                    ? { backgroundColor: theme.primary }
                    : isToday
                    ? { borderColor: theme.primary, borderWidth: 1.5, backgroundColor: theme.primary + '12' }
                    : { backgroundColor: theme.text + '08' },
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[
                  styles.dayChipText,
                  { color: isSelected ? '#fff' : isToday ? theme.primary : theme.text + '90' },
                ]}>
                  {DAY_LABELS[day]}
                </Text>
                {pending > 0 && (
                  <View style={[
                    styles.dayBadge,
                    { backgroundColor: isSelected ? '#ffffff40' : theme.primary + '25' },
                  ]}>
                    <Text style={[styles.dayBadgeNum, { color: isSelected ? '#fff' : theme.primary }]}>
                      {pending}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      {/* ── Day mode — today summary ── */}
      {viewMode === 'day' && (
        <View style={[styles.todayBar, { backgroundColor: theme.surface, borderBottomColor: theme.text + '10' }]}>
          <View style={[styles.todayIcon, { backgroundColor: theme.primary + '20' }]}>
            <Feather name="calendar" size={16} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.todayLabel, { color: theme.text }]}>
              {DAY_LABELS_FULL[todayDay]}
            </Text>
            <Text style={[styles.todaySub, { color: theme.text + '55' }]}>
              {doneCount}/{totalCount} tarefas concluídas
            </Text>
          </View>
          {totalCount > 0 && (
            <View style={[styles.progressPill, { backgroundColor: theme.text + '10' }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: theme.primary,
                    width: `${Math.round((doneCount / totalCount) * 100)}%` as any,
                  },
                ]}
              />
            </View>
          )}
        </View>
      )}

      {/* ── Period sections ── */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {PERIODS_ORDER.map(period => {
          const cfg   = PERIOD_CONFIG[period]
          const cards = store.cards.filter(
            c => c.location.day === activeDay && c.location.period === period
          )

          return (
            <View key={period} style={[styles.periodBlock, { backgroundColor: theme.surface }]}>

              {/* Period header — idêntico ao desktop period-label row */}
              <View style={[styles.periodHeader, {
                backgroundColor: cfg.bg,
                borderBottomColor: cfg.color + '40',
              }]}>
                <View style={[styles.periodIconWrap, { backgroundColor: cfg.color + '20' }]}>
                  <Feather name={cfg.icon as any} size={15} color={cfg.color} />
                </View>
                <Text style={[styles.periodLabel, { color: cfg.textColor }]}>
                  {PERIOD_LABELS[period].toUpperCase()}
                </Text>
                <Text style={[styles.periodCardCount, { color: cfg.color + 'aa' }]}>
                  {cards.length > 0 ? cards.length : ''}
                </Text>
                <TouchableOpacity
                  style={[styles.periodAddBtn, { backgroundColor: cfg.color + '20' }]}
                  onPress={() => openAdd(period)}
                >
                  <Feather name="plus" size={14} color={cfg.color} />
                </TouchableOpacity>
              </View>

              {/* Cards */}
              <View style={styles.cardList}>
                {cards.map(card => {
                  const statusIcon = STATUS_ICONS[card.status]
                  const isDone = card.status === 'done'
                  return (
                    <TouchableOpacity
                      key={card.id}
                      style={[styles.cardRow, {
                        borderBottomColor: theme.text + '08',
                      }]}
                      onPress={() => openEdit(card)}
                      activeOpacity={0.65}
                    >
                      {/* Status icon / dot */}
                      <TouchableOpacity
                        onPress={() => cycleStatus(card)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.statusWrap}
                      >
                        {statusIcon ? (
                          <Feather
                            name={statusIcon as any}
                            size={14}
                            color={STATUS_COLORS[card.status]}
                          />
                        ) : (
                          <View style={[styles.statusCircle, { borderColor: STATUS_COLORS[card.status] }]} />
                        )}
                      </TouchableOpacity>

                      {/* Title */}
                      <Text
                        style={[
                          styles.cardTitle,
                          { color: theme.text },
                          isDone && { opacity: 0.38, textDecorationLine: 'line-through' },
                        ]}
                        numberOfLines={2}
                      >
                        {card.title}
                      </Text>

                      {/* Priority dot (right side, like desktop) */}
                      {card.priority && (
                        <View
                          style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[card.priority] }]}
                        />
                      )}
                    </TouchableOpacity>
                  )
                })}

                {/* Empty state */}
                {cards.length === 0 && (
                  <TouchableOpacity
                    style={styles.emptyRow}
                    onPress={() => openAdd(period)}
                  >
                    <Feather name="plus" size={13} color={theme.text + '28'} />
                    <Text style={[styles.emptyText, { color: theme.text + '28' }]}>
                      Adicionar tarefa
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )
        })}

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* ── Bottom Sheet ── */}
      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editCard ? 'Editar tarefa' : `Nova — ${PERIOD_LABELS[activePeriod]}`}
      >
        <FormInput
          label="Título"
          value={form.title}
          onChangeText={t => setForm(f => ({ ...f, title: t }))}
          placeholder="O que precisa ser feito?"
          autoFocus
        />

        <Text style={[styles.sheetSectionLabel, { color: theme.text + '70' }]}>STATUS</Text>
        <View style={styles.chipRow}>
          {STATUS_ORDER.map(s => {
            const active = form.status === s
            const icon   = STATUS_ICONS[s]
            return (
              <TouchableOpacity
                key={s}
                style={[
                  styles.sheetChip,
                  active
                    ? { backgroundColor: STATUS_COLORS[s] + '28', borderColor: STATUS_COLORS[s] }
                    : { backgroundColor: theme.text + '08', borderColor: 'transparent' },
                ]}
                onPress={() => setForm(f => ({ ...f, status: s }))}
              >
                {icon ? (
                  <Feather name={icon as any} size={11} color={STATUS_COLORS[s]} />
                ) : (
                  <View style={[styles.smallDot, { borderColor: STATUS_COLORS[s] }]} />
                )}
                <Text style={[styles.chipLabel, { color: active ? theme.text : theme.text + '80' }]}>
                  {s.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={[styles.sheetSectionLabel, { color: theme.text + '70', marginTop: 14 }]}>PRIORIDADE</Text>
        <View style={styles.chipRow}>
          {(['P1', 'P2', 'P3', 'P4'] as CardPriority[]).map(p => {
            const active = form.priority === p
            return (
              <TouchableOpacity
                key={p}
                style={[
                  styles.sheetChip,
                  active
                    ? { backgroundColor: PRIORITY_COLORS[p] + '28', borderColor: PRIORITY_COLORS[p] }
                    : { backgroundColor: theme.text + '08', borderColor: 'transparent' },
                ]}
                onPress={() => setForm(f => ({ ...f, priority: f.priority === p ? null : p }))}
              >
                <View style={[styles.smallDot, { backgroundColor: PRIORITY_COLORS[p], borderColor: 'transparent' }]} />
                <Text style={[styles.chipLabel, { color: PRIORITY_COLORS[p], fontWeight: '700' }]}>{p}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={[styles.sheetActions, { marginTop: 22 }]}>
          {editCard && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#ef444415', flex: 1 }]}
              onPress={() => { deleteCard(editCard.id); setSheetOpen(false) }}
            >
              <Text style={{ color: '#ef4444', fontWeight: '600' }}>Excluir</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.primary, flex: editCard ? 2 : 1 }]}
            onPress={handleSave}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Salvar</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:            { flex: 1 },

  // Header
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1 },
  headerTitle:     { fontSize: 17, fontWeight: '700' },
  modeToggle:      { flexDirection: 'row', borderRadius: 10, overflow: 'hidden', padding: 3, gap: 2 },
  modeBtn:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 5 },
  modeBtnLabel:    { fontSize: 12, fontWeight: '600' },

  // Day bar
  dayBar:          { flexGrow: 0, maxHeight: 50 },
  dayBarContent:   { paddingHorizontal: 12, paddingVertical: 9, gap: 7, flexDirection: 'row', alignItems: 'center' },
  dayChip:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 5, borderRadius: 18, gap: 5 },
  dayChipText:     { fontSize: 13, fontWeight: '600' },
  dayBadge:        { borderRadius: 9, paddingHorizontal: 5, paddingVertical: 1 },
  dayBadgeNum:     { fontSize: 10, fontWeight: '700' },

  // Today bar
  todayBar:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 12, borderBottomWidth: 1 },
  todayIcon:       { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  todayLabel:      { fontSize: 14, fontWeight: '700' },
  todaySub:        { fontSize: 12, marginTop: 1 },
  progressPill:    { width: 60, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:    { height: 6, borderRadius: 3 },

  // Content
  content:         { padding: 12, gap: 10 },

  // Period block — like desktop grid section
  periodBlock:     { borderRadius: 12, overflow: 'hidden' },

  // Period header — idêntico ao desktop .period-label
  periodHeader:    {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  periodIconWrap:  { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  periodLabel:     { flex: 1, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  periodCardCount: { fontSize: 12, fontWeight: '700', minWidth: 16, textAlign: 'right' },
  periodAddBtn:    { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  // Card row — like desktop card item
  cardList:        {},
  cardRow:         {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    gap: 10,
  },
  statusWrap:      { width: 18, alignItems: 'center', flexShrink: 0 },
  statusCircle:    { width: 13, height: 13, borderRadius: 7, borderWidth: 1.5 },
  cardTitle:       { flex: 1, fontSize: 13.5, fontWeight: '500', lineHeight: 19 },
  priorityDot:     { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },

  // Empty state
  emptyRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 6 },
  emptyText:       { fontSize: 13 },

  // Sheet
  sheetSectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  chipRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  sheetChip:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, gap: 5 },
  smallDot:        { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5 },
  chipLabel:       { fontSize: 12, fontWeight: '600' },
  sheetActions:    { flexDirection: 'row', gap: 10 },
  actionBtn:       { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
})
