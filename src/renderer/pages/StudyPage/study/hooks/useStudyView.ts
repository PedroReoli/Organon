import type { Card, CardPriority, CardStatus, StudyGoal, StudyMediaItem, StudySessionLog, StudyState } from '@types'
import { PRIORITY_LABELS, STATUS_LABELS } from '@types'
import type { PomodoroPhase, SearchImageResult, StudyPanel } from '@Study/study/types'
import { IMAGE_PAGE_SIZE } from '@Study/study/types'
import { generateId, getDayFromDate, getTodayISO } from '@utils'
import { blobToDataUrl, buildMediaCandidate, clampMinutes, clearLegacyStorage, cloneChecklist, cloneStudyState, hasStudyData, loadStudySettings, playBeep, searchWikimediaImages } from '@Study/study/utils'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { STUDY_QUOTES } from '@config/studyQuotes'

interface UseStudyViewParams {
  cards: Card[]
  study: StudyState
  onUpdateStudy: (updater: (prev: StudyState) => StudyState) => void
  onUpdatePlanningCard: (cardId: string, updates: Partial<Pick<Card, 'title' | 'descriptionHtml' | 'priority' | 'status' | 'checklist'>>) => void
}

export function useStudyView({ cards, study, onUpdateStudy, onUpdatePlanningCard }: UseStudyViewParams) {
  const [initialSettings] = useState<StudyState>(() => cloneStudyState(study))
  const didBootstrapRef = useRef(false)

  const [activePanel, setActivePanel] = useState<StudyPanel>(null)
  const [wallpaperUrl, setWallpaperUrl] = useState(initialSettings.wallpaperUrl)
  const [focusMinutes, setFocusMinutes] = useState(initialSettings.focusMinutes)
  const [breakMinutes, setBreakMinutes] = useState(initialSettings.breakMinutes)
  const [muteSound, setMuteSound] = useState(initialSettings.muteSound)
  const [phase, setPhase] = useState<PomodoroPhase>('focus')
  const [timerRunning, setTimerRunning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(initialSettings.focusMinutes * 60)
  const [mediaInput, setMediaInput] = useState('')
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [mediaItems, setMediaItems] = useState<StudyMediaItem[]>(initialSettings.mediaItems)
  const [youtubePlaying, setYoutubePlaying] = useState<Record<string, boolean>>({})
  const [goals, setGoals] = useState<StudyGoal[]>(initialSettings.goals)
  const [goalTitle, setGoalTitle] = useState('')
  const [goalChecklistDrafts, setGoalChecklistDrafts] = useState<Record<string, string>>({})
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({})
  const [showPlanningPicker, setShowPlanningPicker] = useState(true)
  const [goalsConfigMode, setGoalsConfigMode] = useState(false)
  const [sessions, setSessions] = useState<StudySessionLog[]>(initialSettings.sessions)
  // Upgrade 14
  const [focusedGoalId, setFocusedGoalId] = useState<string | null>(initialSettings.focusedGoalId ?? null)
  const [activePresetId, setActivePresetId] = useState<string | null>(initialSettings.activePresetId ?? null)
  const [wallpaperUrlInput, setWallpaperUrlInput] = useState('')
  const [imageSearch, setImageSearch] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<SearchImageResult[]>([])
  const [searchPage, setSearchPage] = useState(1)
  const [dockCollapsed, setDockCollapsed] = useState(false)
  const [quoteIndex, setQuoteIndex] = useState(() => (Math.floor(Date.now() / (24 * 60 * 60 * 1000))) % STUDY_QUOTES.length)

  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({})
  const youtubeDockRefs = useRef<Record<string, HTMLIFrameElement | null>>({})
  const lastGoalSyncRef = useRef<Record<string, string>>({})

  const todayIso = getTodayISO()
  const todayDay = getDayFromDate(todayIso)

  // ── Computed ──────────────────────────────────────────────────────────────

  const planningCards = useMemo(() => {
    const withDate = cards.filter(c => c.hasDate && c.date === todayIso)
    const withoutDate = cards.filter(c => !c.hasDate && c.location.day === todayDay && !!c.location.period)
    const unique = new Map<string, Card>()
    for (const c of [...withDate, ...withoutDate]) unique.set(c.id, c)
    return Array.from(unique.values()).sort((a, b) => a.order - b.order)
  }, [cards, todayDay, todayIso])

  const linkedPlanningCards = useMemo(() => {
    const map = new Map<string, Card>(); cards.forEach(c => map.set(c.id, c)); return map
  }, [cards])

  const availablePlanningCards = useMemo(() => {
    const linked = new Set(goals.map(g => g.linkedPlanningCardId).filter(Boolean))
    return planningCards.filter(c => !linked.has(c.id))
  }, [goals, planningCards])

  const dockMediaItems = useMemo(() => mediaItems.filter(i => i.showDock), [mediaItems])
  const totalFocusSeconds = useMemo(() => sessions.reduce((s, sess) => s + sess.focusSeconds, 0), [sessions])
  const todayFocusSeconds = useMemo(() => sessions.filter(s => s.completedAt.slice(0, 10) === todayIso).reduce((s, sess) => s + sess.focusSeconds, 0), [sessions, todayIso])
  const goalsDone = useMemo(() => goals.filter(g => g.status === 'done').length, [goals])
  const goalsOpen = goals.length - goalsDone
  const totalSearchPages = Math.max(1, Math.ceil(searchResults.length / IMAGE_PAGE_SIZE))
  const pagedSearchResults = useMemo(() => { const start = (searchPage - 1) * IMAGE_PAGE_SIZE; return searchResults.slice(start, start + IMAGE_PAGE_SIZE) }, [searchPage, searchResults])
  const currentQuote = STUDY_QUOTES[quoteIndex % STUDY_QUOTES.length]

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (didBootstrapRef.current) return
    const fromStore = cloneStudyState(study)
    const fromLocal = loadStudySettings()
    const source = !hasStudyData(fromStore) && fromLocal && hasStudyData(fromLocal) ? fromLocal : fromStore
    setWallpaperUrl(source.wallpaperUrl); setFocusMinutes(source.focusMinutes); setBreakMinutes(source.breakMinutes)
    setMuteSound(source.muteSound); setMediaItems(source.mediaItems); setGoals(source.goals)
    setSessions(source.sessions); setSecondsLeft(source.focusMinutes * 60)
    setFocusedGoalId(source.focusedGoalId ?? null)
    setActivePresetId(source.activePresetId ?? null)
    if (!hasStudyData(fromStore) && fromLocal && hasStudyData(fromLocal)) {
      onUpdateStudy(() => cloneStudyState(fromLocal)); clearLegacyStorage()
    }
    didBootstrapRef.current = true
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
  }, [onUpdateStudy, study])

  // Sync local state when preset is applied externally (SessionPresets updates store directly)
  useEffect(() => {
    if (!didBootstrapRef.current) return
    if (study.focusMinutes !== focusMinutes) setFocusMinutes(study.focusMinutes)
    if (study.breakMinutes !== breakMinutes) setBreakMinutes(study.breakMinutes)
    if (study.activePresetId !== activePresetId) setActivePresetId(study.activePresetId ?? null)
  }, [study.focusMinutes, study.breakMinutes, study.activePresetId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to store whenever settings change
  useEffect(() => {
    if (!didBootstrapRef.current) return
    onUpdateStudy((prev) =>
      cloneStudyState({
        wallpaperUrl,
        focusMinutes,
        breakMinutes,
        muteSound,
        mediaItems,
        goals,
        sessions,
        presets: prev.presets ?? [],
        activePresetId,
        focusedGoalId,
      }),
    )
    // presets NAO esta nas deps propositalmente — presets sao gerenciados diretamente
    // pelo SessionPresets via onUpdateStudy, nao por este effect. Incluir presets aqui
    // causaria loop infinito (este effect roda -> sobrescreve presets -> re-render -> effect roda de novo).
  }, [breakMinutes, focusMinutes, goals, mediaItems, muteSound, onUpdateStudy, sessions, wallpaperUrl, activePresetId, focusedGoalId])

  // ── Timer ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase === 'focus' && !timerRunning) setSecondsLeft(focusMinutes * 60)
    if (phase === 'break' && !timerRunning) setSecondsLeft(breakMinutes * 60)
  }, [focusMinutes, breakMinutes, phase, timerRunning])

  useEffect(() => {
    if (!timerRunning || secondsLeft <= 0) return
    const timer = window.setInterval(() => setSecondsLeft(p => p - 1), 1000)
    return () => window.clearInterval(timer)
  }, [timerRunning, secondsLeft])

  useEffect(() => {
    if (!timerRunning || secondsLeft > 0) return
    if (!muteSound) playBeep()
    const notify = (title: string, body: string) => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, { body, silent: true })
      }
    }
    if (phase === 'focus') {
      const focusedGoal = focusedGoalId ? goals.find(g => g.id === focusedGoalId) : null
      const activePreset = activePresetId
        ? (study.presets ?? []).find(p => p.id === activePresetId)
        : null
      setSessions(prev => [
        ...prev,
        {
          id: generateId(),
          completedAt: new Date().toISOString(),
          focusSeconds: focusMinutes * 60,
          goalId: focusedGoalId,
          presetName: activePreset?.name,
          category: focusedGoal?.category,
        },
      ])
      notify('Pomodoro concluido!', `${focusMinutes} min de foco completados. Hora do intervalo de ${breakMinutes} min.`)
      setPhase('break'); setSecondsLeft(breakMinutes * 60)
    } else {
      notify('Intervalo terminado', `Hora de focar! ${focusMinutes} min de concentracao.`)
      setPhase('focus'); setSecondsLeft(focusMinutes * 60)
    }
  }, [breakMinutes, focusMinutes, muteSound, phase, secondsLeft, timerRunning])

  // ── Media / dock effects ───────────────────────────────────────────────────

  useEffect(() => { if (dockMediaItems.length === 0) setDockCollapsed(false) }, [dockMediaItems.length])

  useEffect(() => {
    for (const item of mediaItems) {
      if (item.kind !== 'audio') continue
      const player = audioRefs.current[item.id]; if (!player) continue
      player.volume = item.volume; player.loop = item.loop
    }
  }, [mediaItems])

  useEffect(() => { if (searchPage > totalSearchPages) setSearchPage(totalSearchPages) }, [searchPage, totalSearchPages])

  // Sync goals → planning cards
  useEffect(() => {
    for (const goal of goals) {
      if (!goal.linkedPlanningCardId) continue
      const payload = JSON.stringify({ title: goal.title, priority: goal.priority, status: goal.status, checklist: goal.checklist })
      if (lastGoalSyncRef.current[goal.id] === payload) continue
      lastGoalSyncRef.current[goal.id] = payload
      onUpdatePlanningCard(goal.linkedPlanningCardId, { title: goal.title, priority: goal.priority as CardPriority | null, status: goal.status as CardStatus, checklist: cloneChecklist(goal.checklist) })
    }
  }, [goals, onUpdatePlanningCard])

  // ── Timer handlers ────────────────────────────────────────────────────────

  const toggleTimer = () => setTimerRunning(p => !p)
  const resetCurrentPhase = () => { setTimerRunning(false); setSecondsLeft(phase === 'focus' ? focusMinutes * 60 : breakMinutes * 60) }
  const skipPhase = () => { setTimerRunning(false); if (phase === 'focus') { setPhase('break'); setSecondsLeft(breakMinutes * 60) } else { setPhase('focus'); setSecondsLeft(focusMinutes * 60) } }
  const adjustFocus = (delta: number) => setFocusMinutes(p => clampMinutes(p + delta, 25))
  const adjustBreak = (delta: number) => setBreakMinutes(p => clampMinutes(p + delta, 5))

  // ── Goals handlers ────────────────────────────────────────────────────────

  const updateGoal = (goalId: string, updater: (g: StudyGoal) => StudyGoal) =>
    setGoals(p => p.map(g => g.id === goalId ? { ...updater(g), updatedAt: new Date().toISOString() } : g))

  const handleAddGoal = () => {
    const title = goalTitle.trim(); if (!title) return
    const now = new Date().toISOString()
    setGoals(p => [...p, { id: generateId(), title, priority: null, status: 'todo', checklist: [], linkedPlanningCardId: null, createdAt: now, updatedAt: now }])
    setGoalTitle('')
  }

  const removeGoal = (goalId: string) => {
    setGoals(p => p.filter(g => g.id !== goalId))
    setGoalChecklistDrafts(p => { const n = { ...p }; delete n[goalId]; return n })
  }

  const importPlanningCardAsGoal = (card: Card) => {
    if (goals.some(g => g.linkedPlanningCardId === card.id)) return
    const now = new Date().toISOString()
    setGoals(p => [...p, { id: generateId(), title: card.title, priority: card.priority, status: card.status, checklist: cloneChecklist(card.checklist), linkedPlanningCardId: card.id, createdAt: now, updatedAt: now }])
  }

  const refreshGoalFromPlanning = (goalId: string) => updateGoal(goalId, goal => {
    if (!goal.linkedPlanningCardId) return goal
    const card = linkedPlanningCards.get(goal.linkedPlanningCardId); if (!card) return goal
    return { ...goal, title: card.title, priority: card.priority, status: card.status, checklist: cloneChecklist(card.checklist) }
  })

  const addGoalChecklistItem = (goalId: string) => {
    const text = (goalChecklistDrafts[goalId] ?? '').trim(); if (!text) return
    updateGoal(goalId, g => ({ ...g, checklist: [...g.checklist, { id: generateId(), text, done: false }] }))
    setGoalChecklistDrafts(p => ({ ...p, [goalId]: '' }))
  }
  const toggleGoalChecklistItem = (goalId: string, checklistId: string) => updateGoal(goalId, g => ({ ...g, checklist: g.checklist.map(i => i.id === checklistId ? { ...i, done: !i.done } : i) }))
  const removeGoalChecklistItem = (goalId: string, checklistId: string) => updateGoal(goalId, g => ({ ...g, checklist: g.checklist.filter(i => i.id !== checklistId) }))

  // ── Wallpaper handlers ────────────────────────────────────────────────────

  const applyWallpaperUrl = (url: string) => { const n = url.trim(); if (!n) return; setWallpaperUrl(n) }
  const handleWallpaperUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return
    setWallpaperUrl(await blobToDataUrl(file)); event.target.value = ''
  }

  const searchImages = useCallback(async () => {
    const query = imageSearch.trim()
    if (!query) { setSearchResults([]); setSearchPage(1); setSearchError('Digite algo para pesquisar.'); return }
    setSearchLoading(true); setSearchError(null); setSearchResults([]); setSearchPage(1)
    try {
      const mapped = await searchWikimediaImages(query)
      if (mapped.length === 0) setSearchError('Nenhuma imagem encontrada para este termo.')
      setSearchResults(mapped)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Erro ao buscar imagens.')
    } finally { setSearchLoading(false) }
  }, [imageSearch])

  // ── Media handlers ────────────────────────────────────────────────────────

  const addMediaItem = () => {
    const candidate = buildMediaCandidate(mediaInput)
    if (!candidate) { setMediaError('Link invalido. Use YouTube ou URL de audio.'); return }
    setMediaItems(p => [{ ...candidate, id: generateId() }, ...p]); setMediaInput(''); setMediaError(null)
  }

  const updateMediaItem = (mediaId: string, updates: Partial<StudyMediaItem>) =>
    setMediaItems(p => p.map(i => i.id === mediaId ? { ...i, ...updates } : i))

  const removeMediaItem = (mediaId: string) => {
    setMediaItems(p => p.filter(i => i.id !== mediaId))
    delete audioRefs.current[mediaId]; delete youtubeDockRefs.current[mediaId]
    setYoutubePlaying(p => { const n = { ...p }; delete n[mediaId]; return n })
  }

  const sendYoutubeCommand = (mediaId: string, command: 'playVideo' | 'pauseVideo' | 'setVolume', args: Array<number | string> = []) => {
    const frame = youtubeDockRefs.current[mediaId]; if (!frame?.contentWindow) return
    frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func: command, args }), '*')
  }

  const toggleYoutubePreviewPlayback = (item: StudyMediaItem) => {
    if (item.kind !== 'youtube') return
    const isPlaying = youtubePlaying[item.id] === true
    const run = () => {
      if (isPlaying) sendYoutubeCommand(item.id, 'pauseVideo')
      else { sendYoutubeCommand(item.id, 'playVideo'); window.setTimeout(() => sendYoutubeCommand(item.id, 'playVideo'), 260) }
      setYoutubePlaying(p => ({ ...p, [item.id]: !isPlaying }))
    }
    if (!item.showDock) { updateMediaItem(item.id, { showDock: true }); window.setTimeout(run, 280) } else run()
  }

  return {
    // Panel
    activePanel, setActivePanel,
    // Wallpaper
    wallpaperUrl, setWallpaperUrl, wallpaperUrlInput, setWallpaperUrlInput,
    imageSearch, setImageSearch, searchLoading, searchError, searchResults, searchPage, setSearchPage,
    totalSearchPages, pagedSearchResults,
    applyWallpaperUrl, handleWallpaperUpload, searchImages,
    // Timer
    phase, timerRunning, secondsLeft, focusMinutes, breakMinutes, muteSound, setMuteSound,
    toggleTimer, resetCurrentPhase, skipPhase, adjustFocus, adjustBreak,
    // Goals
    goals, goalTitle, setGoalTitle, goalChecklistDrafts, setGoalChecklistDrafts,
    expandedGoals, setExpandedGoals, showPlanningPicker, setShowPlanningPicker,
    goalsConfigMode, setGoalsConfigMode, goalsDone, goalsOpen,
    availablePlanningCards, planningCards, linkedPlanningCards,
    updateGoal, handleAddGoal, removeGoal, importPlanningCardAsGoal, refreshGoalFromPlanning,
    addGoalChecklistItem, toggleGoalChecklistItem, removeGoalChecklistItem,
    // Stats
    totalFocusSeconds, todayFocusSeconds, sessions,
    // Upgrade 14
    focusedGoalId, setFocusedGoalId, activePresetId, setActivePresetId,
    study,
    // Media
    mediaInput, setMediaInput, mediaError, mediaItems, dockMediaItems,
    youtubePlaying, audioRefs, youtubeDockRefs, dockCollapsed, setDockCollapsed,
    addMediaItem, updateMediaItem, removeMediaItem, sendYoutubeCommand, toggleYoutubePreviewPlayback,
    // Quote
    quoteIndex, setQuoteIndex, currentQuote,
    // State refs (for external use)
    PRIORITY_LABELS, STATUS_LABELS,
  }
}
