import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  PanResponder,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { Header } from '../components/shared/Header'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { today, now } from '../utils/date'
import type { CalendarEvent } from '../types'

const MONTHS = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const COLORS = ['#6366f1', '#3b82f6', '#22c55e', '#ef4444', '#f97316', '#eab308', '#8b5cf6', '#ec4899']

function formatSelectedDate(iso: string): string {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  } catch {
    return iso
  }
}

function monthKeyFromDate(date: { year: number; month: number }): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}`
}

function shiftMonth(date: { year: number; month: number }, delta: number): { year: number; month: number } {
  if (delta === 0) return date
  const total = date.year * 12 + (date.month - 1) + delta
  const nextYear = Math.floor(total / 12)
  const nextMonth = (total % 12) + 1
  return { year: nextYear, month: nextMonth }
}

function fitDateToMonth(sourceISO: string, target: { year: number; month: number }): string {
  const parts = sourceISO.split('-').map(Number)
  const sourceDay = Number.isFinite(parts[2]) ? parts[2] : 1
  const maxDay = new Date(target.year, target.month, 0).getDate()
  const day = Math.min(Math.max(sourceDay, 1), maxDay)
  return `${target.year}-${String(target.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function CalendarScreen() {
  const theme = useTheme()
  const { store, addEvent, updateEvent, deleteEvent } = useStore()
  const { width: viewportWidth } = useWindowDimensions()
  const todayStr = today()

  const [currentDate, setCurrentDate] = useState(() => {
    const [y, m] = todayStr.split('-').map(Number)
    return { year: y, month: m }
  })
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [showSheet, setShowSheet] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const dragX = useRef(new Animated.Value(0)).current
  const isAnimatingRef = useRef(false)

  const [form, setForm] = useState({
    title: '',
    date: todayStr,
    time: '',
    description: '',
    color: '#6366f1',
  })

  const { year, month } = currentDate
  const monthKey = useMemo(() => monthKeyFromDate(currentDate), [currentDate])
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()

  const calendarDays = useMemo(() => {
    const days: (string | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [year, month, daysInMonth, firstDay])

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    store.calendarEvents.forEach(event => {
      if (!map[event.date]) map[event.date] = []
      map[event.date].push(event)
    })
    return map
  }, [store.calendarEvents])

  const selectedEvents = useMemo(
    () => (eventsByDate[selectedDate] ?? []).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')),
    [eventsByDate, selectedDate],
  )

  const monthEventCount = useMemo(
    () => store.calendarEvents.filter(event => event.date.startsWith(monthKey)).length,
    [store.calendarEvents, monthKey],
  )

  const travelDistance = Math.max(240, viewportWidth * 0.9)
  const swipeThreshold = Math.max(56, viewportWidth * 0.16)

  const snapBack = useCallback(() => {
    Animated.spring(dragX, {
      toValue: 0,
      damping: 18,
      stiffness: 240,
      mass: 0.8,
      useNativeDriver: true,
    }).start()
  }, [dragX])

  const applyMonth = useCallback((target: { year: number; month: number }) => {
    setCurrentDate(target)
    setSelectedDate(prev => fitDateToMonth(prev, target))
  }, [])

  const runMonthTransition = useCallback(
    (direction: 'next' | 'prev', fromDrag = false) => {
      if (isAnimatingRef.current) {
        if (fromDrag) snapBack()
        return
      }

      isAnimatingRef.current = true
      const exitX = direction === 'next' ? -travelDistance : travelDistance
      const enterX = -exitX
      const nextDate = shiftMonth(currentDate, direction === 'next' ? 1 : -1)

      Animated.timing(dragX, {
        toValue: exitX,
        duration: fromDrag ? 120 : 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        applyMonth(nextDate)
        dragX.setValue(enterX)

        Animated.spring(dragX, {
          toValue: 0,
          damping: 18,
          stiffness: 240,
          mass: 0.8,
          useNativeDriver: true,
        }).start(() => {
          isAnimatingRef.current = false
        })
      })
    },
    [applyMonth, currentDate, dragX, snapBack, travelDistance],
  )

  const prevMonth = useCallback(() => {
    runMonthTransition('prev')
  }, [runMonthTransition])

  const nextMonth = useCallback(() => {
    runMonthTransition('next')
  }, [runMonthTransition])

  const goToToday = useCallback(() => {
    const [y, m] = todayStr.split('-').map(Number)
    setCurrentDate({ year: y, month: m })
    setSelectedDate(todayStr)
    dragX.setValue(0)
  }, [dragX, todayStr])

  const swipeResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
      onPanResponderGrant: () => {
        dragX.stopAnimation()
      },
      onPanResponderMove: (_, gesture) => {
        if (isAnimatingRef.current) return
        const clampedX = Math.max(-travelDistance, Math.min(travelDistance, gesture.dx))
        dragX.setValue(clampedX)
      },
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) < swipeThreshold || Math.abs(gesture.dx) < Math.abs(gesture.dy)) {
          snapBack()
          return
        }
        if (gesture.dx < 0) {
          runMonthTransition('next', true)
        } else {
          runMonthTransition('prev', true)
        }
      },
      onPanResponderTerminate: () => {
        snapBack()
      },
    })
  }, [dragX, runMonthTransition, snapBack, swipeThreshold, travelDistance])

  const panelOpacity = dragX.interpolate({
    inputRange: [-travelDistance, 0, travelDistance],
    outputRange: [0.82, 1, 0.82],
    extrapolate: 'clamp',
  })

  const panelScale = dragX.interpolate({
    inputRange: [-travelDistance, 0, travelDistance],
    outputRange: [0.986, 1, 0.986],
    extrapolate: 'clamp',
  })

  function openNew() {
    setEditingEvent(null)
    setForm({ title: '', date: selectedDate, time: '', description: '', color: '#6366f1' })
    setShowSheet(true)
  }

  function openEdit(event: CalendarEvent) {
    setEditingEvent(event)
    setForm({
      title: event.title,
      date: event.date,
      time: event.time ?? '',
      description: event.description,
      color: event.color,
    })
    setShowSheet(true)
  }

  function handleSave() {
    if (!form.title.trim()) return

    const data = {
      title: form.title,
      date: form.date,
      time: form.time || null,
      description: form.description,
      color: form.color,
    }

    if (editingEvent) {
      updateEvent(editingEvent.id, { ...data, updatedAt: now() })
    } else {
      addEvent({ ...data, createdAt: now(), updatedAt: now() })
    }

    setShowSheet(false)
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}> 
      <Header title="Calendario" />

      <Animated.View
        style={[
          styles.monthPanel,
          {
            opacity: panelOpacity,
            transform: [{ translateX: dragX }, { scale: panelScale }],
          },
        ]}
        {...swipeResponder.panHandlers}
      >
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

        <View style={[styles.weekRow, { backgroundColor: theme.surface }]}>
          {WEEKDAYS.map(day => (
            <Text key={day} style={[styles.weekDayText, { color: theme.text + '55' }]}> 
              {day}
            </Text>
          ))}
        </View>

        <View style={[styles.grid, { backgroundColor: theme.surface, borderBottomColor: theme.text + '10' }]}>
          {calendarDays.map((dateStr, idx) => {
            if (!dateStr) return <View key={`empty-${idx}`} style={styles.dayCell} />

            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const events = eventsByDate[dateStr] ?? []
            const dayNum = Number.parseInt(dateStr.split('-')[2], 10)

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
                <Text
                  style={[
                    styles.dayNum,
                    { color: isSelected ? '#fff' : isToday ? theme.primary : theme.text },
                    (isToday || isSelected) && { fontWeight: '700' },
                  ]}
                >
                  {dayNum}
                </Text>

                {events.length > 0 && !isSelected && (
                  <View style={styles.dotRow}>
                    {events.slice(0, 3).map(event => (
                      <View key={event.id} style={[styles.eventDot, { backgroundColor: event.color }]} />
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
      </Animated.View>

      <ScrollView
        style={styles.evScroll}
        contentContainerStyle={styles.evContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.evHeader}>
          <Text style={[styles.evDateTitle, { color: theme.text }]}> 
            {formatSelectedDate(selectedDate)}
          </Text>
          <Text style={[styles.evDateSub, { color: theme.text + '50' }]}> 
            {selectedEvents.length === 0
              ? 'Nenhum evento'
              : `${selectedEvents.length} evento${selectedEvents.length !== 1 ? 's' : ''}`}
          </Text>
        </View>

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
              <Text style={[styles.evTitle, { color: theme.text }]} numberOfLines={1}>
                {event.title}
              </Text>
              {event.description ? (
                <Text style={[styles.evDesc, { color: theme.text + '55' }]} numberOfLines={2}>
                  {event.description}
                </Text>
              ) : null}
            </View>

            <Feather name="edit-2" size={14} color={theme.text + '35'} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.text + '12' }]}>
        <View style={styles.footerSide}>
          <TouchableOpacity
            style={[styles.todayBtn, { backgroundColor: theme.text + '0a', borderColor: theme.text + '12' }]}
            onPress={goToToday}
          >
            <Feather name="calendar" size={14} color={theme.text + '85'} />
            <Text style={[styles.todayBtnText, { color: theme.text + '85' }]}>Hoje</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.footerAddBtn, { backgroundColor: theme.primary }]}
          onPress={openNew}
          activeOpacity={0.9}
        >
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.footerSide} />
      </View>

      <BottomSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        title={editingEvent ? 'Editar evento' : 'Novo evento'}
      >
        <FormInput
          label="Titulo"
          value={form.title}
          onChangeText={t => setForm(f => ({ ...f, title: t }))}
          placeholder="Titulo do evento"
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
          label="Descricao"
          value={form.description}
          onChangeText={t => setForm(f => ({ ...f, description: t }))}
          placeholder="Detalhes..."
          multiline
          numberOfLines={3}
        />

        <Text style={[styles.sheetLabel, { color: theme.text + '70' }]}>COR</Text>
        <View style={styles.colorRow}>
          {COLORS.map(color => (
            <TouchableOpacity key={color} onPress={() => setForm(f => ({ ...f, color }))}>
              <View
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                  form.color === color && styles.colorSwatchActive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.sheetActions, { marginTop: 20 }]}>
          {editingEvent && (
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#ef444418', flex: 1 }]}
              onPress={() => {
                deleteEvent(editingEvent.id)
                setShowSheet(false)
              }}
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

const styles = StyleSheet.create({
  root: { flex: 1 },

  monthPanel: { marginBottom: 2 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  navBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  monthCenter: { alignItems: 'center' },
  monthText: { fontSize: 16, fontWeight: '700' },
  monthSub: { fontSize: 11, marginTop: 1 },

  weekRow: { flexDirection: 'row' },
  weekDayText: { flex: 1, textAlign: 'center', paddingVertical: 6, fontSize: 11, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', borderBottomWidth: 1 },
  dayCell: {
    width: '14.285714%',
    aspectRatio: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 2,
  },
  dayNum: { fontSize: 13 },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  eventDot: { width: 4, height: 4, borderRadius: 2 },
  selBadge: { borderRadius: 6, paddingHorizontal: 4, marginTop: 1 },
  selBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },

  evScroll: { flex: 1 },
  evContent: { padding: 16, paddingBottom: 10 },
  evHeader: { marginBottom: 14 },
  evDateTitle: { fontSize: 15, fontWeight: '700', textTransform: 'capitalize' },
  evDateSub: { fontSize: 12, marginTop: 2 },

  evCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    padding: 14,
    borderLeftWidth: 4,
    gap: 12,
  },
  evCardLeft: { minWidth: 48, alignItems: 'center' },
  evTime: { fontSize: 13, fontWeight: '700' },
  evCardBody: { flex: 1 },
  evTitle: { fontSize: 14, fontWeight: '600' },
  evDesc: { fontSize: 12, marginTop: 4, lineHeight: 17 },

  footer: {
    height: 74,
    borderTopWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerSide: { width: 90, alignItems: 'flex-start' },
  todayBtn: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayBtnText: { fontSize: 12.5, fontWeight: '600' },
  footerAddBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },

  sheetLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  colorSwatch: { width: 34, height: 34, borderRadius: 17 },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sheetActions: { flexDirection: 'row', gap: 10 },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
})
