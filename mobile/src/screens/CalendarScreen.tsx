import React, { useState, useMemo } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { today, now } from '../utils/date'
import type { CalendarEvent } from '../types'

// ── Constants ──────────────────────────────────────────────────────────────────

const MONTHS   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const COLORS   = ['#6366f1','#3b82f6','#22c55e','#ef4444','#f97316','#eab308','#8b5cf6','#ec4899']

function formatSelectedDate(iso: string): string {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch { return iso }
}

// ── Component ──────────────────────────────────────────────────────────────────

export function CalendarScreen() {
  const theme = useTheme()
  const { store, addEvent, updateEvent, deleteEvent } = useStore()
  const todayStr = today()

  const [currentDate, setCurrentDate] = useState(() => {
    const [y, m] = todayStr.split('-').map(Number)
    return { year: y, month: m }
  })
  const [selectedDate,  setSelectedDate]  = useState(todayStr)
  const [showSheet,     setShowSheet]     = useState(false)
  const [editingEvent,  setEditingEvent]  = useState<CalendarEvent | null>(null)
  const [form, setForm] = useState({
    title: '', date: todayStr, time: '', description: '', color: '#6366f1',
  })

  const { year, month } = currentDate
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay    = new Date(year, month - 1, 1).getDay()

  const calendarDays = useMemo(() => {
    const days: (string | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    // Pad to complete last row
    while (days.length % 7 !== 0) days.push(null)
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
    (eventsByDate[selectedDate] ?? []).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
  [eventsByDate, selectedDate])

  const monthEventCount = useMemo(() =>
    store.calendarEvents.filter(e => e.date.startsWith(`${year}-${String(month).padStart(2, '0')}`)).length,
  [store.calendarEvents, year, month])

  const prevMonth = () => setCurrentDate(({ year: y, month: m }) =>
    m === 1 ? { year: y - 1, month: 12 } : { year: y, month: m - 1 }
  )
  const nextMonth = () => setCurrentDate(({ year: y, month: m }) =>
    m === 12 ? { year: y + 1, month: 1 } : { year: y, month: m + 1 }
  )

  function openNew() {
    setEditingEvent(null)
    setForm({ title: '', date: selectedDate, time: '', description: '', color: '#6366f1' })
    setShowSheet(true)
  }

  function openEdit(event: CalendarEvent) {
    setEditingEvent(event)
    setForm({ title: event.title, date: event.date, time: event.time ?? '', description: event.description, color: event.color })
    setShowSheet(true)
  }

  function handleSave() {
    if (!form.title.trim()) return
    const data = { title: form.title, date: form.date, time: form.time || null, description: form.description, color: form.color }
    if (editingEvent) {
      updateEvent(editingEvent.id, { ...data, updatedAt: now() })
    } else {
      addEvent({ ...data, createdAt: now(), updatedAt: now() })
    }
    setShowSheet(false)
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>

      {/* ── Month navigation ── */}
      <View style={[styles.monthNav, { backgroundColor: theme.surface, borderBottomColor: theme.text + '10' }]}>
        <TouchableOpacity style={styles.navBtn} onPress={prevMonth}>
          <Feather name="chevron-left" size={22} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.monthCenter}>
          <Text style={[styles.monthText, { color: theme.text }]}>
            {MONTHS[month - 1]} {year}
          </Text>
          {monthEventCount > 0 && (
            <Text style={[styles.monthSub, { color: theme.text + '50' }]}>
              {monthEventCount} evento{monthEventCount !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.navBtn} onPress={nextMonth}>
          <Feather name="chevron-right" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* ── Weekday headers ── */}
      <View style={[styles.weekRow, { backgroundColor: theme.surface }]}>
        {WEEKDAYS.map(d => (
          <Text key={d} style={[styles.weekDayText, { color: theme.text + '55' }]}>{d}</Text>
        ))}
      </View>

      {/* ── Calendar grid ── */}
      <View style={[styles.grid, { backgroundColor: theme.surface, borderBottomColor: theme.text + '10' }]}>
        {calendarDays.map((dateStr, idx) => {
          if (!dateStr) return <View key={`e-${idx}`} style={styles.dayCell} />

          const isToday    = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const events     = eventsByDate[dateStr] ?? []
          const dayNum     = parseInt(dateStr.split('-')[2])

          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                styles.dayCell,
                isSelected && { backgroundColor: theme.primary },
                !isSelected && isToday && { backgroundColor: theme.primary + '20' },
              ]}
              onPress={() => setSelectedDate(dateStr)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dayNum,
                { color: isSelected ? '#fff' : isToday ? theme.primary : theme.text },
                (isToday || isSelected) && { fontWeight: '700' },
              ]}>
                {dayNum}
              </Text>
              {/* Event dots (up to 3 colors) */}
              {events.length > 0 && !isSelected && (
                <View style={styles.dotRow}>
                  {events.slice(0, 3).map(e => (
                    <View key={e.id} style={[styles.eventDot, { backgroundColor: e.color }]} />
                  ))}
                </View>
              )}
              {isSelected && events.length > 0 && (
                <View style={[styles.selBadge, { backgroundColor: '#ffffff30' }]}>
                  <Text style={styles.selBadgeText}>{events.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* ── Selected date events ── */}
      <ScrollView style={styles.evScroll} contentContainerStyle={styles.evContent} showsVerticalScrollIndicator={false}>
        {/* Date title + add button */}
        <View style={styles.evHeader}>
          <View>
            <Text style={[styles.evDateTitle, { color: theme.text }]}>
              {formatSelectedDate(selectedDate)}
            </Text>
            <Text style={[styles.evDateSub, { color: theme.text + '50' }]}>
              {selectedEvents.length === 0 ? 'Nenhum evento' : `${selectedEvents.length} evento${selectedEvents.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.primary }]} onPress={openNew}>
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Event cards */}
        {selectedEvents.map(event => (
          <TouchableOpacity
            key={event.id}
            style={[styles.evCard, { backgroundColor: theme.surface, borderLeftColor: event.color }]}
            onPress={() => openEdit(event)}
            activeOpacity={0.8}
          >
            <View style={styles.evCardLeft}>
              {event.time ? (
                <Text style={[styles.evTime, { color: event.color }]}>{event.time}</Text>
              ) : (
                <Text style={[styles.evTime, { color: theme.text + '40' }]}>todo o dia</Text>
              )}
            </View>
            <View style={styles.evCardBody}>
              <Text style={[styles.evTitle, { color: theme.text }]} numberOfLines={1}>{event.title}</Text>
              {event.description ? (
                <Text style={[styles.evDesc, { color: theme.text + '55' }]} numberOfLines={2}>{event.description}</Text>
              ) : null}
            </View>
            <Feather name="edit-2" size={14} color={theme.text + '35'} />
          </TouchableOpacity>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Bottom Sheet ── */}
      <BottomSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        title={editingEvent ? 'Editar evento' : 'Novo evento'}
      >
        <FormInput
          label="Título"
          value={form.title}
          onChangeText={t => setForm(f => ({ ...f, title: t }))}
          placeholder="Título do evento"
          autoFocus
        />
        <FormInput
          label="Data (YYYY-MM-DD)"
          value={form.date}
          onChangeText={t => setForm(f => ({ ...f, date: t }))}
          placeholder="2026-02-28"
          keyboardType="numbers-and-punctuation"
        />
        <FormInput
          label="Hora (HH:MM)"
          value={form.time}
          onChangeText={t => setForm(f => ({ ...f, time: t }))}
          placeholder="14:00"
          keyboardType="numbers-and-punctuation"
        />
        <FormInput
          label="Descrição"
          value={form.description}
          onChangeText={t => setForm(f => ({ ...f, description: t }))}
          placeholder="Detalhes..."
          multiline
          numberOfLines={3}
        />

        <Text style={[styles.sheetLabel, { color: theme.text + '70' }]}>COR</Text>
        <View style={styles.colorRow}>
          {COLORS.map(c => (
            <TouchableOpacity key={c} onPress={() => setForm(f => ({ ...f, color: c }))}>
              <View style={[
                styles.colorSwatch,
                { backgroundColor: c },
                form.color === c && styles.colorSwatchActive,
              ]} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.sheetActions, { marginTop: 20 }]}>
          {editingEvent && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#ef444418', flex: 1 }]}
              onPress={() => { deleteEvent(editingEvent.id); setShowSheet(false) }}
            >
              <Text style={{ color: '#ef4444', fontWeight: '600' }}>Excluir</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.primary, flex: editingEvent ? 2 : 1 }]}
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
  root:         { flex: 1 },

  monthNav:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  navBtn:       { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  monthCenter:  { alignItems: 'center' },
  monthText:    { fontSize: 16, fontWeight: '700' },
  monthSub:     { fontSize: 11, marginTop: 1 },

  weekRow:      { flexDirection: 'row' },
  weekDayText:  { flex: 1, textAlign: 'center', paddingVertical: 6, fontSize: 11, fontWeight: '700' },

  grid:         { flexDirection: 'row', flexWrap: 'wrap', borderBottomWidth: 1 },
  dayCell:      { width: '14.285714%', aspectRatio: 0.85, alignItems: 'center', justifyContent: 'center', borderRadius: 8, padding: 2 },
  dayNum:       { fontSize: 13 },
  dotRow:       { flexDirection: 'row', gap: 2, marginTop: 2 },
  eventDot:     { width: 4, height: 4, borderRadius: 2 },
  selBadge:     { borderRadius: 6, paddingHorizontal: 4, marginTop: 1 },
  selBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },

  evScroll:     { flex: 1 },
  evContent:    { padding: 16 },
  evHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  evDateTitle:  { fontSize: 15, fontWeight: '700', textTransform: 'capitalize' },
  evDateSub:    { fontSize: 12, marginTop: 2 },
  addBtn:       { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  evCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, padding: 14, borderLeftWidth: 4, gap: 12 },
  evCardLeft:   { minWidth: 48, alignItems: 'center' },
  evTime:       { fontSize: 13, fontWeight: '700' },
  evCardBody:   { flex: 1 },
  evTitle:      { fontSize: 14, fontWeight: '600' },
  evDesc:       { fontSize: 12, marginTop: 4, lineHeight: 17 },

  sheetLabel:   { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  colorRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  colorSwatch:  { width: 34, height: 34, borderRadius: 17 },
  colorSwatchActive: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  sheetActions: { flexDirection: 'row', gap: 10 },
  btn:          { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
})
