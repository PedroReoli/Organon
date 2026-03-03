import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
import { uid } from '../utils/format'
import { addDays, getDayOfWeek, getWeekRange, today } from '../utils/date'
import {
  DAYS_ORDER,
  DAY_LABELS,
  DAY_LABELS_FULL,
  PERIODS_ORDER,
  PERIOD_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  PRIORITY_COLORS,
  STATUS_ORDER,
  type Day,
  type Period,
  type Card,
  type CardStatus,
  type CardPriority,
  type ChecklistItem,
} from '../types'

const PERIOD_CONFIG: Record<Period, {
  icon: string
  color: string
  textColor: string
  bg: string
}> = {
  morning: { icon: 'sunrise', color: '#fbbf24', textColor: '#fcd34d', bg: 'rgba(251,191,36,0.10)' },
  afternoon: { icon: 'sun', color: '#f97316', textColor: '#fb923c', bg: 'rgba(249,115,22,0.10)' },
  night: { icon: 'moon', color: '#818cf8', textColor: '#a5b4fc', bg: 'rgba(99,102,241,0.10)' },
}

const STATUS_ICONS: Record<CardStatus, string | null> = {
  todo: null,
  in_progress: 'loader',
  blocked: 'alert-circle',
  done: 'check-circle',
}

function statusLabel(status: CardStatus): string {
  return STATUS_LABELS[status]
}

function formatDateShort(iso: string): string {
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  return `${parts[2]}/${parts[1]}`
}

function htmlToPlainText(html: string): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

