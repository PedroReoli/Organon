import React, { useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { today, formatDateLong, getDayOfWeek } from '../utils/date'
import { formatCurrency } from '../utils/format'
import { STATUS_COLORS, PRIORITY_COLORS } from '../types'
import type { Card, CalendarEvent, Habit } from '../types'

export function TodayScreen() {
  const theme = useTheme()
  const navigation = useNavigation()
  const { store } = useStore()
  const todayStr = today()
  const todayDay = getDayOfWeek(todayStr)

  const todayCards = useMemo(() =>
    store.cards
      .filter(c => c.location.day === todayDay && c.status !== 'done')
      .sort((a, b) => a.order - b.order)
      .slice(0, 5),
  [store.cards, todayDay])

  const todayEvents = useMemo(() =>
    store.calendarEvents
      .filter(e => e.date === todayStr)
      .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
      .slice(0, 4),
  [store.calendarEvents, todayStr])

  const todayHabits = useMemo(() => {
    const entries = store.habitEntries.filter(e => e.date === todayStr)
    return store.habits
      .filter(h => h.frequency === 'daily')
      .slice(0, 6)
      .map(h => ({
        habit: h,
        entry: entries.find(e => e.habitId === h.id),
      }))
  }, [store.habits, store.habitEntries, todayStr])

  const monthlyExpenses = useMemo(() => {
    const ym = todayStr.substring(0, 7)
    return store.expenses
      .filter(e => e.date.startsWith(ym))
      .reduce((sum, e) => sum + e.amount, 0)
  }, [store.expenses, todayStr])

  const monthlyIncome = store.financialConfig.monthlyIncome

  const s = StyleSheet.create({
    screen:    { flex: 1, backgroundColor: theme.background },
    scroll:    { flex: 1 },
    dateBar:   { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.surface },
    dateText:  { color: theme.text, fontSize: 15, fontWeight: '500', opacity: 0.8 },
    section:   { marginTop: 12, marginHorizontal: 12, backgroundColor: theme.surface, borderRadius: 12, overflow: 'hidden' },
    secHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
    secTitle:  { color: theme.text, fontSize: 14, fontWeight: '600' },
    seeAll:    { color: theme.primary, fontSize: 12 },
    divider:   { height: 1, backgroundColor: theme.text + '10', marginHorizontal: 14 },
    cardRow:   { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
    dot:       { width: 8, height: 8, borderRadius: 4 },
    cardTitle: { flex: 1, color: theme.text, fontSize: 14 },
    badge:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    badgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
    emptyRow:  { padding: 16, opacity: 0.5 },
    emptyText: { color: theme.text, fontSize: 13 },
    habitRow:  { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
    habitName: { flex: 1, color: theme.text, fontSize: 14 },
    finRow:    { padding: 14 },
    finLabel:  { color: theme.text + '80', fontSize: 12, marginBottom: 4 },
    finValue:  { color: theme.text, fontSize: 20, fontWeight: '700' },
    finSub:    { color: theme.text + '60', fontSize: 12, marginTop: 2 },
  })

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Hoje" />
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Date */}
        <View style={s.dateBar}>
          <Text style={s.dateText}>{formatDateLong(todayStr)}</Text>
        </View>

        {/* Cards */}
        <View style={s.section}>
          <View style={s.secHeader}>
            <Text style={s.secTitle}>Prioridades do dia</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Planner' as never)}>
              <Text style={s.seeAll}>ver todos</Text>
            </TouchableOpacity>
          </View>
          <View style={s.divider} />
          {todayCards.length === 0
            ? <View style={s.emptyRow}><Text style={s.emptyText}>Nenhum card para hoje</Text></View>
            : todayCards.map((card: Card) => (
              <View key={card.id} style={s.cardRow}>
                <View style={[s.dot, { backgroundColor: STATUS_COLORS[card.status] }]} />
                <Text style={s.cardTitle} numberOfLines={1}>{card.title}</Text>
                {card.priority && (
                  <View style={[s.badge, { backgroundColor: PRIORITY_COLORS[card.priority] }]}>
                    <Text style={s.badgeText}>{card.priority}</Text>
                  </View>
                )}
              </View>
            ))
          }
        </View>

        {/* Events */}
        <View style={s.section}>
          <View style={s.secHeader}>
            <Text style={s.secTitle}>Próximos eventos</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Calendar' as never)}>
              <Text style={s.seeAll}>ver todos</Text>
            </TouchableOpacity>
          </View>
          <View style={s.divider} />
          {todayEvents.length === 0
            ? <View style={s.emptyRow}><Text style={s.emptyText}>Nenhum evento hoje</Text></View>
            : todayEvents.map((event: CalendarEvent) => (
              <View key={event.id} style={s.cardRow}>
                <View style={[s.dot, { backgroundColor: event.color || theme.primary }]} />
                <Text style={s.cardTitle} numberOfLines={1}>
                  {event.time ? `${event.time} · ` : ''}{event.title}
                </Text>
              </View>
            ))
          }
        </View>

        {/* Habits */}
        <View style={s.section}>
          <View style={s.secHeader}>
            <Text style={s.secTitle}>Hábitos hoje</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Habits' as never)}>
              <Text style={s.seeAll}>ver todos</Text>
            </TouchableOpacity>
          </View>
          <View style={s.divider} />
          {todayHabits.length === 0
            ? <View style={s.emptyRow}><Text style={s.emptyText}>Nenhum hábito configurado</Text></View>
            : <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 }}>
                {todayHabits.map(({ habit, entry }: { habit: Habit; entry: typeof todayHabits[0]['entry'] }) => {
                  const done = entry && !entry.skipped && (habit.type === 'boolean' ? entry.value >= 1 : entry.value >= habit.target)
                  return (
                    <View key={habit.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Feather
                        name={done ? 'check-circle' : 'circle'}
                        size={18}
                        color={done ? habit.color : theme.text + '40'}
                      />
                      <Text style={{ color: theme.text, fontSize: 13, opacity: done ? 1 : 0.6 }}>
                        {habit.name}
                      </Text>
                    </View>
                  )
                })}
              </View>
          }
        </View>

        {/* Financial */}
        <View style={s.section}>
          <View style={s.secHeader}>
            <Text style={s.secTitle}>Resumo financeiro</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Financial' as never)}>
              <Text style={s.seeAll}>ver mais</Text>
            </TouchableOpacity>
          </View>
          <View style={s.divider} />
          <View style={s.finRow}>
            <Text style={s.finLabel}>Gastos este mês</Text>
            <Text style={[s.finValue, { color: monthlyExpenses > monthlyIncome * 0.8 ? '#ef4444' : theme.text }]}>
              {formatCurrency(monthlyExpenses)}
            </Text>
            {monthlyIncome > 0 && (
              <Text style={s.finSub}>de {formatCurrency(monthlyIncome)} de renda</Text>
            )}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}
