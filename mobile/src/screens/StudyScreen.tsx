import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  PanResponder,
  Animated,
  Easing,
  useWindowDimensions,
  AppState,
  Switch,
  Platform,
} from 'react-native'
import * as Notifications from 'expo-notifications'
import { useNavigation } from '@react-navigation/native'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { EmptyState } from '../components/shared/EmptyState'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { formatDate, formatMinutes, now, today } from '../utils/date'
import { uid } from '../utils/format'
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ORDER,
  type CardPriority,
  type CardStatus,
  type ChecklistItem,
  type StudyFlashcard,
  type StudyGoal,
  type StudyQuickNote,
} from '../types'

type StudyTab = 'dashboard' | 'goals' | 'reports' | 'history' | 'flashcards' | 'notes' | 'config'
type PomodoroPhase = 'focus' | 'break'
type TimerState = 'idle' | 'running' | 'paused'

const TAB_ORDER: StudyTab[] = ['dashboard', 'goals', 'reports', 'history', 'flashcards', 'notes', 'config']
const TAB_LABELS: Record<StudyTab, string> = {
  dashboard: 'Painel',
  goals: 'Metas',
  reports: 'Relatorios',
  history: 'Historico',
  flashcards: 'Flashcards',
  notes: 'Notas',
  config: 'Configuracao',
}
const PHASE_LABELS: Record<PomodoroPhase, string> = { focus: 'Foco', break: 'Intervalo' }
const ACTIVE_NOTIFICATION_ID = 'study-pomodoro-active'
const PHASE_NOTIFICATION_ID = 'study-pomodoro-phase-end'

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hh = Math.floor(safe / 3600)
  const mm = Math.floor((safe % 3600) / 60)
  const ss = safe % 60
  if (hh > 0) return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

