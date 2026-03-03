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
  Alert,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { Header } from '../components/shared/Header'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { getWeekRange, now, today } from '../utils/date'
import type { CalendarEvent, CalendarRecurrenceFrequency } from '../types'

type EventRangeFilter = 'week' | 'month' | 'quarter' | 'semester' | 'year' | 'all'

const MONTHS = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const COLORS = ['#6366f1', '#3b82f6', '#22c55e', '#ef4444', '#f97316', '#eab308', '#8b5cf6', '#ec4899']
const RECURRENCE_OPTIONS: Array<{ key: CalendarRecurrenceFrequency; label: string }> = [
  { key: 'none', label: 'Nao repetir' },
  { key: 'daily', label: 'Diario' },
  { key: 'weekly', label: 'Semanal' },
  { key: 'monthly', label: 'Mensal' },
]
const REMINDER_OFFSET_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '0', label: 'Na hora' },
  { value: '60', label: '1h antes' },
  { value: '120', label: '2h antes' },
  { value: '1440', label: '1 dia antes' },
]
const RECURRENCE_TEXT: Record<CalendarRecurrenceFrequency, string> = {
  none: 'Evento unico',
  daily: 'Diario',
  weekly: 'Semanal',
  monthly: 'Mensal',
}

const EVENT_RANGE_OPTIONS: Array<{ key: EventRangeFilter; label: string }> = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'semester', label: 'Semestre' },
  { key: 'year', label: 'Ano' },
  { key: 'all', label: 'Todos' },
]

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

function formatDateShort(iso: string): string {
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  return `${parts[2]}/${parts[1]}`
}

function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
  return toISODate(target.year, target.month, day)
}

function rangeLabel(start: string, end: string): string {
  return `${formatDateShort(start)} - ${formatDateShort(end)}`
}

function getEventRange(anchorISO: string, filter: EventRangeFilter): { start: string; end: string; label: string } | null {
  if (filter === 'all') return null

  const [year, month] = anchorISO.split('-').map(Number)

  if (filter === 'week') {
    const week = getWeekRange(anchorISO)
    return { start: week.start, end: week.end, label: rangeLabel(week.start, week.end) }
  }

  if (filter === 'month') {
    const start = toISODate(year, month, 1)
    const end = toISODate(year, month, new Date(year, month, 0).getDate())
    return { start, end, label: rangeLabel(start, end) }
  }

  if (filter === 'quarter') {
    const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1
    const quarterEndMonth = quarterStartMonth + 2
    const start = toISODate(year, quarterStartMonth, 1)
    const end = toISODate(year, quarterEndMonth, new Date(year, quarterEndMonth, 0).getDate())
    return { start, end, label: rangeLabel(start, end) }
  }

  if (filter === 'semester') {
    const semesterStartMonth = month <= 6 ? 1 : 7
    const semesterEndMonth = semesterStartMonth + 5
    const start = toISODate(year, semesterStartMonth, 1)
    const end = toISODate(year, semesterEndMonth, new Date(year, semesterEndMonth, 0).getDate())
    return { start, end, label: rangeLabel(start, end) }
  }

  const start = toISODate(year, 1, 1)
  const end = toISODate(year, 12, 31)
  return { start, end, label: rangeLabel(start, end) }
}

type EventFormState = {
  title: string
  date: string
  time: string
  description: string
  color: string
  recurrenceFrequency: CalendarRecurrenceFrequency
  recurrenceInterval: string
  recurrenceUntil: string
  reminderEnabled: boolean
  reminderOffset: string
}

