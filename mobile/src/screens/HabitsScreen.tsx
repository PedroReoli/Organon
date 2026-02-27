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

const COLORS = ['#6366f1','#22c55e','#ef4444','#f97316','#3b82f6','#8b5cf6','#ec4899','#eab308']

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

  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    weekHeader: { flexDirection: 'row', backgroundColor: theme.surface, paddingHorizontal: 12, paddingVertical: 8 },
    weekDay: { flex: 1, textAlign: 'center', fontSize: 11, color: theme.text + '60', fontWeight: '600' },
    weekToday: { color: theme.primary },
    list: { flex: 1, padding: 12 },
    habitRow: { backgroundColor: theme.surface, borderRadius: 10, marginBottom: 8, overflow: 'hidden' },
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
  })

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Hábitos" />

      {/* Week header */}
      <View style={s.weekHeader}>
        <View style={{ width: 0 }} />
        {weekDayLabels.map((d, i) => (
          <Text key={i} style={[s.weekDay, week[i] === todayStr && s.weekToday]}>{d}</Text>
        ))}
      </View>

      <ScrollView style={s.list}>
        {store.habits.length === 0 && (
          <EmptyState icon="check-circle" title="Nenhum hábito" subtitle="Toque no + para criar" />
        )}
        {store.habits.map(habit => (
          <View key={habit.id} style={s.habitRow}>
            <View style={s.habitHeader}>
              <View style={[s.colorDot, { backgroundColor: habit.color }]} />
              <Text style={s.habitName} numberOfLines={1}>{habit.name}</Text>
              <Text style={{ color: theme.text + '40', fontSize: 11 }}>{habit.type === 'boolean' ? '' : `meta: ${habit.target}`}</Text>
              <TouchableOpacity style={s.editBtn} onPress={() => openEdit(habit)}>
                <Feather name="settings" size={15} color={theme.text + '50'} />
              </TouchableOpacity>
            </View>

            <View style={s.daysRow}>
              {week.map((date, i) => {
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
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB onPress={openNew} />

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