function plainTextToHtml(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const escaped = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<p>${escaped.replace(/\n/g, '<br/>')}</p>`
}

export function PlannerScreen() {
  const theme = useTheme()
  const { store, addCard, updateCard, deleteCard, addEvent, updateEvent, deleteEvent } = useStore()
  const { width: viewportWidth } = useWindowDimensions()

  const todayDay = getDayOfWeek(today())
  const [selectedDay, setSelectedDay] = useState<Day>(todayDay)
  const [weekOffset, setWeekOffset] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editCard, setEditCard] = useState<Card | null>(null)
  const [newChecklistText, setNewChecklistText] = useState('')
  const [backlogOpen, setBacklogOpen] = useState(false)
  const [backlogStatusFilter, setBacklogStatusFilter] = useState<CardStatus | 'all'>('all')
  const [backlogEditCard, setBacklogEditCard] = useState<Card | null>(null)
  const [backlogSheetOpen, setBacklogSheetOpen] = useState(false)
  const [backlogForm, setBacklogForm] = useState<{ title: string; priority: CardPriority | null; status: CardStatus }>({
    title: '', priority: null, status: 'todo',
  })
  const [scheduleCard, setScheduleCard] = useState<Card | null>(null)
  const [scheduleDay, setScheduleDay] = useState<Day>('mon')
  const [schedulePeriod, setSchedulePeriod] = useState<Period>('morning')
  const dragX = useRef(new Animated.Value(0)).current
  const isAnimatingRef = useRef(false)

  const weekStartISO = useMemo(() => {
    const currentWeekStart = getWeekRange(today()).start
    return addDays(currentWeekStart, weekOffset * 7)
  }, [weekOffset])

  const selectedDateISO = useMemo(() => {
    const dayIndex = DAYS_ORDER.indexOf(selectedDay)
    return addDays(weekStartISO, dayIndex < 0 ? 0 : dayIndex)
  }, [selectedDay, weekStartISO])

  const [form, setForm] = useState<{
    title: string
    description: string
    priority: CardPriority | null
    status: CardStatus
    day: Day
    period: Period
    hasDate: boolean
    date: string
    time: string
    checklist: ChecklistItem[]
  }>({
    title: '',
    description: '',
    priority: null,
    status: 'todo',
    day: todayDay,
    period: 'morning',
    hasDate: true,
    date: selectedDateISO,
    time: '',
    checklist: [],
  })

  const cardsByPeriod = useMemo(() => {
    return PERIODS_ORDER.reduce((acc, period) => {
      acc[period] = store.cards.filter(
        c => c.location.day === selectedDay && c.location.period === period,
      )
      return acc
    }, {} as Record<Period, Card[]>)
  }, [selectedDay, store.cards])

  // Count cards per day for the week strip badges
  const cardCountByDay = useMemo(() =>
    DAYS_ORDER.reduce((acc, day) => {
      acc[day] = store.cards.filter(c => c.location.day === day && c.status !== 'done').length
      return acc
    }, {} as Record<Day, number>),
  [store.cards])

  // Backlog
  const backlogCards = useMemo(() => store.cards.filter(c => !c.location.day), [store.cards])
  const backlogFiltered = useMemo(() =>
    backlogCards.filter(c => backlogStatusFilter === 'all' || c.status === backlogStatusFilter),
  [backlogCards, backlogStatusFilter])

  function openBacklogAdd() {
    setBacklogEditCard(null)
    setBacklogForm({ title: '', priority: null, status: 'todo' })
    setBacklogSheetOpen(true)
  }

  function openBacklogEdit(card: Card) {
    setBacklogEditCard(card)
    setBacklogForm({ title: card.title, priority: card.priority, status: card.status })
    setBacklogSheetOpen(true)
  }

  function saveBacklog() {
    if (!backlogForm.title.trim()) return
    if (backlogEditCard) {
      updateCard(backlogEditCard.id, { title: backlogForm.title, priority: backlogForm.priority, status: backlogForm.status })
    } else {
      addCard({ title: backlogForm.title, priority: backlogForm.priority, status: backlogForm.status, location: { day: null, period: null } })
    }
    setBacklogSheetOpen(false)
  }

  function openSchedule(card: Card) {
    setScheduleCard(card)
    setScheduleDay(todayDay)
    setSchedulePeriod('morning')
  }

  function confirmSchedule() {
    if (!scheduleCard) return
    updateCard(scheduleCard.id, { location: { day: scheduleDay, period: schedulePeriod } })
    setScheduleCard(null)
  }

  function cycleBacklogStatus(card: Card) {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(card.status) + 1) % STATUS_ORDER.length]
    updateCard(card.id, { status: next })
  }

  const travelDistance = Math.max(240, viewportWidth * 0.92)
  const swipeThreshold = Math.max(58, viewportWidth * 0.17)

  const selectedDateShort = useMemo(() => formatDateShort(selectedDateISO), [selectedDateISO])

  const getAdjacentDay = useCallback((baseDay: Day, direction: 'next' | 'prev'): Day => {
    const index = DAYS_ORDER.indexOf(baseDay)
    if (index < 0) return baseDay
    if (direction === 'next') return DAYS_ORDER[(index + 1) % DAYS_ORDER.length]
    return DAYS_ORDER[(index - 1 + DAYS_ORDER.length) % DAYS_ORDER.length]
  }, [])

  const snapBack = useCallback(() => {
    Animated.spring(dragX, {
      toValue: 0,
      damping: 18,
      stiffness: 240,
      mass: 0.8,
      useNativeDriver: true,
    }).start()
  }, [dragX])

  const runDayTransition = useCallback((nextDay: Day, direction: 'next' | 'prev', fromDrag = false) => {
    if (nextDay === selectedDay || isAnimatingRef.current) {
      if (fromDrag) snapBack()
      return
    }

    isAnimatingRef.current = true
    const exitX = direction === 'next' ? -travelDistance : travelDistance
    const enterX = -exitX

    Animated.timing(dragX, {
      toValue: exitX,
      duration: fromDrag ? 120 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setSelectedDay(nextDay)
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
  }, [dragX, selectedDay, snapBack, travelDistance])

  const shiftSelectedDay = useCallback((direction: 'next' | 'prev', fromDrag = false) => {
    const currentIndex = DAYS_ORDER.indexOf(selectedDay)
    if (currentIndex < 0) return

    if (direction === 'next' && currentIndex === DAYS_ORDER.length - 1) {
      setWeekOffset(prev => prev + 1)
    } else if (direction === 'prev' && currentIndex === 0) {
      setWeekOffset(prev => prev - 1)
    }

    runDayTransition(getAdjacentDay(selectedDay, direction), direction, fromDrag)
  }, [getAdjacentDay, runDayTransition, selectedDay])

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
          shiftSelectedDay('next', true)
        } else {
          shiftSelectedDay('prev', true)
        }
      },
      onPanResponderTerminate: () => {
        snapBack()
      },
    })
  }, [dragX, shiftSelectedDay, snapBack, swipeThreshold, travelDistance])

  const contentOpacity = dragX.interpolate({
    inputRange: [-travelDistance, 0, travelDistance],
    outputRange: [0.82, 1, 0.82],
    extrapolate: 'clamp',
  })

  const contentScale = dragX.interpolate({
    inputRange: [-travelDistance, 0, travelDistance],
    outputRange: [0.985, 1, 0.985],
    extrapolate: 'clamp',
  })

  const selectedDayCount = useMemo(
    () => store.cards.filter(c => c.location.day === selectedDay).length,
    [selectedDay, store.cards],
  )

  const goToToday = useCallback(() => {
    setWeekOffset(0)
    setSelectedDay(todayDay)
    dragX.setValue(0)
  }, [dragX, todayDay])

  function openAdd() {
    setEditCard(null)
    setNewChecklistText('')
    setForm({
      title: '',
      description: '',
      priority: null,
      status: 'todo',
      day: selectedDay,
      period: 'morning',
      hasDate: true,
      date: selectedDateISO,
      time: '',
      checklist: [],
    })
    setSheetOpen(true)
  }

  function openEdit(card: Card) {
    setEditCard(card)
    setNewChecklistText('')
    setForm({
      title: card.title,
      description: htmlToPlainText(card.descriptionHtml),
      priority: card.priority,
      status: card.status,
      day: card.location.day ?? selectedDay,
      period: card.location.period ?? 'morning',
      hasDate: card.hasDate,
      date: card.date ?? selectedDateISO,
      time: card.time ?? '',
      checklist: (card.checklist ?? []).map(item => ({ ...item })),
    })
    setSheetOpen(true)
  }

  function addChecklistItem() {
    const text = newChecklistText.trim()
    if (!text) return
    setForm(prev => ({
      ...prev,
      checklist: [...prev.checklist, { id: uid(), text, done: false }],
    }))
    setNewChecklistText('')
  }

  function toggleChecklistItem(itemId: string) {
    setForm(prev => ({
      ...prev,
      checklist: prev.checklist.map(item =>
        item.id === itemId ? { ...item, done: !item.done } : item,
      ),
    }))
  }

  function removeChecklistItem(itemId: string) {
    setForm(prev => ({
      ...prev,
      checklist: prev.checklist.filter(item => item.id !== itemId),
    }))
  }

  function handleSave() {
    const trimmedTitle = form.title.trim()
    if (!trimmedTitle) return

    let nextCalendarEventId = editCard?.calendarEventId ?? null
    const hasValidDate = form.hasDate && !!form.date

    if (hasValidDate) {
      const existingEvent = nextCalendarEventId
        ? store.calendarEvents.find(event => event.id === nextCalendarEventId)
        : null

      const eventPayload = {
        title: trimmedTitle,
        date: form.date,
        time: form.time.trim() || null,
        description: form.description.trim(),
        color: PERIOD_CONFIG[form.period].color,
      }

      if (existingEvent) {
        updateEvent(existingEvent.id, eventPayload)
      } else {
        const createdEvent = addEvent(eventPayload)
        nextCalendarEventId = createdEvent.id
      }
    } else if (nextCalendarEventId) {
      deleteEvent(nextCalendarEventId)
      nextCalendarEventId = null
    }

    const cardPayload = {
      title: trimmedTitle,
      descriptionHtml: plainTextToHtml(form.description),
      priority: form.priority,
      status: form.status,
      location: { day: form.day, period: form.period },
      hasDate: hasValidDate,
      date: hasValidDate ? form.date : null,
      time: hasValidDate ? (form.time.trim() || null) : null,
      checklist: form.checklist,
      calendarEventId: nextCalendarEventId,
    }

    if (editCard) {
      updateCard(editCard.id, cardPayload)
    } else {
      addCard(cardPayload)
    }

    setSheetOpen(false)
  }

  function cycleStatus(card: Card) {
    const next = STATUS_ORDER[(STATUS_ORDER.indexOf(card.status) + 1) % STATUS_ORDER.length]
    updateCard(card.id, { status: next })
  }

  function renderCardRow(card: Card) {
    const statusIcon = STATUS_ICONS[card.status]
    const isDone = card.status === 'done'
    const checklistDone = card.checklist.filter(item => item.done).length
    const checklistTotal = card.checklist.length

    return (
      <TouchableOpacity
        key={card.id}
        style={[styles.cardRow, { borderBottomColor: theme.text + '08' }]}
        onPress={() => openEdit(card)}
        activeOpacity={0.65}
      >
        <TouchableOpacity
          onPress={() => cycleStatus(card)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.statusWrap}
        >
          {statusIcon ? (
            <Feather name={statusIcon as any} size={14} color={STATUS_COLORS[card.status]} />
          ) : (
            <View style={[styles.statusCircle, { borderColor: STATUS_COLORS[card.status] }]} />
          )}
        </TouchableOpacity>

        <View style={styles.cardTextWrap}>
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

          {(card.hasDate || checklistTotal > 0) && (
            <View style={styles.cardMetaRow}>
              {card.hasDate && card.date && (
                <Text style={[styles.cardMetaText, { color: theme.text + '5e' }]}>
                  {formatDateShort(card.date)}{card.time ? ` ${card.time}` : ''}
                </Text>
              )}
              {checklistTotal > 0 && (
                <Text style={[styles.cardMetaText, { color: theme.text + '5e' }]}>
                  {checklistDone}/{checklistTotal} checklist
                </Text>
              )}
            </View>
          )}
        </View>

        {card.priority && (
          <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[card.priority] }]} />
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <Header title="Planejador" />

      {/* Week strip */}
      <View style={[styles.weekStrip, { backgroundColor: theme.surface, borderBottomColor: theme.text + '10' }]}>
        {DAYS_ORDER.map(day => {
          const isToday   = day === getDayOfWeek(today())
          const isSelected = day === selectedDay
          const count     = cardCountByDay[day]
          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.weekDay,
                isSelected && { backgroundColor: theme.primary + '1a', borderRadius: 8 },
              ]}
              onPress={() => {
                if (day !== selectedDay) runDayTransition(day, DAYS_ORDER.indexOf(day) > DAYS_ORDER.indexOf(selectedDay) ? 'next' : 'prev')
              }}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.weekDayLabel,
                { color: isSelected ? theme.primary : isToday ? theme.primary + 'aa' : theme.text + '70' },
                isSelected && { fontWeight: '700' },
              ]}>
                {DAY_LABELS[day]}
              </Text>
              {count > 0 ? (
                <View style={[styles.weekDayBadge, { backgroundColor: isSelected ? theme.primary : theme.text + '22' }]}>
                  <Text style={[styles.weekDayBadgeText, { color: isSelected ? '#fff' : theme.text + '90' }]}>
                    {count}
                  </Text>
                </View>
              ) : (
                isToday ? (
                  <View style={[styles.weekDayDot, { backgroundColor: theme.primary + '70' }]} />
                ) : (
                  <View style={styles.weekDayDot} />
                )
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      <Animated.View
        style={[
          styles.swipeArea,
          { opacity: contentOpacity, transform: [{ translateX: dragX }, { scale: contentScale }] },
        ]}
        {...swipeResponder.panHandlers}
      >
        {/* Selected day info bar */}
        <View style={[styles.selectedDayBar, { backgroundColor: theme.surface, borderColor: theme.text + '12' }]}>
          <TouchableOpacity
            style={[styles.dayNavBtn, { backgroundColor: theme.text + '0a' }]}
            onPress={() => shiftSelectedDay('prev')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="chevron-left" size={17} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.selectedDayCenter}>
            <Text style={[styles.selectedDayLine, { color: theme.text }]} numberOfLines={1}>
              {DAY_LABELS_FULL[selectedDay]} {selectedDateShort} • {selectedDayCount} tarefa{selectedDayCount === 1 ? '' : 's'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.dayNavBtn, { backgroundColor: theme.text + '0a' }]}
            onPress={() => shiftSelectedDay('next')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="chevron-right" size={17} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionsContainer}>
          {PERIODS_ORDER.map((period, idx) => {
            const cfg = PERIOD_CONFIG[period]
            const cards = cardsByPeriod[period]

            return (
              <View
                key={period}
                style={[
                  styles.periodSection,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.text + '12',
                    borderBottomWidth: idx === PERIODS_ORDER.length - 1 ? 1 : 0,
                  },
                ]}
              >
                <View
                  style={[
                    styles.periodHeader,
                    { backgroundColor: cfg.bg, borderBottomColor: cfg.color + '44' },
                  ]}
                >
                  <View style={[styles.periodIconWrap, { backgroundColor: cfg.color + '20' }]}>
                    <Feather name={cfg.icon as any} size={14} color={cfg.color} />
                  </View>
                  <Text style={[styles.periodLabel, { color: cfg.textColor }]}>
                    {PERIOD_LABELS[period]}
                  </Text>
                  <Text style={[styles.periodCount, { color: cfg.color + 'c4' }]}>
                    {cards.length}
                  </Text>
                </View>

                <ScrollView
                  style={styles.periodCardsScroll}
                  contentContainerStyle={styles.periodCardsContent}
                  showsVerticalScrollIndicator={false}
                >
                  {cards.map(renderCardRow)}
                  {cards.length === 0 && (
                    <View style={styles.emptyState}>
                      <Text style={[styles.emptyText, { color: theme.text + '42' }]}>Sem tarefas</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )
          })}
        </View>
      </Animated.View>
      <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.text + '12' }]}>
        <View style={styles.footerSide}>
          <TouchableOpacity
            style={[styles.todayBtn, { backgroundColor: theme.text + '0a', borderColor: theme.text + '12' }]}
            onPress={goToToday}
          >
            <Feather name="calendar" size={15} color={theme.text + '85'} />
            <Text style={[styles.todayBtnText, { color: theme.text + '85' }]}>Hoje</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.footerAddBtn, { backgroundColor: theme.primary }]}
          onPress={openAdd}
          activeOpacity={0.9}
        >
          <Feather name="plus" size={21} color="#fff" />
        </TouchableOpacity>

        <View style={[styles.footerSide, { alignItems: 'flex-end' }]}>
          <TouchableOpacity
            style={[styles.todayBtn, { backgroundColor: backlogCards.length > 0 ? '#8b5cf615' : theme.text + '0a', borderColor: backlogCards.length > 0 ? '#8b5cf630' : theme.text + '12' }]}
            onPress={() => setBacklogOpen(true)}
          >
            <Feather name="inbox" size={15} color={backlogCards.length > 0 ? '#8b5cf6' : theme.text + '85'} />
            <Text style={[styles.todayBtnText, { color: backlogCards.length > 0 ? '#8b5cf6' : theme.text + '85' }]}>
              {backlogCards.length > 0 ? String(backlogCards.length) : 'Backlog'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Backlog main sheet ── */}
      <BottomSheet visible={backlogOpen} onClose={() => setBacklogOpen(false)} title={`Backlog (${backlogCards.length})`} maxHeight="88%">
        {/* Status filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, maxHeight: 44 }} contentContainerStyle={{ paddingHorizontal: 2, paddingVertical: 4, gap: 7, flexDirection: 'row', alignItems: 'center' }}>
          {(['all', ...STATUS_ORDER] as (CardStatus | 'all')[]).map(s => {
            const active = backlogStatusFilter === s
            const color  = s === 'all' ? theme.primary : STATUS_COLORS[s]
            return (
              <TouchableOpacity
                key={s}
                style={[styles.blChip, active ? { backgroundColor: color } : { backgroundColor: theme.text + '08', borderColor: theme.text + '15' }]}
                onPress={() => setBacklogStatusFilter(s)}
              >
                {s !== 'all' && <View style={[styles.blDot, { backgroundColor: active ? '#fff' : STATUS_COLORS[s] }]} />}
                <Text style={[styles.blChipText, { color: active ? '#fff' : theme.text + '80' }]}>
                  {s === 'all' ? 'Todos' : statusLabel(s)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* Cards list */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
          {backlogFiltered.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 32 }}>
              <Feather name="inbox" size={38} color={theme.text + '20'} />
              <Text style={{ color: theme.text + '40', fontSize: 14, marginTop: 10 }}>Backlog vazio</Text>
            </View>
          )}
          {backlogFiltered.map(card => (
            <View key={card.id} style={[styles.blCard, { backgroundColor: theme.background }]}>
              <TouchableOpacity
                style={[styles.blStatusDot, { backgroundColor: STATUS_COLORS[card.status] }]}
                onPress={() => cycleBacklogStatus(card)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              />
              <TouchableOpacity style={{ flex: 1 }} onPress={() => openBacklogEdit(card)}>
                <Text style={[styles.blCardTitle, { color: theme.text }]} numberOfLines={2}>{card.title}</Text>
                {card.priority && (
                  <View style={[styles.blPriBadge, { backgroundColor: PRIORITY_COLORS[card.priority] + '18' }]}>
                    <Text style={[styles.blPriText, { color: PRIORITY_COLORS[card.priority] }]}>{card.priority}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.blScheduleBtn, { backgroundColor: theme.primary + '15' }]}
                onPress={() => openSchedule(card)}
              >
                <Feather name="calendar" size={14} color={theme.primary} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ height: 16 }} />
        </ScrollView>

        <TouchableOpacity
          style={[styles.blAddBtn, { backgroundColor: theme.primary }]}
          onPress={() => { setBacklogOpen(false); setTimeout(openBacklogAdd, 300) }}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Nova tarefa no backlog</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* ── Backlog edit/create sheet ── */}
      <BottomSheet visible={backlogSheetOpen} onClose={() => setBacklogSheetOpen(false)} title={backlogEditCard ? 'Editar card' : 'Novo card'}>
        <FormInput
          label="Título"
          value={backlogForm.title}
          onChangeText={t => setBacklogForm(f => ({ ...f, title: t }))}
          placeholder="O que precisa ser feito?"
          autoFocus
        />
        <Text style={[styles.sheetSectionLabel, { color: theme.text + '70' }]}>STATUS</Text>
        <View style={styles.chipRow}>
          {STATUS_ORDER.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.sheetChip, backlogForm.status === s ? { backgroundColor: STATUS_COLORS[s] + '28', borderColor: STATUS_COLORS[s], borderWidth: 1 } : { backgroundColor: theme.text + '08', borderColor: 'transparent', borderWidth: 1 }]}
              onPress={() => setBacklogForm(f => ({ ...f, status: s }))}
            >
              <View style={[styles.blDot, { backgroundColor: STATUS_COLORS[s] }]} />
              <Text style={[styles.blChipText, { color: theme.text }]}>{statusLabel(s)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.sheetSectionLabel, { color: theme.text + '70', marginTop: 14 }]}>PRIORIDADE</Text>
        <View style={styles.chipRow}>
          {(['P1', 'P2', 'P3', 'P4'] as CardPriority[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.sheetChip, backlogForm.priority === p ? { backgroundColor: PRIORITY_COLORS[p] + '28', borderColor: PRIORITY_COLORS[p], borderWidth: 1 } : { backgroundColor: theme.text + '08', borderColor: 'transparent', borderWidth: 1 }]}
              onPress={() => setBacklogForm(f => ({ ...f, priority: f.priority === p ? null : p }))}
            >
              <Text style={[styles.blChipText, { color: PRIORITY_COLORS[p], fontWeight: '700' }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.sheetActions, { marginTop: 22 }]}>
          {backlogEditCard && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#ef444415', flex: 1 }]}
              onPress={() => { deleteCard(backlogEditCard.id); setBacklogSheetOpen(false) }}
            >
              <Text style={{ color: '#ef4444', fontWeight: '600' }}>Excluir</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.primary, flex: backlogEditCard ? 2 : 1 }]}
            onPress={saveBacklog}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Salvar</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>

      {/* ── Schedule sheet ── */}
      <BottomSheet visible={!!scheduleCard} onClose={() => setScheduleCard(null)} title={`Agendar: ${scheduleCard?.title?.slice(0, 30) ?? ''}`}>
        <Text style={[styles.sheetSectionLabel, { color: theme.text + '70' }]}>DIA DA SEMANA</Text>
        <View style={styles.chipRow}>
          {DAYS_ORDER.map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.sheetChip, scheduleDay === d ? { backgroundColor: theme.primary, borderColor: theme.primary, borderWidth: 1 } : { backgroundColor: theme.text + '08', borderColor: 'transparent', borderWidth: 1 }]}
              onPress={() => setScheduleDay(d)}
            >
              <Text style={[styles.blChipText, { color: scheduleDay === d ? '#fff' : theme.text }]}>{DAY_LABELS[d]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.sheetSectionLabel, { color: theme.text + '70', marginTop: 14 }]}>PERÍODO</Text>
        <View style={styles.chipRow}>
          {PERIODS_ORDER.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.sheetChip, schedulePeriod === p ? { backgroundColor: theme.primary, borderColor: theme.primary, borderWidth: 1 } : { backgroundColor: theme.text + '08', borderColor: 'transparent', borderWidth: 1 }]}
              onPress={() => setSchedulePeriod(p)}
            >
              <Text style={[styles.blChipText, { color: schedulePeriod === p ? '#fff' : theme.text }]}>{PERIOD_LABELS[p]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.primary, marginTop: 22 }]}
          onPress={confirmSchedule}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>
            Agendar para {DAY_LABELS_FULL[scheduleDay]} — {PERIOD_LABELS[schedulePeriod]}
          </Text>
        </TouchableOpacity>
      </BottomSheet>

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editCard ? 'Editar tarefa' : 'Nova tarefa'}
        maxHeight="96%"
      >
        <FormInput
          label="Titulo"
          value={form.title}
          onChangeText={text => setForm(prev => ({ ...prev, title: text }))}
          placeholder="O que precisa ser feito?"
          autoFocus
        />

        <FormInput
          label="Descricao"
          value={form.description}
          onChangeText={text => setForm(prev => ({ ...prev, description: text }))}
          placeholder="Detalhes da tarefa"
          multiline
          numberOfLines={5}
          style={styles.descriptionInput}
        />

        <Text style={[styles.sheetSectionLabel, { color: theme.text + '70' }]}>DIA</Text>
        <View style={styles.chipRow}>
          {DAYS_ORDER.map(day => {
            const active = form.day === day
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.sheetChip,
                  active
                    ? { backgroundColor: theme.primary + '24', borderColor: theme.primary }
                    : { backgroundColor: theme.text + '08', borderColor: 'transparent' },
                ]}
                onPress={() => setForm(prev => ({ ...prev, day }))}
              >
                <Text style={[styles.chipLabel, { color: active ? theme.primary : theme.text + '85' }]}>
                  {DAY_LABELS_FULL[day]}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={[styles.sheetSectionLabel, { color: theme.text + '70', marginTop: 14 }]}>PERIODO</Text>
        <View style={styles.chipRow}>
          {PERIODS_ORDER.map(period => {
            const active = form.period === period
            const cfg = PERIOD_CONFIG[period]
            return (
              <TouchableOpacity
                key={period}
                style={[
                  styles.sheetChip,
                  active
                    ? { backgroundColor: cfg.color + '26', borderColor: cfg.color }
                    : { backgroundColor: theme.text + '08', borderColor: 'transparent' },
                ]}
                onPress={() => setForm(prev => ({ ...prev, period }))}
              >
                <Feather name={cfg.icon as any} size={12} color={cfg.color} />
                <Text style={[styles.chipLabel, { color: active ? cfg.color : theme.text + '85' }]}>
                  {PERIOD_LABELS[period]}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={[styles.sheetSectionLabel, { color: theme.text + '70', marginTop: 14 }]}>DATA ESPECIFICA</Text>
        <TouchableOpacity
          style={[styles.toggleRow, { borderColor: theme.text + '18', backgroundColor: theme.text + '06' }]}
          onPress={() => setForm(prev => ({
            ...prev,
            hasDate: !prev.hasDate,
            date: !prev.hasDate ? (prev.date || selectedDateISO) : prev.date,
            time: !prev.hasDate ? prev.time : '',
          }))}
        >
          <Feather
            name={form.hasDate ? 'check-square' : 'square'}
            size={16}
            color={form.hasDate ? theme.primary : theme.text + '70'}
          />
          <Text style={[styles.toggleLabel, { color: theme.text + 'd0' }]}>Vincular com calendario</Text>
        </TouchableOpacity>

        {form.hasDate && (
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeCol}>
              <FormInput
                label="Data (YYYY-MM-DD)"
                value={form.date}
                onChangeText={text => setForm(prev => ({ ...prev, date: text }))}
                placeholder="2026-02-28"
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.dateTimeCol}>
              <FormInput
                label="Hora (HH:MM)"
                value={form.time}
                onChangeText={text => setForm(prev => ({ ...prev, time: text }))}
                placeholder="14:00"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
        )}

        <Text style={[styles.sheetSectionLabel, { color: theme.text + '70', marginTop: 4 }]}>STATUS</Text>
        <View style={styles.chipRow}>
          {STATUS_ORDER.map(status => {
            const active = form.status === status
            const icon = STATUS_ICONS[status]
            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.sheetChip,
                  active
                    ? { backgroundColor: STATUS_COLORS[status] + '28', borderColor: STATUS_COLORS[status] }
                    : { backgroundColor: theme.text + '08', borderColor: 'transparent' },
                ]}
                onPress={() => setForm(prev => ({ ...prev, status }))}
              >
                {icon ? (
                  <Feather name={icon as any} size={11} color={STATUS_COLORS[status]} />
                ) : (
                  <View style={[styles.smallDot, { borderColor: STATUS_COLORS[status] }]} />
                )}
                <Text style={[styles.chipLabel, { color: active ? theme.text : theme.text + '80' }]}>
                  {statusLabel(status)}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={[styles.sheetSectionLabel, { color: theme.text + '70', marginTop: 14 }]}>PRIORIDADE</Text>
        <View style={styles.chipRow}>
          {(['P1', 'P2', 'P3', 'P4'] as CardPriority[]).map(priority => {
            const active = form.priority === priority
            return (
              <TouchableOpacity
                key={priority}
                style={[
                  styles.sheetChip,
                  active
                    ? { backgroundColor: PRIORITY_COLORS[priority] + '28', borderColor: PRIORITY_COLORS[priority] }
                    : { backgroundColor: theme.text + '08', borderColor: 'transparent' },
                ]}
                onPress={() => setForm(prev => ({ ...prev, priority: prev.priority === priority ? null : priority }))}
              >
                <View style={[styles.smallDot, { backgroundColor: PRIORITY_COLORS[priority], borderColor: 'transparent' }]} />
                <Text style={[styles.chipLabel, { color: PRIORITY_COLORS[priority], fontWeight: '700' }]}>{priority}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={[styles.sheetSectionLabel, { color: theme.text + '70', marginTop: 14 }]}>CHECKLIST</Text>
        <View style={[styles.checklistBox, { borderColor: theme.text + '18', backgroundColor: theme.text + '05' }]}> 
          {form.checklist.map(item => (
            <View key={item.id} style={[styles.checklistRow, { borderBottomColor: theme.text + '10' }]}> 
              <TouchableOpacity onPress={() => toggleChecklistItem(item.id)} style={styles.checklistToggle}>
                <Feather
                  name={item.done ? 'check-square' : 'square'}
                  size={16}
                  color={item.done ? theme.primary : theme.text + '65'}
                />
              </TouchableOpacity>
              <Text
                style={[
                  styles.checklistText,
                  { color: theme.text + 'd0' },
                  item.done && { textDecorationLine: 'line-through', opacity: 0.55 },
                ]}
                numberOfLines={2}
              >
                {item.text}
              </Text>
              <TouchableOpacity onPress={() => removeChecklistItem(item.id)}>
                <Feather name="x" size={16} color={theme.text + '70'} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.checklistAddRow}>
            <View style={styles.checklistAddInputWrap}>
              <FormInput
                value={newChecklistText}
                onChangeText={setNewChecklistText}
                placeholder="Adicionar item..."
                style={styles.checklistInput}
              />
            </View>
            <TouchableOpacity
              style={[styles.checklistAddBtn, { backgroundColor: theme.primary, opacity: newChecklistText.trim() ? 1 : 0.55 }]}
              onPress={addChecklistItem}
              disabled={!newChecklistText.trim()}
            >
              <Feather name="plus" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.sheetActions, { marginTop: 22 }]}> 
          {editCard && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#ef444415', flex: 1 }]}
              onPress={() => {
                if (editCard.calendarEventId) {
                  deleteEvent(editCard.calendarEventId)
                }
                deleteCard(editCard.id)
                setSheetOpen(false)
              }}
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

        <View style={{ height: 24 }} />
      </BottomSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  weekStrip: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 2,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    gap: 4,
  },
  weekDayLabel:  { fontSize: 11.5, fontWeight: '600' },
  weekDayBadge:  { minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  weekDayBadgeText: { fontSize: 10, fontWeight: '700' },
  weekDayDot:    { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent' },

  swipeArea: { flex: 1 },
  selectedDayBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginTop: 6,
    marginBottom: 7,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  dayNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDayCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  selectedDayLine: { fontSize: 13, fontWeight: '600' },

  sectionsContainer: { flex: 1, paddingHorizontal: 10, paddingBottom: 8, gap: 10 },
  periodSection: { flex: 1, borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    gap: 8,
  },
  periodIconWrap: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  periodLabel: { flex: 1, fontSize: 12, fontWeight: '700' },
  periodCount: { fontSize: 12, fontWeight: '700' },
  periodCardsScroll: { flex: 1 },
  periodCardsContent: { paddingVertical: 2 },

  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 9,
  },
  statusWrap: { width: 18, alignItems: 'center', flexShrink: 0 },
  statusCircle: { width: 13, height: 13, borderRadius: 7, borderWidth: 1.5 },
  cardTextWrap: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  cardMetaRow: { flexDirection: 'row', gap: 8, marginTop: 3 },
  cardMetaText: { fontSize: 11.5, fontWeight: '500' },
  priorityDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },

  emptyState: { paddingHorizontal: 12, paddingVertical: 12 },
  emptyText: { fontSize: 12.5, fontWeight: '500' },

  footer: {
    height: 66,
    borderTopWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerSide: { width: 104, alignItems: 'flex-start' },
  todayBtn: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  todayBtnText: { fontSize: 13, fontWeight: '600' },
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

  descriptionInput: { minHeight: 110, textAlignVertical: 'top' },
  sheetSectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  sheetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  smallDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5 },
  chipLabel: { fontSize: 12, fontWeight: '600' },

  toggleRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  toggleLabel: { fontSize: 13, fontWeight: '500' },
  dateTimeRow: { flexDirection: 'row', gap: 10 },
  dateTimeCol: { flex: 1 },

  checklistBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  checklistToggle: { width: 20, alignItems: 'center' },
  checklistText: { flex: 1, fontSize: 13, lineHeight: 18 },
  checklistAddRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  checklistAddInputWrap: { flex: 1 },
  checklistInput: { marginBottom: -4 },
  checklistAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  sheetActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Backlog
  blChip:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 5, borderWidth: 1 },
  blDot:        { width: 8, height: 8, borderRadius: 4 },
  blChipText:   { fontSize: 12, fontWeight: '600' },
  blCard:       { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 12, gap: 10 },
  blStatusDot:  { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  blCardTitle:  { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  blPriBadge:   { marginTop: 3, alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  blPriText:    { fontSize: 10.5, fontWeight: '700' },
  blScheduleBtn: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  blAddBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 10 },
})

