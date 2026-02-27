import React, { useState, useMemo } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, FlatList,
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
import { today, now, formatDate } from '../utils/date'
import type { CalendarEvent } from '../types'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function CalendarScreen() {
  const theme = useTheme()
  const { store, addEvent, updateEvent, deleteEvent } = useStore()
  const todayStr = today()

  const [currentDate, setCurrentDate] = useState(() => {
    const [y, m] = todayStr.split('-').map(Number)
    return { year: y, month: m }
  })
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [showSheet, setShowSheet] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [form, setForm] = useState({ title: '', date: todayStr, time: '', description: '', color: '#6366f1' })

  const { year, month } = currentDate
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()

  const calendarDays = useMemo(() => {
    const days: (string | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    return days
  }, [year, month, daysInMonth, firstDay])

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    store.calendarEvents.forEach(e => {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    })
    return map
  }, [store.calendarEvents])

  const selectedEvents = useMemo(() =>
    (eventsByDate[selectedDate] || []).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
  [eventsByDate, selectedDate])

  const prevMonth = () => setCurrentDate(({ year: y, month: m }) => m === 1 ? { year: y - 1, month: 12 } : { year: y, month: m - 1 })
  const nextMonth = () => setCurrentDate(({ year: y, month: m }) => m === 12 ? { year: y + 1, month: 1 } : { year: y, month: m + 1 })

  const openNew = () => {
    setEditingEvent(null)
    setForm({ title: '', date: selectedDate, time: '', description: '', color: '#6366f1' })
    setShowSheet(true)
  }

  const openEdit = (event: CalendarEvent) => {
    setEditingEvent(event)
    setForm({ title: event.title, date: event.date, time: event.time ?? '', description: event.description, color: event.color })
    setShowSheet(true)
  }

  const handleSave = () => {
    if (!form.title.trim()) return
    const data = { title: form.title, date: form.date, time: form.time || null, description: form.description, color: form.color }
    if (editingEvent) {
      updateEvent(editingEvent.id, { ...data, updatedAt: now() })
    } else {
      addEvent({ ...data, createdAt: now(), updatedAt: now() })
    }
    setShowSheet(false)
  }

  const handleDelete = (event: CalendarEvent) => {
    Alert.alert('Excluir evento', `Excluir "${event.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteEvent(event.id) },
    ])
  }

  const COLORS = ['#6366f1','#3b82f6','#22c55e','#ef4444','#f97316','#eab308','#8b5cf6','#ec4899']

  const s = StyleSheet.create({
    screen:    { flex: 1, backgroundColor: theme.background },
    monthNav:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: theme.surface },
    monthTxt:  { color: theme.text, fontSize: 17, fontWeight: '600' },
    weekRow:   { flexDirection: 'row', backgroundColor: theme.surface, paddingBottom: 6 },
    weekDay:   { flex: 1, textAlign: 'center', color: theme.text + '60', fontSize: 11, fontWeight: '600' },
    grid:      { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: theme.surface },
    dayCell:   { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
    dayTxt:    { fontSize: 14, color: theme.text },
    todayCell: { backgroundColor: theme.primary + '20', borderRadius: 20 },
    todayTxt:  { color: theme.primary, fontWeight: '700' },
    selCell:   { backgroundColor: theme.primary, borderRadius: 20 },
    selTxt:    { color: '#fff', fontWeight: '700' },
    dot:       { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.primary, position: 'absolute', bottom: 6 },
    evList:    { flex: 1, padding: 12 },
    evCard:    { backgroundColor: theme.surface, borderRadius: 10, padding: 14, marginBottom: 10, flexDirection: 'row', gap: 12 },
    evDot:     { width: 4, borderRadius: 2, alignSelf: 'stretch', minHeight: 20 },
    evTitle:   { color: theme.text, fontSize: 15, fontWeight: '500', flex: 1 },
    evTime:    { color: theme.text + '60', fontSize: 12, marginTop: 2 },
    evEdit:    { padding: 4 },
  })

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Calendário" />

      {/* Month nav */}
      <View style={s.monthNav}>
        <TouchableOpacity onPress={prevMonth}><Feather name="chevron-left" size={22} color={theme.text} /></TouchableOpacity>
        <Text style={s.monthTxt}>{MONTHS[month - 1]} {year}</Text>
        <TouchableOpacity onPress={nextMonth}><Feather name="chevron-right" size={22} color={theme.text} /></TouchableOpacity>
      </View>

      {/* Weekday headers */}
      <View style={s.weekRow}>
        {WEEKDAYS.map(d => <Text key={d} style={s.weekDay}>{d}</Text>)}
      </View>

      {/* Calendar grid */}
      <View style={s.grid}>
        {calendarDays.map((dateStr, idx) => {
          if (!dateStr) return <View key={`empty-${idx}`} style={s.dayCell} />
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const hasEvents = (eventsByDate[dateStr]?.length ?? 0) > 0
          const dayNum = parseInt(dateStr.split('-')[2])
          return (
            <TouchableOpacity
              key={dateStr}
              style={[s.dayCell, isSelected && s.selCell, !isSelected && isToday && s.todayCell]}
              onPress={() => setSelectedDate(dateStr)}
            >
              <Text style={[s.dayTxt, isSelected && s.selTxt, !isSelected && isToday && s.todayTxt]}>
                {dayNum}
              </Text>
              {hasEvents && !isSelected && <View style={s.dot} />}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Events for selected date */}
      <ScrollView style={s.evList}>
        <Text style={{ color: theme.text + '80', fontSize: 13, fontWeight: '500', marginBottom: 10 }}>
          {formatDate(selectedDate)} · {selectedEvents.length} evento{selectedEvents.length !== 1 ? 's' : ''}
        </Text>
        {selectedEvents.length === 0
          ? <EmptyState icon="calendar" title="Nenhum evento" subtitle="Toque no + para criar" />
          : selectedEvents.map(event => (
              <View key={event.id} style={s.evCard}>
                <View style={[s.evDot, { backgroundColor: event.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.evTitle}>{event.title}</Text>
                  {event.time && <Text style={s.evTime}>{event.time}</Text>}
                  {event.description ? <Text style={[s.evTime, { marginTop: 4 }]} numberOfLines={2}>{event.description}</Text> : null}
                </View>
                <TouchableOpacity style={s.evEdit} onPress={() => openEdit(event)}>
                  <Feather name="edit-2" size={16} color={theme.text + '60'} />
                </TouchableOpacity>
              </View>
            ))
        }
        <View style={{ height: 80 }} />
      </ScrollView>

      <FAB onPress={openNew} />

      <BottomSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        title={editingEvent ? 'Editar evento' : 'Novo evento'}
        onSave={handleSave}
      >
        <FormInput label="Título" value={form.title} onChangeText={t => setForm(f => ({ ...f, title: t }))} placeholder="Título do evento" autoFocus />
        <FormInput label="Data (YYYY-MM-DD)" value={form.date} onChangeText={t => setForm(f => ({ ...f, date: t }))} placeholder="2026-02-27" />
        <FormInput label="Hora (HH:MM)" value={form.time} onChangeText={t => setForm(f => ({ ...f, time: t }))} placeholder="14:00" />
        <FormInput label="Descrição" value={form.description} onChangeText={t => setForm(f => ({ ...f, description: t }))} placeholder="Detalhes..." multiline numberOfLines={3} />

        <Text style={{ color: theme.text + '80', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' }}>Cor</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {COLORS.map(c => (
            <TouchableOpacity key={c} onPress={() => setForm(f => ({ ...f, color: c }))}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, borderWidth: form.color === c ? 3 : 0, borderColor: '#fff' }} />
            </TouchableOpacity>
          ))}
        </View>

        {editingEvent && (
          <TouchableOpacity
            style={{ marginTop: 4, padding: 14, backgroundColor: '#ef444420', borderRadius: 10, alignItems: 'center' }}
            onPress={() => { setShowSheet(false); handleDelete(editingEvent) }}
          >
            <Text style={{ color: '#ef4444', fontWeight: '600' }}>Excluir evento</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 20 }} />
      </BottomSheet>
    </SafeAreaView>
  )
}
