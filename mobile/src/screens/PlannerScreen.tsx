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
  DAY_LABELS_FULL,
  PERIODS_ORDER,
  PERIOD_LABELS,
  STATUS_COLORS,
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

      <View style={[styles.selectedDayBar, { backgroundColor: theme.surface, borderColor: theme.text + '12' }]}>
        <TouchableOpacity
          style={[styles.dayNavBtn, { backgroundColor: theme.text + '0a' }]}
          onPress={() => shiftSelectedDay('prev')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="chevron-left" size={18} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.selectedDayCenter}>
          <Text style={[styles.selectedDayTitle, { color: theme.text }]}> 
            {DAY_LABELS_FULL[selectedDay]}
          </Text>
          <Text style={[styles.selectedDaySub, { color: theme.text + '60' }]}> 
            {selectedDateShort} - {selectedDayCount} tarefa{selectedDayCount === 1 ? '' : 's'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.dayNavBtn, { backgroundColor: theme.text + '0a' }]}
          onPress={() => shiftSelectedDay('next')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="chevron-right" size={18} color={theme.text} />
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[
          styles.sectionsContainer,
          { opacity: contentOpacity, transform: [{ translateX: dragX }, { scale: contentScale }] },
        ]}
        {...swipeResponder.panHandlers}
      >
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
      </Animated.View>

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
          onPress={openAdd}
          activeOpacity={0.9}
        >
          <Feather name="plus" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.footerSide} />
      </View>

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
                  {status.replace('_', ' ')}
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

  selectedDayBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  dayNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDayCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  selectedDayTitle: { fontSize: 15, fontWeight: '700' },
  selectedDaySub: { fontSize: 12, marginTop: 1 },

  sectionsContainer: { flex: 1, paddingHorizontal: 12, paddingBottom: 12, gap: 10 },
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
})