function isoFromDate(value: Date): string {
  const y = value.getFullYear()
  const m = String(value.getMonth() + 1).padStart(2, '0')
  const d = String(value.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function normalizeGoal(goal: StudyGoal): StudyGoal {
  return {
    ...goal,
    description: goal.description ?? '',
    priority: goal.priority ?? null,
    checklist: goal.checklist ?? [],
    linkedPlanningCardId: goal.linkedPlanningCardId ?? null,
    updatedAt: goal.updatedAt ?? goal.createdAt,
  }
}

function goalProgress(goal: StudyGoal): number {
  const checklist = goal.checklist ?? []
  if (checklist.length > 0) {
    const done = checklist.filter(item => item.done).length
    return done / checklist.length
  }
  if (goal.status === 'done') return 1
  if (goal.status === 'in_progress') return 0.55
  if (goal.status === 'blocked') return 0.2
  return 0.05
}

export function StudyScreen() {
  const theme = useTheme()
  const navigation = useNavigation<any>()
  const { width: viewportWidth } = useWindowDimensions()
  const {
    store,
    addStudyGoal,
    updateStudyGoal,
    deleteStudyGoal,
    addStudySession,
    updateStudy,
  } = useStore()

  const study = store.study
  const focusMinutes = Math.max(1, study.focusMinutes || 25)
  const breakMinutes = Math.max(1, study.breakMinutes || 5)
  const muteSound = study.muteSound === true
  const notificationsEnabled = study.notificationsEnabled !== false
  const goals = useMemo(() => (study.goals ?? []).map(normalizeGoal), [study.goals])
  const sessions = study.sessions ?? []
  const flashcards = study.flashcards ?? []
  const quickNotes = study.notes ?? []

  const [tab, setTab] = useState<StudyTab>('dashboard')
  const [phase, setPhase] = useState<PomodoroPhase>('focus')
  const [timerState, setTimerState] = useState<TimerState>('idle')
  const [secondsLeft, setSecondsLeft] = useState(focusMinutes * 60)
  const [notificationAllowed, setNotificationAllowed] = useState(false)

  const [goalSheetOpen, setGoalSheetOpen] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [goalTitle, setGoalTitle] = useState('')
  const [goalDescription, setGoalDescription] = useState('')
  const [goalStatus, setGoalStatus] = useState<CardStatus>('todo')
  const [goalPriority, setGoalPriority] = useState<CardPriority | null>(null)
  const [goalChecklist, setGoalChecklist] = useState<ChecklistItem[]>([])
  const [goalChecklistDraft, setGoalChecklistDraft] = useState('')

  const [flashSheetOpen, setFlashSheetOpen] = useState(false)
  const [editingFlashcardId, setEditingFlashcardId] = useState<string | null>(null)
  const [flashQuestion, setFlashQuestion] = useState('')
  const [flashAnswer, setFlashAnswer] = useState('')
  const [expandedFlashcardId, setExpandedFlashcardId] = useState<string | null>(null)

  const [noteSheetOpen, setNoteSheetOpen] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')

  const [focusInput, setFocusInput] = useState(String(focusMinutes))
  const [breakInput, setBreakInput] = useState(String(breakMinutes))
  const [notifyInput, setNotifyInput] = useState(notificationsEnabled)
  const [muteInput, setMuteInput] = useState(muteSound)

  const dragX = useRef(new Animated.Value(0)).current
  const isAnimatingRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const endAtRef = useRef<number | null>(null)
  const phaseTargetSecondsRef = useRef(focusMinutes * 60)
  const lastMinuteBucketRef = useRef<number | null>(null)
  const appStateRef = useRef(AppState.currentState)

  useEffect(() => {
    setFocusInput(String(focusMinutes))
    setBreakInput(String(breakMinutes))
    setNotifyInput(notificationsEnabled)
    setMuteInput(muteSound)
    if (timerState === 'idle') setSecondsLeft(focusMinutes * 60)
  }, [focusMinutes, breakMinutes, notificationsEnabled, muteSound, timerState])

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: !muteSound,
        shouldSetBadge: false,
      }),
    })

    const setupNotifications = async () => {
      try {
        const current = await Notifications.getPermissionsAsync()
        let granted = current.granted
        if (!granted) {
          const asked = await Notifications.requestPermissionsAsync()
          granted = asked.granted
        }
        setNotificationAllowed(granted)

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 240, 120, 240],
          })
        }
      } catch {
        setNotificationAllowed(false)
      }
    }

    void setupNotifications()
  }, [muteSound])

  const clearTicker = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const cancelPomodoroNotifications = useCallback(async () => {
    try { await Notifications.dismissNotificationAsync(ACTIVE_NOTIFICATION_ID) } catch { /* no-op */ }
    try { await Notifications.cancelScheduledNotificationAsync(ACTIVE_NOTIFICATION_ID) } catch { /* no-op */ }
    try { await Notifications.dismissNotificationAsync(PHASE_NOTIFICATION_ID) } catch { /* no-op */ }
    try { await Notifications.cancelScheduledNotificationAsync(PHASE_NOTIFICATION_ID) } catch { /* no-op */ }
  }, [])

  const scheduleActiveNotification = useCallback(async (nextPhase: PomodoroPhase, remainingSeconds: number) => {
    if (!notificationAllowed || !notificationsEnabled) return
    try { await Notifications.dismissNotificationAsync(ACTIVE_NOTIFICATION_ID) } catch { /* no-op */ }
    try { await Notifications.cancelScheduledNotificationAsync(ACTIVE_NOTIFICATION_ID) } catch { /* no-op */ }

    await Notifications.scheduleNotificationAsync({
      identifier: ACTIVE_NOTIFICATION_ID,
      content: {
        title: 'Pomodoro ativo',
        body: `${PHASE_LABELS[nextPhase]} em andamento • ${formatClock(remainingSeconds)}`,
        color: '#6366f1',
        sticky: true,
        autoDismiss: false,
        sound: false,
        priority: 'max',
      },
      trigger: null,
    })
  }, [notificationAllowed, notificationsEnabled])

  const schedulePhaseEndNotification = useCallback(async (nextPhase: PomodoroPhase, remainingSeconds: number) => {
    if (!notificationAllowed || !notificationsEnabled) return
    try { await Notifications.dismissNotificationAsync(PHASE_NOTIFICATION_ID) } catch { /* no-op */ }
    try { await Notifications.cancelScheduledNotificationAsync(PHASE_NOTIFICATION_ID) } catch { /* no-op */ }

    const title = nextPhase === 'focus' ? 'Foco concluido' : 'Intervalo concluido'
    const body = nextPhase === 'focus'
      ? 'Sessao finalizada. Continue para intervalo.'
      : 'Intervalo finalizado. Hora de focar.'

    await Notifications.scheduleNotificationAsync({
      identifier: PHASE_NOTIFICATION_ID,
      content: { title, body, sound: !muteSound, priority: 'high' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, remainingSeconds),
      },
    })
  }, [notificationAllowed, notificationsEnabled, muteSound])

  const applyPhase = useCallback((nextPhase: PomodoroPhase, shouldRun: boolean, initialSeconds?: number) => {
    const targetSeconds = Math.max(1, initialSeconds ?? (nextPhase === 'focus' ? focusMinutes * 60 : breakMinutes * 60))
    phaseTargetSecondsRef.current = targetSeconds
    setPhase(nextPhase)
    setSecondsLeft(targetSeconds)
    lastMinuteBucketRef.current = null

    if (shouldRun) {
      endAtRef.current = Date.now() + (targetSeconds * 1000)
      setTimerState('running')
      void scheduleActiveNotification(nextPhase, targetSeconds)
      void schedulePhaseEndNotification(nextPhase, targetSeconds)
    } else {
      endAtRef.current = null
      setTimerState('idle')
      void cancelPomodoroNotifications()
    }
  }, [focusMinutes, breakMinutes, cancelPomodoroNotifications, scheduleActiveNotification, schedulePhaseEndNotification])

  const stopTimer = useCallback(() => {
    clearTicker()
    applyPhase('focus', false, focusMinutes * 60)
  }, [applyPhase, clearTicker, focusMinutes])

  const pauseTimer = useCallback(() => {
    if (timerState !== 'running') return
    const endAt = endAtRef.current
    const remain = endAt ? Math.max(0, Math.ceil((endAt - Date.now()) / 1000)) : secondsLeft
    clearTicker()
    endAtRef.current = null
    setSecondsLeft(remain)
    setTimerState('paused')
    void cancelPomodoroNotifications()
  }, [cancelPomodoroNotifications, clearTicker, secondsLeft, timerState])

  const resumeTimer = useCallback(() => {
    if (timerState !== 'paused' || secondsLeft <= 0) return
    endAtRef.current = Date.now() + (secondsLeft * 1000)
    setTimerState('running')
    void scheduleActiveNotification(phase, secondsLeft)
    void schedulePhaseEndNotification(phase, secondsLeft)
  }, [phase, scheduleActiveNotification, schedulePhaseEndNotification, secondsLeft, timerState])

  const startFocus = useCallback(() => {
    clearTicker()
    applyPhase('focus', true)
  }, [applyPhase, clearTicker])

  const resetCurrentPhase = useCallback(() => {
    const target = phase === 'focus' ? focusMinutes * 60 : breakMinutes * 60
    phaseTargetSecondsRef.current = target
    setSecondsLeft(target)
    lastMinuteBucketRef.current = null
    if (timerState === 'running') {
      endAtRef.current = Date.now() + (target * 1000)
      void scheduleActiveNotification(phase, target)
      void schedulePhaseEndNotification(phase, target)
    }
  }, [breakMinutes, focusMinutes, phase, scheduleActiveNotification, schedulePhaseEndNotification, timerState])

  const skipPhase = useCallback(() => {
    const nextPhase: PomodoroPhase = phase === 'focus' ? 'break' : 'focus'
    const target = nextPhase === 'focus' ? focusMinutes * 60 : breakMinutes * 60
    phaseTargetSecondsRef.current = target
    setPhase(nextPhase)
    setSecondsLeft(target)
    lastMinuteBucketRef.current = null
    if (timerState === 'running') {
      endAtRef.current = Date.now() + (target * 1000)
      void scheduleActiveNotification(nextPhase, target)
      void schedulePhaseEndNotification(nextPhase, target)
    }
  }, [breakMinutes, focusMinutes, phase, scheduleActiveNotification, schedulePhaseEndNotification, timerState])

  const onPhaseFinished = useCallback(() => {
    if (phase === 'focus') {
      addStudySession({ id: uid(), completedAt: now(), focusSeconds: phaseTargetSecondsRef.current })
    }

    const nextPhase: PomodoroPhase = phase === 'focus' ? 'break' : 'focus'
    const nextTarget = nextPhase === 'focus' ? focusMinutes * 60 : breakMinutes * 60
    phaseTargetSecondsRef.current = nextTarget
    setPhase(nextPhase)
    setSecondsLeft(nextTarget)
    endAtRef.current = Date.now() + (nextTarget * 1000)
    lastMinuteBucketRef.current = null

    void scheduleActiveNotification(nextPhase, nextTarget)
    void schedulePhaseEndNotification(nextPhase, nextTarget)

    Alert.alert(
      phase === 'focus' ? 'Foco concluido' : 'Intervalo concluido',
      phase === 'focus'
        ? 'Sessao registrada. Intervalo iniciado automaticamente.'
        : 'Novo ciclo de foco iniciado automaticamente.',
    )
  }, [addStudySession, breakMinutes, focusMinutes, phase, scheduleActiveNotification, schedulePhaseEndNotification])

  const tick = useCallback(() => {
    if (timerState !== 'running' || !endAtRef.current) return

    const remaining = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000))
    setSecondsLeft(remaining)

    const minuteBucket = Math.ceil(remaining / 60)
    if (remaining > 0 && minuteBucket !== lastMinuteBucketRef.current) {
      lastMinuteBucketRef.current = minuteBucket
      void scheduleActiveNotification(phase, remaining)
    }

    if (remaining <= 0) onPhaseFinished()
  }, [onPhaseFinished, phase, scheduleActiveNotification, timerState])

  useEffect(() => {
    if (timerState !== 'running') {
      clearTicker()
      return
    }

    tick()
    intervalRef.current = setInterval(tick, 1000)
    return clearTicker
  }, [clearTicker, tick, timerState])

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      const prev = appStateRef.current
      appStateRef.current = nextState
      if (prev.match(/inactive|background/) && nextState === 'active' && timerState === 'running') tick()
    })
    return () => sub.remove()
  }, [tick, timerState])

  useEffect(() => {
    return () => {
      clearTicker()
      void cancelPomodoroNotifications()
    }
  }, [cancelPomodoroNotifications, clearTicker])

  const selectedDate = today()
  const todaySessions = useMemo(
    () => sessions.filter(session => session.completedAt.slice(0, 10) === selectedDate),
    [selectedDate, sessions],
  )
  const totalFocusSeconds = useMemo(() => sessions.reduce((sum, session) => sum + session.focusSeconds, 0), [sessions])
  const focusTodaySeconds = useMemo(() => todaySessions.reduce((sum, session) => sum + session.focusSeconds, 0), [todaySessions])
  const goalsDone = useMemo(() => goals.filter(goal => goal.status === 'done').length, [goals])

  const weekSeries = useMemo(() => {
    const byDate = new Map<string, number>()
    for (const session of sessions) {
      const date = session.completedAt.slice(0, 10)
      byDate.set(date, (byDate.get(date) ?? 0) + session.focusSeconds)
    }

    const result: Array<{ iso: string; label: string; seconds: number }> = []
    const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

    for (let i = 6; i >= 0; i -= 1) {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - i)
      const iso = isoFromDate(date)
      result.push({ iso, label: names[date.getDay()], seconds: byDate.get(iso) ?? 0 })
    }

    return result
  }, [sessions])

  const weekFocusSeconds = useMemo(() => weekSeries.reduce((sum, day) => sum + day.seconds, 0), [weekSeries])

  const streakDays = useMemo(() => {
    const daysWithStudy = new Set(sessions.map(session => session.completedAt.slice(0, 10)))
    let streak = 0
    const cursor = new Date()
    cursor.setHours(0, 0, 0, 0)

    while (true) {
      const iso = isoFromDate(cursor)
      if (!daysWithStudy.has(iso)) break
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }

    return streak
  }, [sessions])

  const travelDistance = Math.max(240, viewportWidth * 0.92)
  const swipeThreshold = Math.max(58, viewportWidth * 0.17)

  const snapBack = useCallback(() => {
    Animated.spring(dragX, {
      toValue: 0,
      damping: 18,
      stiffness: 240,
      mass: 0.8,
      useNativeDriver: true,
    }).start()
  }, [dragX])

  const runTabTransition = useCallback((nextTab: StudyTab, direction: 'next' | 'prev', fromDrag = false) => {
    if (nextTab === tab || isAnimatingRef.current) {
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
      setTab(nextTab)
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
  }, [dragX, snapBack, tab, travelDistance])

  const shiftTab = useCallback((direction: 'next' | 'prev', fromDrag = false) => {
    const index = TAB_ORDER.indexOf(tab)
    if (index < 0) {
      if (fromDrag) snapBack()
      return
    }

    if (direction === 'next') {
      if (index >= TAB_ORDER.length - 1) {
        if (fromDrag) snapBack()
        return
      }
      runTabTransition(TAB_ORDER[index + 1], 'next', fromDrag)
      return
    }

    if (index <= 0) {
      if (fromDrag) snapBack()
      return
    }
    runTabTransition(TAB_ORDER[index - 1], 'prev', fromDrag)
  }, [runTabTransition, snapBack, tab])

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onPanResponderGrant: () => {
          dragX.stopAnimation()
        },
        onPanResponderMove: (_, gesture) => {
          if (isAnimatingRef.current) return
          const clamped = Math.max(-travelDistance, Math.min(travelDistance, gesture.dx))
          dragX.setValue(clamped)
        },
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dx) < swipeThreshold || Math.abs(gesture.dx) < Math.abs(gesture.dy)) {
            snapBack()
            return
          }
          if (gesture.dx < 0) shiftTab('next', true)
          else shiftTab('prev', true)
        },
        onPanResponderTerminate: () => {
          snapBack()
        },
      }),
    [dragX, shiftTab, snapBack, swipeThreshold, travelDistance],
  )

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

  function openGoalSheet(goal?: StudyGoal) {
    if (goal) {
      setEditingGoalId(goal.id)
      setGoalTitle(goal.title)
      setGoalDescription(goal.description ?? '')
      setGoalStatus(goal.status)
      setGoalPriority(goal.priority ?? null)
      setGoalChecklist((goal.checklist ?? []).map(item => ({ ...item })))
      setGoalChecklistDraft('')
    } else {
      setEditingGoalId(null)
      setGoalTitle('')
      setGoalDescription('')
      setGoalStatus('todo')
      setGoalPriority(null)
      setGoalChecklist([])
      setGoalChecklistDraft('')
    }
    setGoalSheetOpen(true)
  }

  function saveGoal() {
    const title = goalTitle.trim()
    if (!title) {
      Alert.alert('Meta invalida', 'Informe um titulo para a meta.')
      return
    }

    const payload: Partial<StudyGoal> = {
      title,
      description: goalDescription.trim(),
      status: goalStatus,
      priority: goalPriority,
      checklist: goalChecklist,
      updatedAt: now(),
    }

    if (editingGoalId) updateStudyGoal(editingGoalId, payload)
    else addStudyGoal({ ...payload, createdAt: now() })
    setGoalSheetOpen(false)
  }

  function removeGoal(goal: StudyGoal) {
    Alert.alert('Excluir meta', `Excluir "${goal.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteStudyGoal(goal.id) },
    ])
  }

  function cycleGoalStatus(goal: StudyGoal) {
    const index = STATUS_ORDER.indexOf(goal.status)
    const next = STATUS_ORDER[(index + 1) % STATUS_ORDER.length]
    updateStudyGoal(goal.id, { status: next })
  }

  function addGoalChecklistItem() {
    const text = goalChecklistDraft.trim()
    if (!text) return
    setGoalChecklist(prev => [...prev, { id: uid(), text, done: false }])
    setGoalChecklistDraft('')
  }

  function toggleChecklistItem(checkId: string) {
    setGoalChecklist(prev => prev.map(item => (item.id === checkId ? { ...item, done: !item.done } : item)))
  }

  function deleteChecklistItem(checkId: string) {
    setGoalChecklist(prev => prev.filter(item => item.id !== checkId))
  }

  function openFlashSheet(card?: StudyFlashcard) {
    if (card) {
      setEditingFlashcardId(card.id)
      setFlashQuestion(card.question)
      setFlashAnswer(card.answer)
    } else {
      setEditingFlashcardId(null)
      setFlashQuestion('')
      setFlashAnswer('')
    }
    setFlashSheetOpen(true)
  }

  function saveFlashcard() {
    const question = flashQuestion.trim()
    const answer = flashAnswer.trim()
    if (!question || !answer) {
      Alert.alert('Flashcard invalido', 'Preencha pergunta e resposta.')
      return
    }

    const stamp = now()
    updateStudy(prev => {
      const current = prev.flashcards ?? []
      if (editingFlashcardId) {
        return {
          ...prev,
          flashcards: current.map(card => (
            card.id === editingFlashcardId
              ? { ...card, question, answer, updatedAt: stamp }
              : card
          )),
        }
      }

      const nextCard: StudyFlashcard = { id: uid(), question, answer, createdAt: stamp, updatedAt: stamp }
      return { ...prev, flashcards: [nextCard, ...current] }
    })

    setFlashSheetOpen(false)
  }

  function removeFlashcard(card: StudyFlashcard) {
    Alert.alert('Excluir flashcard', `Excluir "${card.question}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          updateStudy(prev => ({ ...prev, flashcards: (prev.flashcards ?? []).filter(item => item.id !== card.id) }))
        },
      },
    ])
  }

  function openNoteSheet(note?: StudyQuickNote) {
    if (note) {
      setEditingNoteId(note.id)
      setNoteTitle(note.title)
      setNoteContent(note.content)
    } else {
      setEditingNoteId(null)
      setNoteTitle('')
      setNoteContent('')
    }
    setNoteSheetOpen(true)
  }

  function saveNote() {
    const title = noteTitle.trim() || 'Nota rapida'
    const content = noteContent.trim()
    if (!content) {
      Alert.alert('Nota vazia', 'Escreva algum conteudo para salvar.')
      return
    }

    const stamp = now()
    updateStudy(prev => {
      const current = prev.notes ?? []
      if (editingNoteId) {
        return {
          ...prev,
          notes: current.map(note => (
            note.id === editingNoteId ? { ...note, title, content, updatedAt: stamp } : note
          )),
        }
      }

      const nextNote: StudyQuickNote = { id: uid(), title, content, createdAt: stamp, updatedAt: stamp }
      return { ...prev, notes: [nextNote, ...current] }
    })

    setNoteSheetOpen(false)
  }

  function removeNote(note: StudyQuickNote) {
    Alert.alert('Excluir nota', `Excluir "${note.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          updateStudy(prev => ({ ...prev, notes: (prev.notes ?? []).filter(item => item.id !== note.id) }))
        },
      },
    ])
  }

  function saveConfig() {
    if (timerState !== 'idle') {
      Alert.alert('Timer ativo', 'Pare o pomodoro antes de alterar os tempos.')
      return
    }

    const nextFocus = Math.max(1, Math.min(180, Number.parseInt(focusInput, 10) || 25))
    const nextBreak = Math.max(1, Math.min(90, Number.parseInt(breakInput, 10) || 5))

    updateStudy(prev => ({
      ...prev,
      focusMinutes: nextFocus,
      breakMinutes: nextBreak,
      muteSound: muteInput,
      notificationsEnabled: notifyInput,
    }))

    setSecondsLeft(nextFocus * 60)
    phaseTargetSecondsRef.current = nextFocus * 60
    Alert.alert('Configuracao salva', 'Ajustes do estudo atualizados.')
  }

  function handleFooterPrimary() {
    if (timerState === 'idle') return startFocus()
    if (timerState === 'running') return pauseTimer()
    return resumeTimer()
  }

  const footerPrimaryIcon = timerState === 'running' ? 'pause' : 'play'

  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    sectionBar: {
      height: 44,
      borderBottomWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface,
      paddingHorizontal: 10,
    },
    sectionNavBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionBarTitle: { fontSize: 14, fontWeight: '700' },
    swipeArea: { flex: 1 },
    content: { flex: 1, padding: 12 },
    panel: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
    panelTitle: { fontSize: 13.5, fontWeight: '700', marginBottom: 10 },
    timerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    phaseChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
    phaseChipText: { fontSize: 11.5, fontWeight: '700' },
    timerClock: { fontSize: 40, fontWeight: '800', letterSpacing: 1.2, textAlign: 'center', marginBottom: 4 },
    timerSub: { fontSize: 12, textAlign: 'center', marginBottom: 12 },
    timerControls: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    timerBtn: {
      flex: 1,
      minHeight: 42,
      borderRadius: 11,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    timerBtnText: { fontSize: 12.5, fontWeight: '700' },
    quickActions: { flexDirection: 'row', gap: 8 },
    quickBtn: {
      flex: 1,
      minHeight: 40,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 8,
    },
    quickBtnText: { fontSize: 12, fontWeight: '600' },
    statsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statCard: { flexBasis: '48%', flexGrow: 1, borderRadius: 11, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
    statValue: { fontSize: 15.5, fontWeight: '800' },
    statLabel: { fontSize: 10.5, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
    goalCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
    goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    goalTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
    goalStatus: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
    goalStatusText: { fontSize: 10.5, fontWeight: '700' },
    goalMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
    goalMetaText: { fontSize: 11.5 },
    progressWrap: { width: '100%', height: 7, borderRadius: 4, overflow: 'hidden', marginTop: 6 },
    progressFill: { height: 7, borderRadius: 4 },
    goalActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
    actionBtn: {
      borderRadius: 10,
      borderWidth: 1,
      minHeight: 34,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    actionBtnText: { fontSize: 12, fontWeight: '600' },
    weeklyBarRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, marginTop: 8 },
    weeklyCol: { flex: 1, alignItems: 'center' },
    weeklyTrack: { width: '100%', height: 72, borderRadius: 8, overflow: 'hidden', justifyContent: 'flex-end' },
    weeklyFill: { width: '100%', borderRadius: 8 },
    weeklyLabel: { fontSize: 10.5, marginTop: 6 },
    sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, paddingVertical: 10 },
    sessionText: { fontSize: 12.5 },
    flashCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
    flashQuestion: { fontSize: 13.5, fontWeight: '700' },
    flashAnswer: { fontSize: 12.5, marginTop: 8, lineHeight: 18 },
    noteCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
    noteTitle: { fontSize: 13.5, fontWeight: '700' },
    noteContent: { fontSize: 12.5, marginTop: 6, lineHeight: 18 },
    noteDate: { fontSize: 11.5, marginTop: 8 },
    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
    chip: { borderRadius: 16, borderWidth: 1, minHeight: 32, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
    chipText: { fontSize: 12, fontWeight: '600' },
    checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, paddingVertical: 7 },
    checklistText: { flex: 1, fontSize: 12.5 },
    footer: {
      height: 66,
      borderTopWidth: 1,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    footerSide: { width: 118, alignItems: 'flex-start' },
    footerBtn: {
      height: 42,
      paddingHorizontal: 14,
      borderRadius: 13,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    footerBtnTxt: { fontSize: 13, fontWeight: '600' },
    footerAddBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 6,
    },
  })

  const renderDashboard = () => (
    <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
      <View style={[s.panel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
        <View style={s.timerHeader}>
          <Text style={[s.panelTitle, { color: theme.text, marginBottom: 0 }]}>Sessao atual</Text>
          <View style={[s.phaseChip, { borderColor: STATUS_COLORS.in_progress + '66', backgroundColor: STATUS_COLORS.in_progress + '16' }]}>
            <Text style={[s.phaseChipText, { color: phase === 'focus' ? theme.primary : '#22c55e' }]}>{PHASE_LABELS[phase]}</Text>
          </View>
        </View>

        <Text style={[s.timerClock, { color: theme.text }]}>{formatClock(secondsLeft)}</Text>
        <Text style={[s.timerSub, { color: theme.text + '75' }]}>
          {timerState === 'running' ? 'Pomodoro em andamento' : timerState === 'paused' ? 'Pomodoro pausado' : `${focusMinutes} min foco / ${breakMinutes} min intervalo`}
        </Text>

        <View style={s.timerControls}>
          {timerState === 'running' ? (
            <>
              <TouchableOpacity style={[s.timerBtn, { borderColor: theme.text + '20', backgroundColor: theme.text + '08' }]} onPress={pauseTimer}>
                <Feather name="pause" size={14} color={theme.text + 'd0'} />
                <Text style={[s.timerBtnText, { color: theme.text + 'd0' }]}>Pausar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.timerBtn, { borderColor: '#ef444466', backgroundColor: '#ef444412' }]} onPress={stopTimer}>
                <Feather name="square" size={13} color="#ef4444" />
                <Text style={[s.timerBtnText, { color: '#ef4444' }]}>Parar</Text>
              </TouchableOpacity>
            </>
          ) : timerState === 'paused' ? (
            <>
              <TouchableOpacity style={[s.timerBtn, { borderColor: theme.primary + '60', backgroundColor: theme.primary + '14' }]} onPress={resumeTimer}>
                <Feather name="play" size={14} color={theme.primary} />
                <Text style={[s.timerBtnText, { color: theme.primary }]}>Retomar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.timerBtn, { borderColor: '#ef444466', backgroundColor: '#ef444412' }]} onPress={stopTimer}>
                <Feather name="square" size={13} color="#ef4444" />
                <Text style={[s.timerBtnText, { color: '#ef4444' }]}>Encerrar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={[s.timerBtn, { borderColor: theme.primary + '60', backgroundColor: theme.primary }]} onPress={startFocus}>
              <Feather name="play" size={14} color="#fff" />
              <Text style={[s.timerBtnText, { color: '#fff' }]}>Iniciar foco</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.quickActions}>
          <TouchableOpacity style={[s.quickBtn, { borderColor: theme.text + '20', backgroundColor: theme.text + '08' }]} onPress={resetCurrentPhase}>
            <Feather name="rotate-ccw" size={14} color={theme.text + 'c0'} />
            <Text style={[s.quickBtnText, { color: theme.text + 'c0' }]}>Resetar fase</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.quickBtn, { borderColor: theme.text + '20', backgroundColor: theme.text + '08' }]} onPress={skipPhase}>
            <Feather name="skip-forward" size={14} color={theme.text + 'c0'} />
            <Text style={[s.quickBtnText, { color: theme.text + 'c0' }]}>Pular fase</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.quickBtn, { borderColor: theme.primary + '60', backgroundColor: theme.primary + '12' }]} onPress={() => navigation.navigate('Planner')}>
            <Feather name="calendar" size={14} color={theme.primary} />
            <Text style={[s.quickBtnText, { color: theme.primary }]}>Semanal</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={[s.panel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
        <Text style={[s.panelTitle, { color: theme.text }]}>Resumo rapido</Text>
        <View style={s.statsWrap}>
          <View style={[s.statCard, { borderColor: theme.text + '14', backgroundColor: theme.background }]}>
            <Text style={[s.statValue, { color: theme.primary }]}>{formatMinutes(Math.round(focusTodaySeconds / 60))}</Text>
            <Text style={[s.statLabel, { color: theme.text + '70' }]}>Hoje</Text>
          </View>
          <View style={[s.statCard, { borderColor: theme.text + '14', backgroundColor: theme.background }]}>
            <Text style={[s.statValue, { color: '#22c55e' }]}>{todaySessions.length}</Text>
            <Text style={[s.statLabel, { color: theme.text + '70' }]}>Sessoes hoje</Text>
          </View>
          <View style={[s.statCard, { borderColor: theme.text + '14', backgroundColor: theme.background }]}>
            <Text style={[s.statValue, { color: '#f59e0b' }]}>{goalsDone}/{goals.length}</Text>
            <Text style={[s.statLabel, { color: theme.text + '70' }]}>Metas concluidas</Text>
          </View>
          <View style={[s.statCard, { borderColor: theme.text + '14', backgroundColor: theme.background }]}>
            <Text style={[s.statValue, { color: '#60a5fa' }]}>{streakDays}</Text>
            <Text style={[s.statLabel, { color: theme.text + '70' }]}>Sequencia</Text>
          </View>
        </View>
      </View>

      <View style={[s.panel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
        <View style={s.timerHeader}>
          <Text style={[s.panelTitle, { color: theme.text, marginBottom: 0 }]}>Metas em evidencia</Text>
          <TouchableOpacity onPress={() => openGoalSheet()}>
            <Feather name="plus" size={16} color={theme.primary} />
          </TouchableOpacity>
        </View>
        {goals.length === 0 && <EmptyState icon="target" title="Sem metas" subtitle="Crie sua primeira meta de estudo" />}
        {goals.slice(0, 3).map(goal => {
          const progress = goalProgress(goal)
          const checklist = goal.checklist ?? []
          const done = checklist.filter(item => item.done).length
          return (
            <TouchableOpacity
              key={goal.id}
              style={[s.goalCard, { borderColor: theme.text + '16', backgroundColor: theme.background }]}
              onPress={() => openGoalSheet(goal)}
              activeOpacity={0.9}
            >
              <View style={s.goalHeader}>
                <Text style={[s.goalTitle, { color: theme.text }]} numberOfLines={1}>{goal.title}</Text>
                <View style={[s.goalStatus, { borderColor: STATUS_COLORS[goal.status] + '66', backgroundColor: STATUS_COLORS[goal.status] + '14' }]}>
                  <Text style={[s.goalStatusText, { color: STATUS_COLORS[goal.status] }]}>{STATUS_LABELS[goal.status]}</Text>
                </View>
              </View>
              <View style={[s.progressWrap, { backgroundColor: theme.text + '16' }]}>
                <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: theme.primary }]} />
              </View>
              <View style={s.goalMetaRow}>
                <Text style={[s.goalMetaText, { color: theme.text + '70' }]}>{Math.round(progress * 100)}% concluido</Text>
                <Text style={[s.goalMetaText, { color: theme.text + '70' }]}>{checklist.length > 0 ? `${done}/${checklist.length} itens` : 'Sem checklist'}</Text>
              </View>
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  )

  const renderGoals = () => (
    <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
      <View style={[s.panel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
        <View style={s.timerHeader}>
          <Text style={[s.panelTitle, { color: theme.text, marginBottom: 0 }]}>Gestao de metas</Text>
          <TouchableOpacity style={[s.actionBtn, { borderColor: theme.primary + '60', backgroundColor: theme.primary + '10' }]} onPress={() => openGoalSheet()}>
            <Feather name="plus" size={14} color={theme.primary} />
            <Text style={[s.actionBtnText, { color: theme.primary }]}>Nova meta</Text>
          </TouchableOpacity>
        </View>

        {goals.length === 0 && <EmptyState icon="target" title="Sem metas cadastradas" subtitle="Adicione uma meta e acompanhe no detalhe" />}

        {goals.map(goal => {
          const progress = goalProgress(goal)
          const checklist = goal.checklist ?? []
          const done = checklist.filter(item => item.done).length
          return (
            <TouchableOpacity
              key={goal.id}
              style={[s.goalCard, { borderColor: theme.text + '16', backgroundColor: theme.background }]}
              onPress={() => openGoalSheet(goal)}
              activeOpacity={0.9}
            >
              <View style={s.goalHeader}>
                <Text style={[s.goalTitle, { color: theme.text }]} numberOfLines={1}>{goal.title}</Text>
                <View style={[s.goalStatus, { borderColor: STATUS_COLORS[goal.status] + '66', backgroundColor: STATUS_COLORS[goal.status] + '14' }]}>
                  <Text style={[s.goalStatusText, { color: STATUS_COLORS[goal.status] }]}>{STATUS_LABELS[goal.status]}</Text>
                </View>
              </View>
              {(goal.description ?? '').trim().length > 0 && (
                <Text style={[s.goalMetaText, { color: theme.text + '80', marginTop: 6 }]} numberOfLines={2}>{goal.description}</Text>
              )}
              <View style={[s.progressWrap, { backgroundColor: theme.text + '16' }]}>
                <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: theme.primary }]} />
              </View>
              <View style={s.goalMetaRow}>
                <Text style={[s.goalMetaText, { color: theme.text + '70' }]}>{Math.round(progress * 100)}% concluido</Text>
                <Text style={[s.goalMetaText, { color: theme.text + '70' }]}>{checklist.length > 0 ? `${done}/${checklist.length} checklist` : 'Sem checklist'}</Text>
              </View>
              <View style={s.goalActions}>
                <TouchableOpacity style={[s.actionBtn, { borderColor: theme.text + '20', backgroundColor: theme.text + '08' }]} onPress={() => cycleGoalStatus(goal)}>
                  <Feather name="refresh-cw" size={13} color={theme.text + 'c0'} />
                  <Text style={[s.actionBtnText, { color: theme.text + 'c0' }]}>Trocar status</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { borderColor: '#ef444466', backgroundColor: '#ef444412' }]} onPress={() => removeGoal(goal)}>
                  <Feather name="trash-2" size={13} color="#ef4444" />
                  <Text style={[s.actionBtnText, { color: '#ef4444' }]}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  )

  const renderReports = () => {
    const maxDay = Math.max(1, ...weekSeries.map(item => item.seconds))
    return (
      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        <View style={[s.panel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
          <Text style={[s.panelTitle, { color: theme.text }]}>Relatorios adaptados</Text>
          <View style={s.statsWrap}>
            <View style={[s.statCard, { borderColor: theme.text + '14', backgroundColor: theme.background }]}>
              <Text style={[s.statValue, { color: theme.primary }]}>{formatMinutes(Math.round(totalFocusSeconds / 60))}</Text>
              <Text style={[s.statLabel, { color: theme.text + '70' }]}>Tempo total</Text>
            </View>
            <View style={[s.statCard, { borderColor: theme.text + '14', backgroundColor: theme.background }]}>
              <Text style={[s.statValue, { color: '#22c55e' }]}>{formatMinutes(Math.round(weekFocusSeconds / 60))}</Text>
              <Text style={[s.statLabel, { color: theme.text + '70' }]}>Ultimos 7 dias</Text>
            </View>
            <View style={[s.statCard, { borderColor: theme.text + '14', backgroundColor: theme.background }]}>
              <Text style={[s.statValue, { color: '#f59e0b' }]}>{goalsDone}/{goals.length}</Text>
              <Text style={[s.statLabel, { color: theme.text + '70' }]}>Metas finalizadas</Text>
            </View>
            <View style={[s.statCard, { borderColor: theme.text + '14', backgroundColor: theme.background }]}>
              <Text style={[s.statValue, { color: '#60a5fa' }]}>{streakDays} dia(s)</Text>
              <Text style={[s.statLabel, { color: theme.text + '70' }]}>Consistencia</Text>
            </View>
          </View>
        </View>

        <View style={[s.panel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
          <Text style={[s.panelTitle, { color: theme.text }]}>Evolucao semanal</Text>
          <View style={s.weeklyBarRow}>
            {weekSeries.map(item => {
              const heightPct = Math.max(6, Math.round((item.seconds / maxDay) * 100))
              return (
                <View key={item.iso} style={s.weeklyCol}>
                  <View style={[s.weeklyTrack, { backgroundColor: theme.text + '14' }]}>
                    <View style={[s.weeklyFill, { height: `${heightPct}%`, backgroundColor: theme.primary }]} />
                  </View>
                  <Text style={[s.weeklyLabel, { color: theme.text + '88' }]}>{item.label}</Text>
                </View>
              )
            })}
          </View>
          <Text style={[s.goalMetaText, { color: theme.text + '70', marginTop: 10 }]}>Meta diaria de foco sugerida: {focusMinutes} min</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    )
  }

  const renderHistory = () => (
    <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
      <View style={[s.panel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
        <Text style={[s.panelTitle, { color: theme.text }]}>Historico de sessoes</Text>
        {sessions.length === 0 && <EmptyState icon="clock" title="Nenhuma sessao ainda" subtitle="Inicie um pomodoro para registrar" />}
        {sessions.slice(0, 50).map(session => (
          <View key={session.id} style={[s.sessionRow, { borderBottomColor: theme.text + '12' }]}>
            <Feather name="zap" size={14} color={theme.primary} />
            <Text style={[s.sessionText, { color: theme.text + 'd0' }]}>{formatMinutes(Math.round(session.focusSeconds / 60))} de foco</Text>
            <Text style={[s.sessionText, { color: theme.text + '75', marginLeft: 'auto' }]}>{formatDate(session.completedAt.slice(0, 10))}</Text>
          </View>
        ))}
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  )

  const renderFlashcards = () => (
    <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
      <View style={[s.panel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
        <View style={s.timerHeader}>
          <Text style={[s.panelTitle, { color: theme.text, marginBottom: 0 }]}>Flashcards</Text>
          <TouchableOpacity style={[s.actionBtn, { borderColor: theme.primary + '60', backgroundColor: theme.primary + '10' }]} onPress={() => openFlashSheet()}>
            <Feather name="plus" size={14} color={theme.primary} />
            <Text style={[s.actionBtnText, { color: theme.primary }]}>Novo</Text>
          </TouchableOpacity>
        </View>

        {flashcards.length === 0 && <EmptyState icon="book-open" title="Sem flashcards" subtitle="Crie perguntas para revisao rapida" />}

        {flashcards.map(card => {
          const expanded = expandedFlashcardId === card.id
          return (
            <TouchableOpacity
              key={card.id}
              style={[s.flashCard, { borderColor: theme.text + '16', backgroundColor: theme.background }]}
              activeOpacity={0.92}
              onPress={() => setExpandedFlashcardId(prev => (prev === card.id ? null : card.id))}
            >
              <Text style={[s.flashQuestion, { color: theme.text }]}>{card.question}</Text>
              {expanded && <Text style={[s.flashAnswer, { color: theme.text + 'd0' }]}>{card.answer}</Text>}
              <View style={[s.goalActions, { marginTop: 10 }]}> 
                <TouchableOpacity style={[s.actionBtn, { borderColor: theme.text + '20', backgroundColor: theme.text + '08' }]} onPress={() => openFlashSheet(card)}>
                  <Feather name="edit-2" size={13} color={theme.text + 'c0'} />
                  <Text style={[s.actionBtnText, { color: theme.text + 'c0' }]}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { borderColor: '#ef444466', backgroundColor: '#ef444412' }]} onPress={() => removeFlashcard(card)}>
                  <Feather name="trash-2" size={13} color="#ef4444" />
                  <Text style={[s.actionBtnText, { color: '#ef4444' }]}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )
        })}
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  )

  const renderNotes = () => (
    <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
      <View style={[s.panel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
        <View style={s.timerHeader}>
          <Text style={[s.panelTitle, { color: theme.text, marginBottom: 0 }]}>Notas de estudo</Text>
          <TouchableOpacity style={[s.actionBtn, { borderColor: theme.primary + '60', backgroundColor: theme.primary + '10' }]} onPress={() => openNoteSheet()}>
            <Feather name="plus" size={14} color={theme.primary} />
            <Text style={[s.actionBtnText, { color: theme.primary }]}>Nova nota</Text>
          </TouchableOpacity>
        </View>

        {quickNotes.length === 0 && <EmptyState icon="file-text" title="Sem notas" subtitle="Registre resumos e insights da sessao" />}

        {quickNotes.map(note => (
          <TouchableOpacity
            key={note.id}
            style={[s.noteCard, { borderColor: theme.text + '16', backgroundColor: theme.background }]}
            onPress={() => openNoteSheet(note)}
            activeOpacity={0.92}
          >
            <Text style={[s.noteTitle, { color: theme.text }]} numberOfLines={1}>{note.title}</Text>
            <Text style={[s.noteContent, { color: theme.text + 'd0' }]} numberOfLines={4}>{note.content}</Text>
            <Text style={[s.noteDate, { color: theme.text + '70' }]}>Atualizada em {formatDate(note.updatedAt.slice(0, 10))}</Text>
            <View style={s.goalActions}>
              <TouchableOpacity style={[s.actionBtn, { borderColor: '#ef444466', backgroundColor: '#ef444412' }]} onPress={() => removeNote(note)}>
                <Feather name="trash-2" size={13} color="#ef4444" />
                <Text style={[s.actionBtnText, { color: '#ef4444' }]}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  )

  const renderConfig = () => (
    <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
      <View style={[s.panel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
        <Text style={[s.panelTitle, { color: theme.text }]}>Pomodoro e notificacoes</Text>
        <FormInput label="Tempo de foco (min)" value={focusInput} onChangeText={setFocusInput} keyboardType="number-pad" placeholder="25" />
        <FormInput label="Tempo de intervalo (min)" value={breakInput} onChangeText={setBreakInput} keyboardType="number-pad" placeholder="5" />

        <View style={[s.goalCard, { borderColor: theme.text + '16', backgroundColor: theme.background }]}> 
          <View style={s.timerHeader}>
            <Text style={[s.goalTitle, { color: theme.text, fontSize: 13.5 }]}>Notificacao ao finalizar fase</Text>
            <Switch value={notifyInput} onValueChange={setNotifyInput} thumbColor={notifyInput ? theme.primary : '#9ca3af'} />
          </View>
          <Text style={[s.goalMetaText, { color: theme.text + '70' }]}>Mostra alerta em segundo plano e card persistente quando pomodoro esta ativo.</Text>
        </View>

        <View style={[s.goalCard, { borderColor: theme.text + '16', backgroundColor: theme.background }]}> 
          <View style={s.timerHeader}>
            <Text style={[s.goalTitle, { color: theme.text, fontSize: 13.5 }]}>Mutar som interno</Text>
            <Switch value={muteInput} onValueChange={setMuteInput} thumbColor={muteInput ? theme.primary : '#9ca3af'} />
          </View>
          <Text style={[s.goalMetaText, { color: theme.text + '70' }]}>Mantem apenas notificacao visual quando uma fase termina.</Text>
        </View>

        <TouchableOpacity style={[s.timerBtn, { borderColor: theme.primary, backgroundColor: theme.primary, marginTop: 8 }]} onPress={saveConfig}>
          <Feather name="save" size={14} color="#fff" />
          <Text style={[s.timerBtnText, { color: '#fff' }]}>Salvar configuracao</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  )

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Estudo" />

      <View style={[s.sectionBar, { borderBottomColor: theme.text + '10' }]}>
        <TouchableOpacity
          style={[s.sectionNavBtn, { borderColor: theme.text + '1f', backgroundColor: theme.text + '08' }]}
          onPress={() => shiftTab('prev')}
        >
          <Feather name="chevron-left" size={16} color={theme.text + '86'} />
        </TouchableOpacity>
        <Text style={[s.sectionBarTitle, { color: theme.text }]}>{TAB_LABELS[tab]}</Text>
        <TouchableOpacity
          style={[s.sectionNavBtn, { borderColor: theme.text + '1f', backgroundColor: theme.text + '08' }]}
          onPress={() => shiftTab('next')}
        >
          <Feather name="chevron-right" size={16} color={theme.text + '86'} />
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[
          s.swipeArea,
          { opacity: contentOpacity, transform: [{ translateX: dragX }, { scale: contentScale }] },
        ]}
        {...panResponder.panHandlers}
      >
        {tab === 'dashboard' && renderDashboard()}
        {tab === 'goals' && renderGoals()}
        {tab === 'reports' && renderReports()}
        {tab === 'history' && renderHistory()}
        {tab === 'flashcards' && renderFlashcards()}
        {tab === 'notes' && renderNotes()}
        {tab === 'config' && renderConfig()}
      </Animated.View>

      <View style={[s.footer, { backgroundColor: theme.surface, borderTopColor: theme.text + '12' }]}>
        <View style={s.footerSide}>
          <TouchableOpacity
            style={[s.footerBtn, { backgroundColor: tab === 'dashboard' ? theme.primary + '18' : theme.text + '0a', borderColor: tab === 'dashboard' ? theme.primary + '42' : theme.text + '12' }]}
            onPress={() => setTab('dashboard')}
          >
            <Feather name="layout" size={15} color={tab === 'dashboard' ? theme.primary : theme.text + '85'} />
            <Text style={[s.footerBtnTxt, { color: tab === 'dashboard' ? theme.primary : theme.text + '85' }]}>Painel</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[s.footerAddBtn, { backgroundColor: theme.primary }]} onPress={handleFooterPrimary} activeOpacity={0.9}>
          <Feather name={footerPrimaryIcon as any} size={21} color="#fff" />
        </TouchableOpacity>

        <View style={[s.footerSide, { alignItems: 'flex-end' }]}>
          <TouchableOpacity
            style={[s.footerBtn, { backgroundColor: tab === 'config' ? theme.primary + '18' : theme.text + '0a', borderColor: tab === 'config' ? theme.primary + '42' : theme.text + '12' }]}
            onPress={() => setTab('config')}
          >
            <Feather name="settings" size={15} color={tab === 'config' ? theme.primary : theme.text + '85'} />
            <Text style={[s.footerBtnTxt, { color: tab === 'config' ? theme.primary : theme.text + '85' }]}>Config</Text>
          </TouchableOpacity>
        </View>
      </View>

      <BottomSheet visible={goalSheetOpen} onClose={() => setGoalSheetOpen(false)} title={editingGoalId ? 'Detalhes da meta' : 'Nova meta'} onSave={saveGoal}>
        <FormInput label="Titulo" value={goalTitle} onChangeText={setGoalTitle} placeholder="Ex: Revisar modulo de API" autoFocus />
        <FormInput
          label="Descricao"
          value={goalDescription}
          onChangeText={setGoalDescription}
          placeholder="Anotacoes da meta"
          multiline
          numberOfLines={4}
        />

        <Text style={[s.sectionLabel, { color: theme.text + '72' }]}>Status</Text>
        <View style={s.chips}>
          {STATUS_ORDER.map(status => {
            const active = goalStatus === status
            return (
              <TouchableOpacity
                key={status}
                style={[
                  s.chip,
                  active
                    ? { borderColor: STATUS_COLORS[status], backgroundColor: STATUS_COLORS[status] + '22' }
                    : { borderColor: theme.text + '22', backgroundColor: theme.text + '08' },
                ]}
                onPress={() => setGoalStatus(status)}
              >
                <Text style={[s.chipText, { color: active ? STATUS_COLORS[status] : theme.text + '85' }]}>{STATUS_LABELS[status]}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={[s.sectionLabel, { color: theme.text + '72' }]}>Prioridade</Text>
        <View style={s.chips}>
          {([null, 'P1', 'P2', 'P3', 'P4'] as Array<CardPriority | null>).map(priority => {
            const active = goalPriority === priority
            const color = priority ? PRIORITY_COLORS[priority] : theme.text + '70'
            const label = priority ? PRIORITY_LABELS[priority] : 'Sem prioridade'
            return (
              <TouchableOpacity
                key={priority ?? 'none'}
                style={[
                  s.chip,
                  active
                    ? { borderColor: color, backgroundColor: color + '1e' }
                    : { borderColor: theme.text + '22', backgroundColor: theme.text + '08' },
                ]}
                onPress={() => setGoalPriority(priority as CardPriority | null)}
              >
                <Text style={[s.chipText, { color: active ? color : theme.text + '85' }]}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Text style={[s.sectionLabel, { color: theme.text + '72' }]}>Checklist</Text>
        {goalChecklist.length === 0 && (
          <Text style={[s.goalMetaText, { color: theme.text + '60', marginBottom: 8 }]}>Sem itens no checklist</Text>
        )}
        {goalChecklist.map(item => (
          <View key={item.id} style={[s.checklistRow, { borderBottomColor: theme.text + '10' }]}> 
            <TouchableOpacity onPress={() => toggleChecklistItem(item.id)}>
              <Feather name={item.done ? 'check-square' : 'square'} size={16} color={item.done ? '#22c55e' : theme.text + '70'} />
            </TouchableOpacity>
            <Text style={[s.checklistText, { color: item.done ? theme.text + '70' : theme.text }]}>{item.text}</Text>
            <TouchableOpacity onPress={() => deleteChecklistItem(item.id)}>
              <Feather name="trash-2" size={13} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}

        <FormInput label="Novo item" value={goalChecklistDraft} onChangeText={setGoalChecklistDraft} placeholder="Ex: Resolver exercicios" />
        <TouchableOpacity style={[s.actionBtn, { borderColor: theme.primary + '60', backgroundColor: theme.primary + '10', marginBottom: 14 }]} onPress={addGoalChecklistItem}>
          <Feather name="plus" size={13} color={theme.primary} />
          <Text style={[s.actionBtnText, { color: theme.primary }]}>Adicionar item</Text>
        </TouchableOpacity>
      </BottomSheet>

      <BottomSheet visible={flashSheetOpen} onClose={() => setFlashSheetOpen(false)} title={editingFlashcardId ? 'Editar flashcard' : 'Novo flashcard'} onSave={saveFlashcard}>
        <FormInput label="Pergunta" value={flashQuestion} onChangeText={setFlashQuestion} placeholder="Digite a pergunta" autoFocus />
        <FormInput
          label="Resposta"
          value={flashAnswer}
          onChangeText={setFlashAnswer}
          placeholder="Digite a resposta"
          multiline
          numberOfLines={4}
        />
        <View style={{ height: 12 }} />
      </BottomSheet>

      <BottomSheet visible={noteSheetOpen} onClose={() => setNoteSheetOpen(false)} title={editingNoteId ? 'Editar nota' : 'Nova nota'} onSave={saveNote}>
        <FormInput label="Titulo" value={noteTitle} onChangeText={setNoteTitle} placeholder="Titulo da nota" autoFocus />
        <FormInput
          label="Conteudo"
          value={noteContent}
          onChangeText={setNoteContent}
          placeholder="Escreva sua nota"
          multiline
          numberOfLines={6}
        />
        <View style={{ height: 12 }} />
      </BottomSheet>
    </SafeAreaView>
  )
}
