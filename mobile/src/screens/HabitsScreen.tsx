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
import { today, getWeekRange, addDays, now } from '../utils/date'
import { uid } from '../utils/format'
import type { Habit, HabitEntry, HabitType } from '../types'

const HABIT_TYPES: { value: HabitType; label: string }[] = [
  { value: 'boolean', label: 'Sim/Não' },
  { value: 'count', label: 'Contagem' },
  { value: 'quantity', label: 'Quantidade' },
  { value: 'time', label: 'Tempo (min)' },
]

const HABIT_TYPE_LABELS: Record<HabitType, string> = {
  boolean: 'Sim/Nao',
  count: 'Contagem',
  quantity: 'Quantidade',
  time: 'Tempo (min)',
}
const HABIT_FREQUENCY_LABELS: Record<'daily' | 'weekly', string> = {
  daily: 'Diaria',
  weekly: 'Semanal',
}

const COLORS = ['#6366f1','#22c55e','#ef4444','#f97316','#3b82f6','#8b5cf6','#ec4899','#eab308']

function formatDateShort(iso: string): string {
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  return `${parts[2]}/${parts[1]}`
}

export function HabitsScreen() {
  const theme = useTheme()
  const { store, addHabit, updateHabit, deleteHabit, upsertHabitEntry } = useStore()
  const todayStr = today()
  const week = useMemo(() => {
    const { start } = getWeekRange(todayStr)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [todayStr])

  const [showSheet, setShowSheet] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [form, setForm] = useState({ name: '', type: 'boolean' as HabitType, target: '1', color: COLORS[0] })
  const [activeTab, setActiveTab] = useState<'habits' | 'reports'>('habits')
  const [detailHabitId, setDetailHabitId] = useState<string | null>(null)

  const weekDayLabels = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']

  const getEntry = (habitId: string, date: string): HabitEntry | undefined =>
    store.habitEntries.find(e => e.habitId === habitId && e.date === date)

  const toggleEntry = (habit: Habit, date: string) => {
    const existing = getEntry(habit.id, date)
    if (habit.type === 'boolean') {
      const done = existing && existing.value >= 1 && !existing.skipped
      upsertHabitEntry({
        id: existing?.id ?? uid(),
        habitId: habit.id, date,
        value: done ? 0 : 1,
        skipped: false, skipReason: '',
      })
    } else {
      // For non-boolean: increment or reset
      const currentVal = existing?.value ?? 0
      const newVal = currentVal >= habit.target ? 0 : currentVal + 1
      upsertHabitEntry({
        id: existing?.id ?? uid(),
        habitId: habit.id, date,
        value: newVal, skipped: false, skipReason: '',
      })
    }
  }

  const openNew = () => {
    setEditingHabit(null)
    setForm({ name: '', type: 'boolean', target: '1', color: COLORS[0] })
    setShowSheet(true)
  }

  const openEdit = (habit: Habit) => {
    setEditingHabit(habit)
    setForm({ name: habit.name, type: habit.type, target: String(habit.target), color: habit.color })
    setShowSheet(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    const data = { name: form.name, type: form.type, target: Number(form.target) || 1, color: form.color }
    if (editingHabit) {
      updateHabit(editingHabit.id, data)
    } else {
      addHabit({ ...data, frequency: 'daily', weeklyTarget: 7, weekDays: [], trigger: '', reason: '', minimumTarget: 0, order: store.habits.length, createdAt: now() })
    }
    setShowSheet(false)
  }

  const sortedHabits = useMemo(() => [...store.habits].sort((a, b) => a.order - b.order), [store.habits])
  const last30Days = useMemo(() => Array.from({ length: 30 }, (_, i) => addDays(todayStr, -(29 - i))), [todayStr])

  const isScheduled = (habit: Habit, date: string) => {
    if (habit.frequency === 'daily') return true
    if (habit.weekDays.length === 0) return true
    const day = new Date(date + 'T00:00:00').getDay()
    return habit.weekDays.includes(day)
  }

  const isDone = (habit: Habit, date: string) => {
    const entry = getEntry(habit.id, date)
    if (!entry || entry.skipped) return false
    return habit.type === 'boolean' ? entry.value >= 1 : entry.value >= habit.target
  }

  const isSkipped = (habit: Habit, date: string) => {
    return !!getEntry(habit.id, date)?.skipped
  }

  const getStreak = (habit: Habit) => {
    let streak = 0
    let checkDate = todayStr
    if (!isDone(habit, todayStr) && !isSkipped(habit, todayStr)) {
      checkDate = addDays(todayStr, -1)
    }
    for (let i = 0; i < 365; i++) {
      if (!isScheduled(habit, checkDate)) {
        checkDate = addDays(checkDate, -1)
        continue
      }
      if (isDone(habit, checkDate) || isSkipped(habit, checkDate)) {
        streak += 1
        checkDate = addDays(checkDate, -1)
      } else {
        break
      }
    }
    return streak
  }

  const getHabitRate = (habit: Habit, days: number) => {
    let scheduled = 0
    let done = 0
    for (let i = 0; i < days; i++) {
      const date = addDays(todayStr, -i)
      if (!isScheduled(habit, date)) continue
      scheduled += 1
      if (isDone(habit, date) || isSkipped(habit, date)) done += 1
    }
    return scheduled === 0 ? 0 : Math.round((done / scheduled) * 100)
  }

  const todayStats = useMemo(() => {
    let total = 0
    let doneCount = 0
    for (const habit of sortedHabits) {
      if (!isScheduled(habit, todayStr)) continue
      total += 1
      if (isDone(habit, todayStr) || isSkipped(habit, todayStr)) doneCount += 1
    }
    return { done: doneCount, total }
  }, [sortedHabits, todayStr])

  const weekRate = useMemo(() => {
    let scheduled = 0
    let doneCount = 0
    for (const habit of sortedHabits) {
      for (const date of week) {
        if (date > todayStr) continue
        if (!isScheduled(habit, date)) continue
        scheduled += 1
        if (isDone(habit, date) || isSkipped(habit, date)) doneCount += 1
      }
    }
    return scheduled === 0 ? 0 : Math.round((doneCount / scheduled) * 100)
  }, [sortedHabits, todayStr, week])

  const monthRate = useMemo(() => {
    let scheduled = 0
    let doneCount = 0
    for (const habit of sortedHabits) {
      for (const date of last30Days) {
        if (!isScheduled(habit, date)) continue
        scheduled += 1
        if (isDone(habit, date) || isSkipped(habit, date)) doneCount += 1
      }
    }
    return scheduled === 0 ? 0 : Math.round((doneCount / scheduled) * 100)
  }, [last30Days, sortedHabits])

  const bestStreak = useMemo(() => {
    let best = 0
    for (const habit of sortedHabits) best = Math.max(best, getStreak(habit))
    return best
  }, [sortedHabits])

  const detailHabit = useMemo(
    () => (detailHabitId ? sortedHabits.find(h => h.id === detailHabitId) ?? null : null),
    [detailHabitId, sortedHabits],
  )

  const detailEntries = useMemo(() => {
    if (!detailHabit) return []
    return store.habitEntries
      .filter(e => e.habitId === detailHabit.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20)
  }, [detailHabit, store.habitEntries])

  const getDayRate = (date: string) => {
    let scheduled = 0
    let doneCount = 0
    for (const habit of sortedHabits) {
      if (!isScheduled(habit, date)) continue
      scheduled += 1
      if (isDone(habit, date) || isSkipped(habit, date)) doneCount += 1
    }
    return scheduled === 0 ? 0 : doneCount / scheduled
  }

  const consistencyRows = useMemo(() => [last30Days.slice(0, 15), last30Days.slice(15)], [last30Days])

  const reportHabits = useMemo(() => {
    return sortedHabits
      .map(habit => ({
        habit,
        rate30: getHabitRate(habit, 30),
        streak: getStreak(habit),
      }))
      .sort((a, b) => (b.rate30 - a.rate30) || (b.streak - a.streak))
  }, [sortedHabits, store.habitEntries, todayStr])

  const rateColor = (rate: number) => (rate >= 80 ? '#22c55e' : rate >= 50 ? '#eab308' : '#ef4444')

  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    tabsBar: { flexDirection: 'row', marginHorizontal: 12, marginTop: 8, marginBottom: 8, padding: 4, borderRadius: 11, borderWidth: 1, gap: 6 },
    tabBtn: { flex: 1, height: 34, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    tabTxt: { fontSize: 12.5, fontWeight: '600' },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    statCard: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
    statVal: { fontSize: 14.5, fontWeight: '700' },
    statLbl: { fontSize: 11, marginTop: 2 },
    reportStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    reportStatCard: { flexBasis: '48%', flexGrow: 1, borderRadius: 11, borderWidth: 1, paddingVertical: 11, alignItems: 'center' },
    reportStatVal: { fontSize: 16, fontWeight: '800' },
    reportStatLbl: { fontSize: 11, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
    weekHeader: { flexDirection: 'row', backgroundColor: theme.surface, paddingHorizontal: 12, paddingVertical: 8 },
    weekDay: { flex: 1, textAlign: 'center', fontSize: 11, color: theme.text + '60', fontWeight: '600' },
    weekToday: { color: theme.primary },
    list: { flex: 1, padding: 12 },
    habitRow: { backgroundColor: theme.surface, borderRadius: 10, marginBottom: 8, overflow: 'hidden', borderWidth: 1 },
    habitHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
    colorDot: { width: 12, height: 12, borderRadius: 6 },
    habitName: { flex: 1, color: theme.text, fontSize: 15, fontWeight: '500' },
    editBtn: { padding: 4 },
    daysRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 10, gap: 4 },
    dayBtn: { flex: 1, aspectRatio: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background },
    dayBtnDone: { backgroundColor: theme.primary + '30' },
    dayBtnToday: { borderWidth: 1.5, borderColor: theme.primary },
    dayVal: { fontSize: 11, color: theme.text + '60', textAlign: 'center' },
    dayValDone: { color: theme.primary, fontWeight: '700' },
    formRow: { marginBottom: 12 },
    rowLabel: { color: theme.text + '80', fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
    chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
    chipTxt: { fontSize: 13 },
    reportPanel: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
    reportTitle: { fontSize: 13.5, fontWeight: '700', marginBottom: 10 },
    consistencyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    consistencyLegend: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    consistencyLegendLabel: { fontSize: 10.5, fontWeight: '600' },
    consistencyDot: { width: 8, height: 8, borderRadius: 4 },
    consistencyGrid: { gap: 4 },
    consistencyRow: { flexDirection: 'row', gap: 4 },
    heatmap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
    heatCell: { width: 13, height: 13, borderRadius: 3 },
    consistencyDayTag: { marginTop: 8, fontSize: 11.5, fontWeight: '600' },
    rankingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1 },
    rankingName: { flex: 1, fontSize: 13, fontWeight: '600' },
    rankingMeta: { fontSize: 11.5, fontWeight: '600' },
    detailStats: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    detailStat: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
    detailValue: { fontSize: 15, fontWeight: '700' },
    detailLabel: { fontSize: 11, marginTop: 2 },
    infoRow: { fontSize: 12.5, lineHeight: 18, marginTop: 4 },
    entryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 7, marginTop: 7 },
    entryDate: { fontSize: 11.5, fontWeight: '600' },
    entryValue: { fontSize: 12, fontWeight: '600' },
  })

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Hábitos" />

      <View style={[s.tabsBar, { backgroundColor: theme.surface, borderColor: theme.text + '18' }]}>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'habits' ? { borderColor: theme.primary, backgroundColor: theme.primary + '22' } : { borderColor: theme.text + '18' }]}
          onPress={() => setActiveTab('habits')}
        >
          <Text style={[s.tabTxt, { color: activeTab === 'habits' ? theme.primary : theme.text + '70' }]}>Habitos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, activeTab === 'reports' ? { borderColor: theme.primary, backgroundColor: theme.primary + '22' } : { borderColor: theme.text + '18' }]}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[s.tabTxt, { color: activeTab === 'reports' ? theme.primary : theme.text + '70' }]}>Relatorios</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'habits' ? (
      <>
      {/* Week header */}
      <View style={s.weekHeader}>
        <View style={{ width: 0 }} />
        {weekDayLabels.map((d, i) => (
          <Text key={i} style={[s.weekDay, week[i] === todayStr && s.weekToday]}>{d}</Text>
        ))}
      </View>

      <ScrollView style={s.list}>
        <View style={s.statsRow}>
          <View style={[s.statCard, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
            <Text style={[s.statVal, { color: theme.primary }]}>{todayStats.done}/{todayStats.total}</Text>
            <Text style={[s.statLbl, { color: theme.text + '62' }]}>Hoje</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
            <Text style={[s.statVal, { color: rateColor(weekRate) }]}>{weekRate}%</Text>
            <Text style={[s.statLbl, { color: theme.text + '62' }]}>Semana</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
            <Text style={[s.statVal, { color: rateColor(monthRate) }]}>{monthRate}%</Text>
            <Text style={[s.statLbl, { color: theme.text + '62' }]}>30 dias</Text>
          </View>
        </View>

        {sortedHabits.length === 0 && (
          <EmptyState icon="check-circle" title="Nenhum hábito" subtitle="Toque no + para criar" />
        )}
        {sortedHabits.map(habit => (
          <TouchableOpacity key={habit.id} style={[s.habitRow, { borderColor: theme.text + '12' }]} onPress={() => setDetailHabitId(habit.id)} activeOpacity={0.85}>
            <View style={s.habitHeader}>
              <View style={[s.colorDot, { backgroundColor: habit.color }]} />
              <Text style={s.habitName} numberOfLines={1}>{habit.name}</Text>
              <Text style={{ color: theme.text + '45', fontSize: 11 }}>{getStreak(habit)}d</Text>
              <TouchableOpacity style={s.editBtn} onPress={() => openEdit(habit)}>
                <Feather name="settings" size={15} color={theme.text + '50'} />
              </TouchableOpacity>
            </View>

            <View style={s.daysRow}>
              {week.map((date) => {
                const entry = getEntry(habit.id, date)
                const done = entry && !entry.skipped && (habit.type === 'boolean' ? entry.value >= 1 : entry.value >= habit.target)
                const isToday = date === todayStr
                const val = entry?.value ?? 0
                return (
                  <TouchableOpacity
                    key={date}
                    style={[s.dayBtn, done && s.dayBtnDone, isToday && s.dayBtnToday]}
                    onPress={() => toggleEntry(habit, date)}
                  >
                    {habit.type === 'boolean'
                      ? <Feather name={done ? 'check' : 'minus'} size={14} color={done ? habit.color : theme.text + '30'} />
                      : <Text style={[s.dayVal, done && s.dayValDone]}>{val > 0 ? val : '-'}</Text>
                    }
                  </TouchableOpacity>
                )
              })}
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 36 }} />
      </ScrollView>
      </>
      ) : (
      <ScrollView style={s.list}>
        <View style={s.reportStatsGrid}>
          <View style={[s.reportStatCard, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
            <Text style={[s.reportStatVal, { color: theme.primary }]}>{todayStats.done}/{todayStats.total}</Text>
            <Text style={[s.reportStatLbl, { color: theme.text + '62' }]}>Hoje</Text>
          </View>
          <View style={[s.reportStatCard, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
            <Text style={[s.reportStatVal, { color: rateColor(weekRate) }]}>{weekRate}%</Text>
            <Text style={[s.reportStatLbl, { color: theme.text + '62' }]}>Semana</Text>
          </View>
          <View style={[s.reportStatCard, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
            <Text style={[s.reportStatVal, { color: rateColor(monthRate) }]}>{monthRate}%</Text>
            <Text style={[s.reportStatLbl, { color: theme.text + '62' }]}>30 dias</Text>
          </View>
          <View style={[s.reportStatCard, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
            <Text style={[s.reportStatVal, { color: theme.text }]}>{bestStreak}</Text>
            <Text style={[s.reportStatLbl, { color: theme.text + '62' }]}>Melhor sequencia</Text>
          </View>
        </View>

        <View style={[s.reportPanel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
          <View style={s.consistencyHeader}>
            <Text style={[s.reportTitle, { color: theme.text, marginBottom: 0 }]}>Consistencia (30 dias)</Text>
            <View style={s.consistencyLegend}>
              <View style={[s.consistencyDot, { backgroundColor: theme.primary, opacity: 0.2 }]} />
              <Text style={[s.consistencyLegendLabel, { color: theme.text + '66' }]}>Baixa</Text>
              <View style={[s.consistencyDot, { backgroundColor: theme.primary, opacity: 0.95 }]} />
              <Text style={[s.consistencyLegendLabel, { color: theme.text + '66' }]}>Alta</Text>
            </View>
          </View>

          <View style={s.consistencyGrid}>
            {consistencyRows.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={s.consistencyRow}>
                {row.map(date => {
                  const rate = getDayRate(date)
                  return (
                    <View
                      key={date}
                      style={[
                        s.heatCell,
                        {
                          backgroundColor: theme.primary,
                          opacity: rate === 0 ? 0.15 : 0.3 + rate * 0.7,
                        },
                      ]}
                    />
                  )
                })}
              </View>
            ))}
          </View>
          <Text style={[s.consistencyDayTag, { color: theme.text + '5f' }]}>
            {formatDateShort(last30Days[0])} - {formatDateShort(last30Days[last30Days.length - 1])}
          </Text>
        </View>

        <View style={[s.reportPanel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
          <Text style={[s.reportTitle, { color: theme.text }]}>Habitos em destaque</Text>
          {reportHabits.length === 0 && (
            <Text style={{ color: theme.text + '66', fontSize: 12.5 }}>Nenhum habito ativo.</Text>
          )}
          {reportHabits.map(({ habit, rate30, streak }, index) => (
            <View key={habit.id} style={[s.rankingRow, { borderTopColor: index === 0 ? 'transparent' : theme.text + '12' }]}>
              <View style={[s.colorDot, { backgroundColor: habit.color }]} />
              <Text style={[s.rankingName, { color: theme.text }]} numberOfLines={1}>{habit.name}</Text>
              <Text style={[s.rankingMeta, { color: rateColor(rate30) }]}>{rate30}%</Text>
              <Text style={[s.rankingMeta, { color: theme.text + '66' }]}>{streak}d</Text>
            </View>
          ))}
        </View>

        <View style={[s.reportPanel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
          <Text style={[s.reportTitle, { color: theme.text }]}>Resumo</Text>
          <Text style={{ color: theme.text + '70', fontSize: 12.5 }}>Habitos ativos: {sortedHabits.length}</Text>
          <Text style={{ color: theme.text + '70', fontSize: 12.5, marginTop: 4 }}>Sequencia maxima atual: {bestStreak} dias</Text>
        </View>
        <View style={{ height: 36 }} />
      </ScrollView>
      )}

      <FAB onPress={openNew} />

      <BottomSheet
        visible={!!detailHabit}
        onClose={() => setDetailHabitId(null)}
        title={detailHabit ? `Detalhes: ${detailHabit.name}` : 'Detalhes'}
        maxHeight="94%"
      >
        {detailHabit && (
          <>
            <View style={s.detailStats}>
              <View style={[s.detailStat, { backgroundColor: theme.text + '06', borderColor: theme.text + '14' }]}>
                <Text style={[s.detailValue, { color: rateColor(getHabitRate(detailHabit, 7)) }]}>{getHabitRate(detailHabit, 7)}%</Text>
                <Text style={[s.detailLabel, { color: theme.text + '62' }]}>7 dias</Text>
              </View>
              <View style={[s.detailStat, { backgroundColor: theme.text + '06', borderColor: theme.text + '14' }]}>
                <Text style={[s.detailValue, { color: rateColor(getHabitRate(detailHabit, 30)) }]}>{getHabitRate(detailHabit, 30)}%</Text>
                <Text style={[s.detailLabel, { color: theme.text + '62' }]}>30 dias</Text>
              </View>
              <View style={[s.detailStat, { backgroundColor: theme.text + '06', borderColor: theme.text + '14' }]}>
                <Text style={[s.detailValue, { color: detailHabit.color }]}>{getStreak(detailHabit)}</Text>
                <Text style={[s.detailLabel, { color: theme.text + '62' }]}>Sequencia</Text>
              </View>
            </View>

            <View style={[s.reportPanel, { backgroundColor: theme.background, borderColor: theme.text + '14' }]}>
              <Text style={[s.reportTitle, { color: theme.text }]}>Heatmap individual (30 dias)</Text>
              <View style={s.heatmap}>
                {last30Days.map(date => {
                  const done = isDone(detailHabit, date)
                  const skipped = isSkipped(detailHabit, date)
                  const scheduled = isScheduled(detailHabit, date)
                  return (
                    <View
                      key={`detail-${date}`}
                      style={[
                        s.heatCell,
                        done
                          ? { backgroundColor: detailHabit.color, opacity: 1 }
                          : skipped
                            ? { backgroundColor: theme.text + '65', opacity: 0.55 }
                            : !scheduled
                              ? { backgroundColor: theme.text + '18', opacity: 0.12 }
                              : date < todayStr
                                ? { backgroundColor: theme.text + '28', opacity: 0.35 }
                                : { backgroundColor: 'transparent', opacity: 1, borderColor: detailHabit.color, borderWidth: 1.4 },
                      ]}
                    />
                  )
                })}
              </View>
            </View>

            <View style={[s.reportPanel, { backgroundColor: theme.background, borderColor: theme.text + '14' }]}>
              <Text style={[s.reportTitle, { color: theme.text }]}>Configuracao</Text>
              <Text style={[s.infoRow, { color: theme.text + '72' }]}>Tipo: {HABIT_TYPE_LABELS[detailHabit.type]}</Text>
              <Text style={[s.infoRow, { color: theme.text + '72' }]}>Frequencia: {HABIT_FREQUENCY_LABELS[detailHabit.frequency]}</Text>
              <Text style={[s.infoRow, { color: theme.text + '72' }]}>Meta: {detailHabit.target}</Text>
              {detailHabit.trigger ? <Text style={[s.infoRow, { color: theme.text + '72' }]}>Gatilho: {detailHabit.trigger}</Text> : null}
              {detailHabit.reason ? <Text style={[s.infoRow, { color: theme.text + '72' }]}>Motivo: {detailHabit.reason}</Text> : null}
            </View>

            <View style={[s.reportPanel, { backgroundColor: theme.background, borderColor: theme.text + '14' }]}>
              <Text style={[s.reportTitle, { color: theme.text }]}>Entradas recentes</Text>
              {detailEntries.length === 0 && (
                <Text style={{ color: theme.text + '62', fontSize: 12 }}>Nenhuma entrada ainda.</Text>
              )}
              {detailEntries.map(entry => (
                <View key={entry.id} style={[s.entryRow, { borderTopColor: theme.text + '12' }]}>
                  <Text style={[s.entryDate, { color: theme.text + '62' }]}>{formatDateShort(entry.date)}</Text>
                  <Text style={[s.entryValue, { color: entry.skipped ? theme.text + '55' : theme.text }]}>
                    {entry.skipped ? 'Pulado' : `${entry.value}`}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </BottomSheet>

      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)} title={editingHabit ? 'Editar hábito' : 'Novo hábito'} onSave={handleSave}>
        <FormInput label="Nome" value={form.name} onChangeText={n => setForm(f => ({ ...f, name: n }))} placeholder="Ex: Exercício" autoFocus />

        <View style={s.formRow}>
          <Text style={s.rowLabel}>Tipo</Text>
          <View style={s.chips}>
            {HABIT_TYPES.map(({ value, label }) => {
              const active = form.type === value
              return (
                <TouchableOpacity key={value}
                  style={[s.chip, { borderColor: active ? theme.primary : theme.text + '30', backgroundColor: active ? theme.primary + '20' : 'transparent' }]}
                  onPress={() => setForm(f => ({ ...f, type: value }))}>
                  <Text style={[s.chipTxt, { color: active ? theme.primary : theme.text + '60', fontWeight: active ? '600' : '400' }]}>{label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {form.type !== 'boolean' && (
          <FormInput label="Meta" value={form.target} onChangeText={t => setForm(f => ({ ...f, target: t }))} placeholder="Ex: 8" keyboardType="numeric" />
        )}

        <View style={s.formRow}>
          <Text style={s.rowLabel}>Cor</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {COLORS.map(c => (
              <TouchableOpacity key={c} onPress={() => setForm(f => ({ ...f, color: c }))}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, borderWidth: form.color === c ? 3 : 0, borderColor: '#fff' }} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {editingHabit && (
          <TouchableOpacity style={{ marginTop: 4, padding: 14, backgroundColor: '#ef444420', borderRadius: 10, alignItems: 'center' }}
            onPress={() => { setShowSheet(false); Alert.alert('Excluir', `Excluir "${editingHabit.name}"?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteHabit(editingHabit.id) }]) }}>
            <Text style={{ color: '#ef4444', fontWeight: '600' }}>Excluir hábito</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 20 }} />
      </BottomSheet>
    </SafeAreaView>
  )
}