function buildEventForm(selectedDate: string, event?: CalendarEvent): EventFormState {
  const recurrence = event?.recurrence
  const reminder = event?.reminder

  return {
    title: event?.title ?? '',
    date: event?.date ?? selectedDate,
    time: event?.time ?? '',
    description: event?.description ?? '',
    color: event?.color ?? '#6366f1',
    recurrenceFrequency: recurrence?.frequency ?? 'none',
    recurrenceInterval: String(Math.max(1, recurrence?.interval ?? 1)),
    recurrenceUntil: recurrence?.until ?? '',
    reminderEnabled: reminder?.enabled ?? false,
    reminderOffset: String(reminder?.offsetMinutes ?? 0),
  }
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
  const [showEventsSheet, setShowEventsSheet] = useState(false)
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null)
  const [eventsFilter, setEventsFilter] = useState<EventRangeFilter>('month')
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const dragX = useRef(new Animated.Value(0)).current
  const isAnimatingRef = useRef(false)

  const [form, setForm] = useState<EventFormState>(() => buildEventForm(todayStr))

  const { year, month } = currentDate
  const monthKey = useMemo(() => monthKeyFromDate(currentDate), [currentDate])
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()

  const cellHeight = useMemo(() => {
    const usableWidth = viewportWidth - 30
    return Math.max(42, Math.min(56, Math.floor(usableWidth / 7) + 6))
  }, [viewportWidth])

  const dayChipSize = useMemo(() => {
    return Math.max(28, Math.min(38, cellHeight - 14))
  }, [cellHeight])

  const calendarDays = useMemo(() => {
    const days: (string | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(toISODate(year, month, d))
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
    Object.keys(map).forEach(date => {
      map[date] = map[date].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
    })
    return map
  }, [store.calendarEvents])

  const selectedEvents = useMemo(
    () => eventsByDate[selectedDate] ?? [],
    [eventsByDate, selectedDate],
  )

  const monthEventCount = useMemo(
    () => store.calendarEvents.filter(event => event.date.startsWith(monthKey)).length,
    [store.calendarEvents, monthKey],
  )

  const activeRange = useMemo(() => getEventRange(selectedDate, eventsFilter), [eventsFilter, selectedDate])

  const filteredEvents = useMemo(() => {
    const sorted = [...store.calendarEvents].sort((a, b) => {
      if (a.date === b.date) return (a.time ?? '').localeCompare(b.time ?? '')
      return a.date.localeCompare(b.date)
    })

    if (!activeRange) return sorted

    return sorted.filter(event => event.date >= activeRange.start && event.date <= activeRange.end)
  }, [activeRange, store.calendarEvents])

  const groupedFilteredEvents = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    filteredEvents.forEach(event => {
      if (!map[event.date]) map[event.date] = []
      map[event.date].push(event)
    })

    return Object.keys(map)
      .sort((a, b) => a.localeCompare(b))
      .map(date => ({ date, events: map[date] }))
  }, [filteredEvents])

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
    setForm(buildEventForm(selectedDate))
    setShowSheet(true)
  }

  function openEdit(event: CalendarEvent) {
    setEditingEvent(event)
    setForm(buildEventForm(event.date, event))
    setShowSheet(true)
  }

  function openDetailsFromEvents(event: CalendarEvent) {
    setShowEventsSheet(false)
    setTimeout(() => setDetailEvent(event), 220)
  }

  function openEditFromDetails() {
    if (!detailEvent) return
    const event = detailEvent
    setDetailEvent(null)
    setTimeout(() => openEdit(event), 150)
  }

  function handleSave() {
    if (!form.title.trim()) return
    const normalizedTime = form.time.trim()
    const recurrenceInterval = Math.max(1, Number(form.recurrenceInterval) || 1)
    const recurrenceUntil = form.recurrenceUntil.trim()
    const reminderOffset = Number(form.reminderOffset) || 0

    if (form.reminderEnabled && !normalizedTime) {
      Alert.alert('Hora obrigatoria', 'Defina uma hora para usar lembrete.')
      return
    }

    const recurrence = form.recurrenceFrequency === 'none'
      ? null
      : {
        frequency: form.recurrenceFrequency,
        interval: recurrenceInterval,
        until: recurrenceUntil || null,
      }

    const reminder = form.reminderEnabled
      ? { enabled: true, offsetMinutes: reminderOffset }
      : null

    const data = {
      title: form.title,
      date: form.date,
      time: normalizedTime || null,
      description: form.description,
      color: form.color,
      recurrence,
      reminder,
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
        <View style={[styles.monthCard, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}> 
          <View style={[styles.monthNav, { borderBottomColor: theme.text + '10' }]}>
            <TouchableOpacity style={styles.navBtn} onPress={prevMonth}>
              <Feather name="chevron-left" size={22} color={theme.text} />
            </TouchableOpacity>

            <View style={styles.monthCenter}>
              <Text style={[styles.monthText, { color: theme.text }]}> 
                {MONTHS[month - 1]} {year}
              </Text>
              <Text style={[styles.monthSub, { color: theme.text + '5f' }]}> 
                {monthEventCount} evento{monthEventCount !== 1 ? 's' : ''}
              </Text>
            </View>

            <TouchableOpacity style={styles.navBtn} onPress={nextMonth}>
              <Feather name="chevron-right" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map(day => (
              <Text key={day} style={[styles.weekDayText, { color: theme.text + '58' }]}> 
                {day}
              </Text>
            ))}
          </View>

          <View style={[styles.grid, { borderTopColor: theme.text + '08' }]}>
            {calendarDays.map((dateStr, idx) => {
              if (!dateStr) return <View key={`empty-${idx}`} style={[styles.dayCell, { height: cellHeight }]} />

              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const events = eventsByDate[dateStr] ?? []
              const dayNum = Number.parseInt(dateStr.split('-')[2], 10)

              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[styles.dayCell, { height: cellHeight }]}
                  onPress={() => setSelectedDate(dateStr)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.dayChip,
                      { width: dayChipSize, height: dayChipSize, borderColor: 'transparent' },
                      isSelected && { backgroundColor: theme.primary },
                      !isSelected && isToday && { borderColor: theme.primary, borderWidth: 1.4 },
                    ]}
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
                  </View>

                  {events.length > 0 && (
                    <View style={styles.dotRow}>
                      {events.slice(0, 3).map(event => (
                        <View key={event.id} style={[styles.eventDot, { backgroundColor: event.color }]} />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
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
              ? 'Nenhum evento para este dia'
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
                <Text style={[styles.evTime, { color: theme.text + '40' }]}>dia todo</Text>
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
            style={[styles.footerActionBtn, { backgroundColor: theme.text + '0a', borderColor: theme.text + '12' }]}
            onPress={goToToday}
          >
            <Feather name="calendar" size={15} color={theme.text + '85'} />
            <Text style={[styles.footerActionText, { color: theme.text + '85' }]}>Hoje</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.footerAddBtn, { backgroundColor: theme.primary }]}
          onPress={openNew}
          activeOpacity={0.9}
        >
          <Feather name="plus" size={21} color="#fff" />
        </TouchableOpacity>

        <View style={[styles.footerSide, { alignItems: 'flex-end' }]}>
          <TouchableOpacity
            style={[styles.footerActionBtn, { backgroundColor: theme.text + '0a', borderColor: theme.text + '12' }]}
            onPress={() => setShowEventsSheet(true)}
          >
            <Feather name="list" size={15} color={theme.text + '85'} />
            <Text style={[styles.footerActionText, { color: theme.text + '85' }]}>Eventos</Text>
          </TouchableOpacity>
        </View>
      </View>

      <BottomSheet
        visible={showEventsSheet}
        onClose={() => setShowEventsSheet(false)}
        title="Eventos"
        maxHeight="94%"
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, maxHeight: 46 }}
          contentContainerStyle={{ gap: 8, paddingBottom: 4, paddingRight: 4, alignItems: 'center' }}
        >
          {EVENT_RANGE_OPTIONS.map(option => {
            const active = eventsFilter === option.key
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.rangeChip,
                  active
                    ? { backgroundColor: theme.primary, borderColor: theme.primary }
                    : { backgroundColor: theme.text + '08', borderColor: theme.text + '16' },
                ]}
                onPress={() => setEventsFilter(option.key)}
              >
                <Text style={[styles.rangeChipText, { color: active ? '#fff' : theme.text + '80' }]}>{option.label}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        <View style={[styles.eventsSheetHeader, { borderBottomColor: theme.text + '12' }]}>
          <Text style={[styles.eventsSheetCount, { color: theme.text }]}>
            {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''}
          </Text>
          <Text style={[styles.eventsSheetRange, { color: theme.text + '65' }]}>
            {activeRange ? activeRange.label : 'Periodo completo'}
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 10, paddingBottom: 10, gap: 10 }}
        >
          {groupedFilteredEvents.length === 0 && (
            <View style={styles.eventsEmptyWrap}>
              <Feather name="calendar" size={34} color={theme.text + '30'} />
              <Text style={[styles.eventsEmptyText, { color: theme.text + '58' }]}>Sem eventos nesse filtro</Text>
            </View>
          )}

          {groupedFilteredEvents.map(group => (
            <View key={group.date} style={[styles.eventsGroup, { borderColor: theme.text + '12', backgroundColor: theme.background }]}> 
              <Text style={[styles.eventsGroupTitle, { color: theme.text }]}>{formatSelectedDate(group.date)}</Text>
              <Text style={[styles.eventsGroupSub, { color: theme.text + '60' }]}>{formatDateShort(group.date)}</Text>

              {group.events.map(event => (
                <TouchableOpacity
                  key={event.id}
                  style={[styles.eventsRow, { borderTopColor: theme.text + '10', borderColor: theme.text + '10', backgroundColor: theme.surface }]}
                  onPress={() => openDetailsFromEvents(event)}
                >
                  <View style={[styles.eventsRowDate, { backgroundColor: event.color + '1a', borderColor: event.color + '33' }]}>
                    <Text style={[styles.eventsRowDateDay, { color: event.color }]}>{event.date.slice(8, 10)}</Text>
                    <Text style={[styles.eventsRowDateMonth, { color: event.color }]}>{event.date.slice(5, 7)}</Text>
                  </View>

                  <View style={styles.eventsRowMain}>
                    <View style={styles.eventsRowTop}>
                      <Text style={[styles.eventsRowTitle, { color: theme.text }]} numberOfLines={1}>
                        {event.title}
                      </Text>
                      <Text style={[styles.eventsRowTime, { color: event.color }]}>{event.time ?? 'dia todo'}</Text>
                    </View>
                    <Text style={[styles.eventsRowDay, { color: theme.text + '78' }]} numberOfLines={1}>
                      {formatSelectedDate(event.date)}
                    </Text>
                    {event.description ? (
                      <Text style={[styles.eventsRowDesc, { color: theme.text + '5c' }]} numberOfLines={2}>
                        {event.description}
                      </Text>
                    ) : null}
                  </View>

                  <Feather name="chevron-right" size={15} color={theme.text + '42'} />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        visible={!!detailEvent}
        onClose={() => setDetailEvent(null)}
        title="Detalhes do evento"
        maxHeight="92%"
      >
        {detailEvent && (
          <>
            <View style={[styles.detailHero, { borderColor: theme.text + '16', backgroundColor: theme.background }]}>
              <View style={[styles.detailColorDot, { backgroundColor: detailEvent.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailTitle, { color: theme.text }]} numberOfLines={2}>
                  {detailEvent.title}
                </Text>
                <Text style={[styles.detailSub, { color: theme.text + '6c' }]}>
                  {formatSelectedDate(detailEvent.date)}
                </Text>
              </View>
              <Text style={[styles.detailTimeTag, { color: detailEvent.color, borderColor: detailEvent.color + '50' }]}>
                {detailEvent.time ?? 'dia todo'}
              </Text>
            </View>

            <View style={[styles.detailPanel, { borderColor: theme.text + '14', backgroundColor: theme.background }]}>
              <Text style={[styles.detailLabel, { color: theme.text + '66' }]}>Data</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{formatDateShort(detailEvent.date)}</Text>
            </View>

            <View style={[styles.detailPanel, { borderColor: theme.text + '14', backgroundColor: theme.background }]}>
              <Text style={[styles.detailLabel, { color: theme.text + '66' }]}>Recorrencia</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {detailEvent.recurrence
                  ? `${RECURRENCE_TEXT[detailEvent.recurrence.frequency]} - a cada ${detailEvent.recurrence.interval}${detailEvent.recurrence.until ? ` ate ${formatDateShort(detailEvent.recurrence.until)}` : ''}`
                  : RECURRENCE_TEXT.none}
              </Text>
            </View>

            <View style={[styles.detailPanel, { borderColor: theme.text + '14', backgroundColor: theme.background }]}>
              <Text style={[styles.detailLabel, { color: theme.text + '66' }]}>Lembrete</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>
                {detailEvent.reminder?.enabled
                  ? `${REMINDER_OFFSET_OPTIONS.find(opt => Number(opt.value) === detailEvent.reminder?.offsetMinutes)?.label ?? `${detailEvent.reminder?.offsetMinutes ?? 0} min antes`}`
                  : 'Desativado'}
              </Text>
            </View>

            <View style={[styles.detailPanel, { borderColor: theme.text + '14', backgroundColor: theme.background }]}>
              <Text style={[styles.detailLabel, { color: theme.text + '66' }]}>Descricao</Text>
              <Text style={[styles.detailDescription, { color: theme.text + 'c6' }]}>
                {detailEvent.description?.trim() ? detailEvent.description : 'Sem descricao'}
              </Text>
            </View>

            <View style={[styles.detailPanel, { borderColor: theme.text + '14', backgroundColor: theme.background }]}>
              <Text style={[styles.detailLabel, { color: theme.text + '66' }]}>Registro</Text>
              <Text style={[styles.detailMeta, { color: theme.text + '78' }]}>Criado: {formatDateTime(detailEvent.createdAt)}</Text>
              <Text style={[styles.detailMeta, { color: theme.text + '78' }]}>Atualizado: {formatDateTime(detailEvent.updatedAt)}</Text>
            </View>

            <TouchableOpacity
              style={[styles.detailPrimaryBtn, { backgroundColor: theme.primary }]}
              onPress={openEditFromDetails}
            >
              <Feather name="edit-2" size={14} color="#fff" />
              <Text style={styles.detailPrimaryText}>Editar evento</Text>
            </TouchableOpacity>
            <View style={{ height: 8 }} />
          </>
        )}
      </BottomSheet>

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

        <Text style={[styles.sheetLabel, { color: theme.text + '70' }]}>RECORRENCIA</Text>
        <View style={styles.sheetChipRow}>
          {RECURRENCE_OPTIONS.map(option => {
            const active = form.recurrenceFrequency === option.key
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sheetChip,
                  active
                    ? { backgroundColor: theme.primary + '22', borderColor: theme.primary }
                    : { backgroundColor: theme.text + '08', borderColor: theme.text + '16' },
                ]}
                onPress={() => setForm(f => ({ ...f, recurrenceFrequency: option.key }))}
              >
                <Text style={[styles.sheetChipText, { color: active ? theme.primary : theme.text + '82' }]}>{option.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {form.recurrenceFrequency !== 'none' && (
          <>
            <FormInput
              label="Intervalo"
              value={form.recurrenceInterval}
              onChangeText={t => setForm(f => ({ ...f, recurrenceInterval: t }))}
              placeholder="1"
              keyboardType="number-pad"
            />
            <FormInput
              label="Ate (YYYY-MM-DD)"
              value={form.recurrenceUntil}
              onChangeText={t => setForm(f => ({ ...f, recurrenceUntil: t }))}
              placeholder="Opcional"
              keyboardType="numbers-and-punctuation"
            />
          </>
        )}

        <Text style={[styles.sheetLabel, { color: theme.text + '70' }]}>LEMBRETE</Text>
        <View style={styles.sheetChipRow}>
          <TouchableOpacity
            style={[
              styles.sheetChip,
              form.reminderEnabled
                ? { backgroundColor: theme.primary + '22', borderColor: theme.primary }
                : { backgroundColor: theme.text + '08', borderColor: theme.text + '16' },
            ]}
            onPress={() => setForm(f => ({ ...f, reminderEnabled: !f.reminderEnabled }))}
          >
            <Text style={[styles.sheetChipText, { color: form.reminderEnabled ? theme.primary : theme.text + '82' }]}>
              {form.reminderEnabled ? 'Ativado' : 'Desativado'}
            </Text>
          </TouchableOpacity>

          {form.reminderEnabled &&
            REMINDER_OFFSET_OPTIONS.map(option => {
              const active = form.reminderOffset === option.value
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.sheetChip,
                    active
                      ? { backgroundColor: theme.primary + '22', borderColor: theme.primary }
                      : { backgroundColor: theme.text + '08', borderColor: theme.text + '16' },
                  ]}
                  onPress={() => setForm(f => ({ ...f, reminderOffset: option.value }))}
                >
                  <Text style={[styles.sheetChipText, { color: active ? theme.primary : theme.text + '82' }]}>{option.label}</Text>
                </TouchableOpacity>
              )
            })}
        </View>
        {form.reminderEnabled && (
          <Text style={[styles.sheetHint, { color: theme.text + '62' }]}>Lembrete exige hora definida.</Text>
        )}

        <FormInput
          label="Descricao"
          value={form.description}
          onChangeText={t => setForm(f => ({ ...f, description: t }))}
          placeholder="Detalhes"
          multiline
          numberOfLines={6}
          style={styles.descriptionInput}
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

  monthPanel: { marginBottom: 2, paddingHorizontal: 10, paddingTop: 8 },
  monthCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  navBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  monthCenter: { alignItems: 'center' },
  monthText: { fontSize: 16, fontWeight: '700' },
  monthSub: { fontSize: 11, marginTop: 1 },

  weekRow: { flexDirection: 'row', paddingTop: 6 },
  weekDayText: { flex: 1, textAlign: 'center', paddingVertical: 6, fontSize: 11, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, paddingBottom: 6 },
  dayCell: {
    width: '14.285714%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 1,
  },
  dayChip: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  dayNum: { fontSize: 13 },
  dotRow: { flexDirection: 'row', gap: 3, marginTop: 3, minHeight: 8 },
  eventDot: { width: 4, height: 4, borderRadius: 2 },

  evScroll: { flex: 1 },
  evContent: { padding: 14, paddingBottom: 10 },
  evHeader: { marginBottom: 12 },
  evDateTitle: { fontSize: 15, fontWeight: '700', textTransform: 'capitalize' },
  evDateSub: { fontSize: 12, marginTop: 2 },

  evCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 9,
    padding: 13,
    borderLeftWidth: 4,
    gap: 12,
  },
  evCardLeft: { minWidth: 52, alignItems: 'center' },
  evTime: { fontSize: 13, fontWeight: '700' },
  evCardBody: { flex: 1 },
  evTitle: { fontSize: 14, fontWeight: '600' },
  evDesc: { fontSize: 12, marginTop: 4, lineHeight: 17 },

  footer: {
    height: 66,
    borderTopWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerSide: { width: 112, alignItems: 'flex-start' },
  footerActionBtn: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  footerActionText: { fontSize: 13, fontWeight: '600' },
  footerAddBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },

  rangeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  rangeChipText: { fontSize: 12.5, fontWeight: '600' },
  eventsSheetHeader: {
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginTop: 6,
  },
  eventsSheetCount: { fontSize: 14, fontWeight: '700' },
  eventsSheetRange: { fontSize: 12, marginTop: 2 },

  eventsEmptyWrap: { alignItems: 'center', paddingVertical: 34, gap: 8 },
  eventsEmptyText: { fontSize: 13 },

  eventsGroup: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
  },
  eventsGroupTitle: { fontSize: 13.5, fontWeight: '700', textTransform: 'capitalize' },
  eventsGroupSub: { fontSize: 11.5, marginTop: 1 },
  eventsRow: {
    marginTop: 8,
    padding: 10,
    borderTopWidth: 1,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eventsRowDate: {
    width: 46,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventsRowDateDay: { fontSize: 16, fontWeight: '800', lineHeight: 18 },
  eventsRowDateMonth: { fontSize: 10.5, fontWeight: '700', marginTop: 1 },
  eventsRowMain: { flex: 1, minWidth: 0 },
  eventsRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eventsRowTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  eventsRowTime: { fontSize: 12.5, fontWeight: '700' },
  eventsRowDay: { fontSize: 11.5, marginTop: 2, textTransform: 'capitalize' },
  eventsRowDesc: { fontSize: 12, marginTop: 3, lineHeight: 17 },

  detailHero: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  detailColorDot: { width: 12, height: 12, borderRadius: 6 },
  detailTitle: { fontSize: 15.5, fontWeight: '700' },
  detailSub: { fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  detailTimeTag: {
    fontSize: 11.5,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  detailPanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  detailLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  detailValue: { fontSize: 13.5, fontWeight: '600', marginTop: 5, lineHeight: 18 },
  detailDescription: { fontSize: 13, marginTop: 5, lineHeight: 20, minHeight: 72 },
  detailMeta: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  detailPrimaryBtn: {
    marginTop: 6,
    borderRadius: 12,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailPrimaryText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },

  sheetLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 8 },
  sheetChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  sheetChip: {
    paddingHorizontal: 11,
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetChipText: { fontSize: 12, fontWeight: '600' },
  sheetHint: { fontSize: 11.5, marginTop: -6, marginBottom: 10 },
  descriptionInput: { minHeight: 120, textAlignVertical: 'top', paddingTop: 10 },
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
