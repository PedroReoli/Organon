import React, { useMemo } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { today, formatDateLong, getDayOfWeek } from '../utils/date'
import { formatCurrency, uid } from '../utils/format'
import { STATUS_COLORS, PRIORITY_COLORS } from '../types'
import type { Habit, HabitEntry, Card, CalendarEvent } from '../types'

// ── Helpers ────────────────────────────────────────────────────────────────────

function isDone(habit: Habit, entry?: HabitEntry) {
  return !!entry && !entry.skipped && (habit.type === 'boolean' ? entry.value >= 1 : entry.value >= habit.target)
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatPill({
  icon, label, value, color, onPress, theme,
}: {
  icon: string; label: string; value: string; color: string; onPress: () => void
  theme: ReturnType<typeof import('../hooks/useTheme').useTheme>
}) {
  return (
    <TouchableOpacity style={[spill.wrap, { backgroundColor: theme.surface }]} onPress={onPress} activeOpacity={0.72}>
      <View style={[spill.icon, { backgroundColor: color + '1c' }]}>
        <Feather name={icon as never} size={15} color={color} />
      </View>
      <Text style={[spill.value, { color: theme.text }]}>{value}</Text>
      <Text style={[spill.label, { color: theme.text + '60' }]}>{label}</Text>
    </TouchableOpacity>
  )
}

function SecHeader({
  title, icon, onAll, theme,
}: {
  title: string; icon: string; onAll?: () => void
  theme: ReturnType<typeof import('../hooks/useTheme').useTheme>
}) {
  return (
    <View style={sh.row}>
      <View style={sh.left}>
        <Feather name={icon as never} size={13} color={theme.primary} />
        <Text style={[sh.title, { color: theme.text }]}>{title}</Text>
      </View>
      {onAll && (
        <TouchableOpacity onPress={onAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>ver tudo</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function Sep({ theme }: { theme: ReturnType<typeof import('../hooks/useTheme').useTheme> }) {
  return <View style={{ height: 1, backgroundColor: theme.text + '0d', marginHorizontal: 14 }} />
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export function TodayScreen() {
  const theme = useTheme()
  const nav = useNavigation()
  const { store, upsertHabitEntry } = useStore()
  const todayStr = today()
  const todayDay = getDayOfWeek(todayStr)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const greetIcon = hour < 12 ? 'sunrise' : hour < 18 ? 'sun' : 'moon'

  // ── Cards ────────────────────────────────────────────────────────────────
  const todayCards = useMemo(() =>
    store.cards
      .filter(c => c.location.day === todayDay)
      .sort((a, b) => a.order - b.order),
  [store.cards, todayDay])

  const doneCount    = todayCards.filter(c => c.status === 'done').length
  const backlogCount = useMemo(() => store.cards.filter(c => !c.location.day).length, [store.cards])

  // ── Events ───────────────────────────────────────────────────────────────
  const todayEvents = useMemo(() =>
    store.calendarEvents
      .filter(e => e.date === todayStr)
      .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
  [store.calendarEvents, todayStr])

  // ── Habits ───────────────────────────────────────────────────────────────
  const todayHabits = useMemo(() => {
    const entries = store.habitEntries.filter(e => e.date === todayStr)
    return store.habits
      .filter(h => h.frequency === 'daily')
      .map(h => ({ habit: h, entry: entries.find(e => e.habitId === h.id) }))
  }, [store.habits, store.habitEntries, todayStr])

  const habitsDone = todayHabits.filter(({ habit, entry }) => isDone(habit, entry)).length

  function toggleHabit(habit: Habit, entry?: HabitEntry) {
    const done = isDone(habit, entry)
    if (done && entry) {
      upsertHabitEntry({ ...entry, value: 0 })
    } else if (!done && entry) {
      upsertHabitEntry({ ...entry, value: habit.target ?? 1, skipped: false, skipReason: '' })
    } else {
      upsertHabitEntry({ id: uid(), habitId: habit.id, date: todayStr, value: habit.target ?? 1, skipped: false, skipReason: '' })
    }
  }

  // ── Financial ────────────────────────────────────────────────────────────
  const ym = todayStr.substring(0, 7)
  const monthlyExp = useMemo(() =>
    store.expenses.filter(e => e.date.startsWith(ym)).reduce((s, e) => s + e.amount, 0),
  [store.expenses, ym])
  const monthlyInc = store.financialConfig.monthlyIncome
  const ratio      = monthlyInc > 0 ? Math.min(monthlyExp / monthlyInc, 1) : 0
  const barColor   = ratio > 0.9 ? '#ef4444' : ratio > 0.7 ? '#f59e0b' : '#22c55e'
  const bills      = store.bills.filter(b => b.active)

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.root, { backgroundColor: theme.background }]}>
      <Header title="Hoje" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90 }}>

        {/* Greeting */}
        <View style={[s.greet, { backgroundColor: theme.surface }]}>
          <View style={s.greetLine}>
            <Feather name={greetIcon as never} size={17} color={theme.primary} />
            <Text style={[s.greetText, { color: theme.text }]}>{greeting}</Text>
          </View>
          <Text style={[s.dateText, { color: theme.text + '70' }]}>{formatDateLong(todayStr)}</Text>
        </View>

        {/* Stat pills */}
        <View style={s.statsRow}>
          <StatPill icon="check-square" label="Tarefas"  value={`${doneCount}/${todayCards.length}`}   color="#22c55e" theme={theme} onPress={() => nav.navigate('Planner'  as never)} />
          <StatPill icon="calendar"    label="Eventos"   value={String(todayEvents.length)}            color={theme.primary} theme={theme} onPress={() => nav.navigate('Calendar' as never)} />
          <StatPill icon="zap"         label="Hábitos"   value={`${habitsDone}/${todayHabits.length}`} color="#f59e0b" theme={theme} onPress={() => nav.navigate('Habits'   as never)} />
          <StatPill icon="inbox"       label="Backlog"   value={String(backlogCount)}                  color={backlogCount > 0 ? '#8b5cf6' : theme.text + '80'} theme={theme} onPress={() => nav.navigate('Planner' as never)} />
        </View>

        {/* ── Cards section ── */}
        <SecHeader title="Tarefas do dia" icon="check-square" theme={theme} onAll={() => nav.navigate('Planner' as never)} />
        <View style={[s.box, { backgroundColor: theme.surface }]}>
          {todayCards.length === 0 ? (
            <View style={s.emptyRow}>
              <Text style={[s.emptyText, { color: theme.text + '45' }]}>Nenhuma tarefa para hoje</Text>
            </View>
          ) : todayCards.map((card: Card, i) => {
            const done = card.status === 'done'
            return (
              <React.Fragment key={card.id}>
                {i > 0 && <Sep theme={theme} />}
                <View style={s.cardRow}>
                  <View style={[s.dot, { backgroundColor: STATUS_COLORS[card.status] }]} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[s.cardTitle, { color: theme.text }, done && s.strikethrough]}
                      numberOfLines={2}
                    >
                      {card.title}
                    </Text>
                    {card.checklist.length > 0 && (
                      <Text style={[s.sub, { color: theme.text + '55' }]}>
                        {card.checklist.filter(c => c.done).length}/{card.checklist.length} checklist
                      </Text>
                    )}
                  </View>
                  <View style={s.cardRight}>
                    {card.time && (
                      <Text style={[s.timeTxt, { color: theme.text + '60' }]}>{card.time}</Text>
                    )}
                    {card.priority && (
                      <View style={[s.badge, { backgroundColor: PRIORITY_COLORS[card.priority] + '1f' }]}>
                        <Text style={[s.badgeText, { color: PRIORITY_COLORS[card.priority] }]}>{card.priority}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </React.Fragment>
            )
          })}
        </View>

        {/* ── Events section ── */}
        <SecHeader title="Eventos de hoje" icon="calendar" theme={theme} onAll={() => nav.navigate('Calendar' as never)} />
        <View style={[s.box, { backgroundColor: theme.surface }]}>
          {todayEvents.length === 0 ? (
            <View style={s.emptyRow}>
              <Text style={[s.emptyText, { color: theme.text + '45' }]}>Nenhum evento hoje</Text>
            </View>
          ) : todayEvents.map((ev: CalendarEvent, i) => (
            <React.Fragment key={ev.id}>
              {i > 0 && <Sep theme={theme} />}
              <View style={s.cardRow}>
                <View style={[s.dot, { backgroundColor: ev.color || theme.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardTitle, { color: theme.text }]} numberOfLines={1}>{ev.title}</Text>
                  {!!ev.description && (
                    <Text style={[s.sub, { color: theme.text + '55' }]} numberOfLines={1}>{ev.description}</Text>
                  )}
                </View>
                {ev.time && (
                  <Text style={[s.timeTxt, { color: theme.text + '60' }]}>{ev.time}</Text>
                )}
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* ── Habits section ── */}
        <SecHeader title="Hábitos" icon="zap" theme={theme} onAll={() => nav.navigate('Habits' as never)} />
        <View style={[s.box, { backgroundColor: theme.surface }]}>
          {todayHabits.length === 0 ? (
            <View style={s.emptyRow}>
              <Text style={[s.emptyText, { color: theme.text + '45' }]}>Nenhum hábito configurado</Text>
            </View>
          ) : (
            <>
              {/* Progress bar */}
              <View style={[s.progWrap, { borderBottomColor: theme.text + '0d' }]}>
                <View style={[s.progBg, { backgroundColor: theme.text + '12' }]}>
                  <View style={[s.progFill, {
                    backgroundColor: '#22c55e',
                    width: `${todayHabits.length > 0 ? (habitsDone / todayHabits.length) * 100 : 0}%` as never,
                  }]} />
                </View>
                <Text style={[s.progLabel, { color: theme.text + '65' }]}>
                  {habitsDone}/{todayHabits.length} concluídos
                </Text>
              </View>

              {todayHabits.map(({ habit, entry }, i) => {
                const done = isDone(habit, entry)
                return (
                  <React.Fragment key={habit.id}>
                    {i > 0 && <Sep theme={theme} />}
                    <TouchableOpacity style={s.cardRow} onPress={() => toggleHabit(habit, entry)} activeOpacity={0.6}>
                      <View style={[s.habitCircle, { backgroundColor: habit.color + '1f' }]}>
                        <Feather
                          name={done ? 'check' : 'circle'}
                          size={12}
                          color={done ? habit.color : habit.color + '70'}
                        />
                      </View>
                      <Text
                        style={[s.cardTitle, { color: theme.text, flex: 1, opacity: done ? 0.5 : 1 }]}
                        numberOfLines={1}
                      >
                        {habit.name}
                      </Text>
                      {habit.type !== 'boolean' && entry && entry.value > 0 ? (
                        <Text style={[s.timeTxt, { color: habit.color }]}>
                          {entry.value}/{habit.target}{habit.unit ? ` ${habit.unit}` : ''}
                        </Text>
                      ) : done ? (
                        <Feather name="check-circle" size={15} color="#22c55e" />
                      ) : null}
                    </TouchableOpacity>
                  </React.Fragment>
                )
              })}
            </>
          )}
        </View>

        {/* ── Financial section ── */}
        <SecHeader title="Financeiro" icon="dollar-sign" theme={theme} onAll={() => nav.navigate('Financial' as never)} />
        <View style={[s.box, { backgroundColor: theme.surface, paddingBottom: 14 }]}>
          <View style={s.finRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.finLabel, { color: theme.text + '65' }]}>Gastos do mês</Text>
              <Text style={[s.finValue, { color: ratio > 0.9 ? '#ef4444' : theme.text }]}>
                {formatCurrency(monthlyExp)}
              </Text>
              {monthlyInc > 0 && (
                <Text style={[s.finSub, { color: theme.text + '55' }]}>de {formatCurrency(monthlyInc)}</Text>
              )}
            </View>
            {bills.length > 0 && (
              <View style={[s.finDivCol, { borderLeftColor: theme.text + '12' }]}>
                <Text style={[s.finLabel, { color: theme.text + '65' }]}>Contas ativas</Text>
                <Text style={[s.finValue, { color: theme.text }]}>{bills.length}</Text>
                <Text style={[s.finSub, { color: theme.text + '55' }]}>mensais</Text>
              </View>
            )}
          </View>
          {monthlyInc > 0 && (
            <View style={{ marginHorizontal: 14, marginTop: 6 }}>
              <View style={[s.progBg, { backgroundColor: theme.text + '12' }]}>
                <View style={[s.progFill, { backgroundColor: barColor, width: `${ratio * 100}%` as never }]} />
              </View>
              <Text style={[s.progLabel, { color: theme.text + '60', marginTop: 4 }]}>
                {Math.round(ratio * 100)}% do orçamento usado
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  greet:     { marginHorizontal: 12, marginTop: 12, borderRadius: 12, padding: 14, marginBottom: 2 },
  greetLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  greetText: { fontSize: 16, fontWeight: '700' },
  dateText:  { fontSize: 13, marginLeft: 25 },

  statsRow:  { flexDirection: 'row', gap: 8, marginHorizontal: 12, marginVertical: 10 },

  box: { marginHorizontal: 12, borderRadius: 12, overflow: 'hidden', marginBottom: 4 },

  cardRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  dot:          { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  cardTitle:    { fontSize: 14, fontWeight: '500', lineHeight: 19 },
  sub:          { fontSize: 12, marginTop: 2 },
  cardRight:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeTxt:      { fontSize: 12, fontWeight: '600' },
  badge:        { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  badgeText:    { fontSize: 10.5, fontWeight: '700' },
  strikethrough: { opacity: 0.4, textDecorationLine: 'line-through' as const },

  emptyRow:  { paddingVertical: 18, alignItems: 'center' },
  emptyText: { fontSize: 13 },

  habitCircle: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },

  progWrap:  { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  progBg:    { height: 5, borderRadius: 3, overflow: 'hidden' },
  progFill:  { height: '100%', borderRadius: 3 },
  progLabel: { fontSize: 11.5, fontWeight: '500', marginTop: 4 },

  finRow:    { flexDirection: 'row', padding: 14, gap: 14 },
  finDivCol: { flex: 1, borderLeftWidth: 1, paddingLeft: 14 },
  finLabel:  { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, marginBottom: 4 },
  finValue:  { fontSize: 20, fontWeight: '700' },
  finSub:    { fontSize: 11.5, marginTop: 2 },
})

const spill = StyleSheet.create({
  wrap:  { flex: 1, alignItems: 'center', borderRadius: 12, padding: 10, gap: 4 },
  icon:  { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 10.5, fontWeight: '500', textAlign: 'center' },
})

const sh = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 12, marginTop: 14, marginBottom: 6 },
  left:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 13, fontWeight: '700' },
})
