import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Card, CardPriority, CardStatus, ChecklistItem, StudyGoal, StudyMediaItem, StudySessionLog, StudyState } from '../types'
import { DEFAULT_STUDY_STATE, PRIORITY_LABELS, STATUS_LABELS } from '../types'
import { detectUrlEmbed, generateId, getDayFromDate, getTodayISO, normalizeUrl } from '../utils'
import { STUDY_QUOTES } from '../config/studyQuotes'

interface StudyViewProps {
  cards: Card[]
  study: StudyState
  onUpdateStudy: (updater: (prev: StudyState) => StudyState) => void
  onUpdatePlanningCard: (
    cardId: string,
    updates: Partial<Pick<Card, 'title' | 'descriptionHtml' | 'priority' | 'status' | 'checklist'>>,
  ) => void
}

type StudyPanel = 'wallpaper' | 'audio' | 'quote' | 'stats' | 'goals' | null
type PomodoroPhase = 'focus' | 'break'
type StudySettingsPersisted = StudyState

interface SearchImageResult {
  id: string
  title: string
  thumbUrl: string
  fullUrl: string
  sourceUrl: string
}

const STORAGE_KEY = 'organon.study.v2'
const LEGACY_STORAGE_KEY = 'organon.study.v1'
const IMAGE_PAGE_SIZE = 6
const IMAGE_SEARCH_LIMIT = 30

const DEFAULT_STUDY_SETTINGS: StudySettingsPersisted = DEFAULT_STUDY_STATE

const clampMinutes = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback
  return Math.min(180, Math.max(1, Math.round(value)))
}

const clampVolume = (value: number): number => {
  if (!Number.isFinite(value)) return 0.6
  return Math.min(1, Math.max(0, value))
}

const cloneStudyState = (value: StudySettingsPersisted): StudySettingsPersisted => ({
  wallpaperUrl: value.wallpaperUrl,
  focusMinutes: value.focusMinutes,
  breakMinutes: value.breakMinutes,
  muteSound: value.muteSound,
  mediaItems: value.mediaItems.map(item => ({ ...item })),
  goals: value.goals.map(goal => ({
    ...goal,
    checklist: goal.checklist.map(item => ({ ...item })),
  })),
  sessions: value.sessions.map(session => ({ ...session })),
})

const hasStudyData = (value: StudySettingsPersisted): boolean => (
  value.wallpaperUrl.trim().length > 0 ||
  value.mediaItems.length > 0 ||
  value.goals.length > 0 ||
  value.sessions.length > 0 ||
  value.focusMinutes !== DEFAULT_STUDY_SETTINGS.focusMinutes ||
  value.breakMinutes !== DEFAULT_STUDY_SETTINGS.breakMinutes ||
  value.muteSound !== DEFAULT_STUDY_SETTINGS.muteSound
)

const formatClock = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds))
  const hh = Math.floor(safe / 3600)
  const mm = Math.floor((safe % 3600) / 60)
  const ss = safe % 60

  if (hh > 0) {
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

const formatHours = (seconds: number): string => {
  const hours = seconds / 3600
  return `${hours.toFixed(1)} h`
}

const htmlToPlain = (html: string): string => {
  if (!html.trim()) return ''
  if (typeof window === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent ?? '').trim()
}

const plainToHtml = (text: string): string => {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const escaped = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<p>${escaped.replace(/\n/g, '<br />')}</p>`
}

const cloneChecklist = (items: ChecklistItem[]): ChecklistItem[] => items.map(item => ({ ...item }))

const buildMediaCandidate = (value: string): Omit<StudyMediaItem, 'id'> | null => {
  const normalized = normalizeUrl(value)
  if (!normalized) return null
  const yt = detectUrlEmbed(normalized)
  if (yt?.type === 'youtube') {
    return {
      title: `YouTube - ${yt.videoId}`,
      url: normalized,
      kind: 'youtube',
      youtubeVideoId: yt.videoId,
      volume: 0.6,
      loop: true,
      showDock: true,
    }
  }

  let title = 'Audio externo'
  try {
    title = new URL(normalized).hostname.replace(/^www\./i, '')
  } catch {
    // ignore
  }

  return {
    title,
    url: normalized,
    kind: 'audio',
    youtubeVideoId: null,
    volume: 0.6,
    loop: true,
    showDock: true,
  }
}

const loadStudySettingsFromLocalStorage = (): StudySettingsPersisted | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY)

    if (!raw && !legacyRaw) return null

    const parsed = raw
      ? JSON.parse(raw) as Partial<StudySettingsPersisted>
      : {}

    const legacy = legacyRaw
      ? JSON.parse(legacyRaw) as Partial<{
        audioUrl: string
        audioVolume: number
        audioLoop: boolean
        showVideoPlayer: boolean
        goals: Array<{
          id?: string
          title?: string
          notes?: string
          done?: boolean
          linkedPlanningCardId?: string | null
          createdAt?: string
          updatedAt?: string
        }>
      }>
      : null

    const mediaItems = Array.isArray(parsed.mediaItems)
      ? parsed.mediaItems
      : []

    const migratedLegacyMedia: StudyMediaItem[] = []
    if (legacy?.audioUrl) {
      const candidate = buildMediaCandidate(legacy.audioUrl)
      if (candidate) {
        migratedLegacyMedia.push({
          ...candidate,
          id: generateId(),
          volume: clampVolume(Number(legacy.audioVolume)),
          loop: legacy.audioLoop !== false,
          showDock: legacy.showVideoPlayer !== false,
        })
      }
    }

    const parsedGoals = Array.isArray(parsed.goals)
      ? parsed.goals
      : Array.isArray(legacy?.goals)
        ? legacy.goals.map(goal => ({
          id: goal.id ?? generateId(),
          title: goal.title ?? '',
          description: goal.notes ?? '',
          priority: null,
          status: goal.done ? 'done' : 'todo',
          checklist: [],
          linkedPlanningCardId: goal.linkedPlanningCardId ?? null,
          createdAt: goal.createdAt ?? new Date().toISOString(),
          updatedAt: goal.updatedAt ?? new Date().toISOString(),
        }))
        : []

    return {
      wallpaperUrl: typeof parsed.wallpaperUrl === 'string' ? parsed.wallpaperUrl : '',
      focusMinutes: clampMinutes(Number(parsed.focusMinutes), DEFAULT_STUDY_SETTINGS.focusMinutes),
      breakMinutes: clampMinutes(Number(parsed.breakMinutes), DEFAULT_STUDY_SETTINGS.breakMinutes),
      muteSound: Boolean(parsed.muteSound),
      mediaItems: [
        ...mediaItems.filter(item => item && typeof item.url === 'string').map(item => ({
          id: item.id ?? generateId(),
          title: item.title ?? 'Midia',
          url: item.url ?? '',
          kind: (item.kind === 'youtube' ? 'youtube' : 'audio') as 'youtube' | 'audio',
          youtubeVideoId: item.youtubeVideoId ?? null,
          volume: clampVolume(Number(item.volume)),
          loop: item.loop !== false,
          showDock: item.showDock !== false,
        })),
        ...migratedLegacyMedia,
      ],
      goals: parsedGoals
        .filter(goal => goal && typeof goal.title === 'string' && goal.title.trim().length > 0)
        .map(goal => ({
          id: goal.id ?? generateId(),
          title: goal.title.trim(),
          description: goal.description ?? '',
          priority: goal.priority && ['P1', 'P2', 'P3', 'P4'].includes(goal.priority) ? goal.priority as CardPriority : null,
          status: goal.status && ['todo', 'in_progress', 'blocked', 'done'].includes(goal.status) ? goal.status as CardStatus : 'todo',
          checklist: Array.isArray(goal.checklist)
            ? goal.checklist.map(item => ({
              id: item.id ?? generateId(),
              text: item.text ?? '',
              done: Boolean(item.done),
            })).filter(item => item.text.trim().length > 0)
            : [],
          linkedPlanningCardId: goal.linkedPlanningCardId ?? null,
          createdAt: goal.createdAt ?? new Date().toISOString(),
          updatedAt: goal.updatedAt ?? new Date().toISOString(),
        })),
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    }
  } catch {
    return null
  }
}

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Falha ao ler imagem'))
    reader.readAsDataURL(blob)
  })

const playBeep = () => {
  const audioCtx = new AudioContext()
  const oscillator = audioCtx.createOscillator()
  const gainNode = audioCtx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(860, audioCtx.currentTime)
  gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 0.02)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25)

  oscillator.connect(gainNode)
  gainNode.connect(audioCtx.destination)
  oscillator.start()
  oscillator.stop(audioCtx.currentTime + 0.28)
  oscillator.onended = () => {
    void audioCtx.close()
  }
}

export const StudyView = ({ cards, study, onUpdateStudy, onUpdatePlanningCard }: StudyViewProps) => {
  const [initialSettings] = useState<StudySettingsPersisted>(() => cloneStudyState(study))
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
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({})
  const youtubeDockRefs = useRef<Record<string, HTMLIFrameElement | null>>({})
  const [youtubePlaying, setYoutubePlaying] = useState<Record<string, boolean>>({})
  const lastGoalSyncRef = useRef<Record<string, string>>({})

  const [goals, setGoals] = useState<StudyGoal[]>(initialSettings.goals)
  const [goalTitle, setGoalTitle] = useState('')
  const [goalChecklistDrafts, setGoalChecklistDrafts] = useState<Record<string, string>>({})
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({})
  const [showPlanningPicker, setShowPlanningPicker] = useState(true)
  const [goalsConfigMode, setGoalsConfigMode] = useState(false)

  const [sessions, setSessions] = useState<StudySessionLog[]>(initialSettings.sessions)

  const [wallpaperUrlInput, setWallpaperUrlInput] = useState('')
  const [imageSearch, setImageSearch] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<SearchImageResult[]>([])
  const [searchPage, setSearchPage] = useState(1)
  const [dockCollapsed, setDockCollapsed] = useState(false)

  const [quoteIndex, setQuoteIndex] = useState(() => {
    const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000))
    return dayIndex % STUDY_QUOTES.length
  })

  const todayIso = getTodayISO()
  const todayDay = getDayFromDate(todayIso)

  const planningCards = useMemo(() => {
    const withDate = cards.filter(card => card.hasDate && card.date === todayIso)
    const withoutDate = cards
      .filter(card => !card.hasDate && card.location.day === todayDay && !!card.location.period)

    const unique = new Map<string, Card>()
    for (const card of [...withDate, ...withoutDate]) {
      unique.set(card.id, card)
    }
    return Array.from(unique.values()).sort((a, b) => a.order - b.order)
  }, [cards, todayDay, todayIso])

  const linkedPlanningCards = useMemo(() => {
    const map = new Map<string, Card>()
    for (const card of cards) {
      map.set(card.id, card)
    }
    return map
  }, [cards])

  const availablePlanningCards = useMemo(() => {
    const linkedIds = new Set(goals.map(goal => goal.linkedPlanningCardId).filter(Boolean))
    return planningCards.filter(card => !linkedIds.has(card.id))
  }, [goals, planningCards])

  const dockMediaItems = useMemo(() => mediaItems.filter(item => item.showDock), [mediaItems])

  const totalFocusSeconds = useMemo(
    () => sessions.reduce((sum, session) => sum + session.focusSeconds, 0),
    [sessions],
  )

  const todayFocusSeconds = useMemo(() => {
    return sessions
      .filter(session => session.completedAt.slice(0, 10) === todayIso)
      .reduce((sum, session) => sum + session.focusSeconds, 0)
  }, [sessions, todayIso])

  const goalsDone = useMemo(() => goals.filter(goal => goal.status === 'done').length, [goals])
  const goalsOpen = goals.length - goalsDone
  const totalSearchPages = Math.max(1, Math.ceil(searchResults.length / IMAGE_PAGE_SIZE))
  const pagedSearchResults = useMemo(() => {
    const start = (searchPage - 1) * IMAGE_PAGE_SIZE
    return searchResults.slice(start, start + IMAGE_PAGE_SIZE)
  }, [searchPage, searchResults])

  useEffect(() => {
    if (didBootstrapRef.current) return

    const studyFromStore = cloneStudyState(study)
    const localStorageStudy = loadStudySettingsFromLocalStorage()
    const source = !hasStudyData(studyFromStore) && localStorageStudy && hasStudyData(localStorageStudy)
      ? localStorageStudy
      : studyFromStore

    setWallpaperUrl(source.wallpaperUrl)
    setFocusMinutes(source.focusMinutes)
    setBreakMinutes(source.breakMinutes)
    setMuteSound(source.muteSound)
    setMediaItems(source.mediaItems)
    setGoals(source.goals)
    setSessions(source.sessions)
    setSecondsLeft(source.focusMinutes * 60)

    if (!hasStudyData(studyFromStore) && localStorageStudy && hasStudyData(localStorageStudy)) {
      onUpdateStudy(() => cloneStudyState(localStorageStudy))
      try {
        window.localStorage.removeItem(STORAGE_KEY)
        window.localStorage.removeItem(LEGACY_STORAGE_KEY)
      } catch {
        // ignore
      }
    }

    didBootstrapRef.current = true
  }, [onUpdateStudy, study])

  useEffect(() => {
    if (!didBootstrapRef.current) return

    const persisted: StudySettingsPersisted = {
      wallpaperUrl,
      focusMinutes,
      breakMinutes,
      muteSound,
      mediaItems,
      goals,
      sessions,
    }
    onUpdateStudy(() => cloneStudyState(persisted))
  }, [
    breakMinutes,
    focusMinutes,
    goals,
    mediaItems,
    muteSound,
    onUpdateStudy,
    sessions,
    wallpaperUrl,
  ])

  useEffect(() => {
    if (phase === 'focus' && !timerRunning) {
      setSecondsLeft(focusMinutes * 60)
    }
    if (phase === 'break' && !timerRunning) {
      setSecondsLeft(breakMinutes * 60)
    }
  }, [focusMinutes, breakMinutes, phase, timerRunning])

  useEffect(() => {
    if (!timerRunning) return
    if (secondsLeft <= 0) return

    const timer = window.setInterval(() => {
      setSecondsLeft(prev => prev - 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [timerRunning, secondsLeft])

  useEffect(() => {
    if (!timerRunning || secondsLeft > 0) return

    if (!muteSound) {
      playBeep()
    }

    if (phase === 'focus') {
      setSessions(prev => [
        ...prev,
        {
          id: generateId(),
          completedAt: new Date().toISOString(),
          focusSeconds: focusMinutes * 60,
        },
      ])
      setPhase('break')
      setSecondsLeft(breakMinutes * 60)
      return
    }

    setPhase('focus')
    setSecondsLeft(focusMinutes * 60)
  }, [breakMinutes, focusMinutes, muteSound, phase, secondsLeft, timerRunning])

  useEffect(() => {
    if (dockMediaItems.length > 0) return
    setDockCollapsed(false)
  }, [dockMediaItems.length])

  useEffect(() => {
    for (const item of mediaItems) {
      if (item.kind !== 'audio') continue
      const player = audioRefs.current[item.id]
      if (!player) continue
      player.volume = item.volume
      player.loop = item.loop
    }
  }, [mediaItems])

  useEffect(() => {
    if (searchPage <= totalSearchPages) return
    setSearchPage(totalSearchPages)
  }, [searchPage, totalSearchPages])

  useEffect(() => {
    for (const goal of goals) {
      if (!goal.linkedPlanningCardId) continue
      const payload = {
        title: goal.title,
        descriptionHtml: plainToHtml(goal.description),
        priority: goal.priority,
        status: goal.status,
        checklist: cloneChecklist(goal.checklist),
      }
      const hash = JSON.stringify(payload)
      if (lastGoalSyncRef.current[goal.id] === hash) continue
      lastGoalSyncRef.current[goal.id] = hash
      onUpdatePlanningCard(goal.linkedPlanningCardId, payload)
    }
  }, [goals, onUpdatePlanningCard])

  const toggleTimer = () => {
    setTimerRunning(prev => !prev)
  }

  const resetCurrentPhase = () => {
    setTimerRunning(false)
    setSecondsLeft((phase === 'focus' ? focusMinutes : breakMinutes) * 60)
  }

  const skipPhase = () => {
    setTimerRunning(false)
    if (phase === 'focus') {
      setPhase('break')
      setSecondsLeft(breakMinutes * 60)
    } else {
      setPhase('focus')
      setSecondsLeft(focusMinutes * 60)
    }
  }

  const adjustFocus = (delta: number) => {
    setFocusMinutes(prev => clampMinutes(prev + delta, 25))
  }

  const adjustBreak = (delta: number) => {
    setBreakMinutes(prev => clampMinutes(prev + delta, 5))
  }

  const handleAddGoal = () => {
    const title = goalTitle.trim()
    if (!title) return
    const now = new Date().toISOString()
    setGoals(prev => [
      ...prev,
      {
        id: generateId(),
        title,
        description: '',
        priority: null,
        status: 'todo',
        checklist: [],
        linkedPlanningCardId: null,
        createdAt: now,
        updatedAt: now,
      },
    ])
    setGoalTitle('')
  }

  const updateGoal = (goalId: string, updater: (goal: StudyGoal) => StudyGoal) => {
    setGoals(prev => prev.map(goal => (
      goal.id === goalId
        ? { ...updater(goal), updatedAt: new Date().toISOString() }
        : goal
    )))
  }

  const removeGoal = (goalId: string) => {
    setGoals(prev => prev.filter(goal => goal.id !== goalId))
    setGoalChecklistDrafts(prev => {
      const next = { ...prev }
      delete next[goalId]
      return next
    })
  }

  const importPlanningCardAsGoal = (card: Card) => {
    if (goals.some(goal => goal.linkedPlanningCardId === card.id)) return

    const now = new Date().toISOString()
    setGoals(prev => [
      ...prev,
      {
        id: generateId(),
        title: card.title,
        description: htmlToPlain(card.descriptionHtml),
        priority: card.priority,
        status: card.status,
        checklist: cloneChecklist(card.checklist),
        linkedPlanningCardId: card.id,
        createdAt: now,
        updatedAt: now,
      },
    ])
  }

  const refreshGoalFromPlanning = (goalId: string) => {
    updateGoal(goalId, goal => {
      if (!goal.linkedPlanningCardId) return goal
      const card = linkedPlanningCards.get(goal.linkedPlanningCardId)
      if (!card) return goal
      return {
        ...goal,
        title: card.title,
        description: htmlToPlain(card.descriptionHtml),
        priority: card.priority,
        status: card.status,
        checklist: cloneChecklist(card.checklist),
      }
    })
  }

  const addGoalChecklistItem = (goalId: string) => {
    const text = (goalChecklistDrafts[goalId] ?? '').trim()
    if (!text) return
    updateGoal(goalId, goal => ({
      ...goal,
      checklist: [
        ...goal.checklist,
        { id: generateId(), text, done: false },
      ],
    }))
    setGoalChecklistDrafts(prev => ({ ...prev, [goalId]: '' }))
  }

  const toggleGoalChecklistItem = (goalId: string, checklistId: string) => {
    updateGoal(goalId, goal => ({
      ...goal,
      checklist: goal.checklist.map(item => (
        item.id === checklistId ? { ...item, done: !item.done } : item
      )),
    }))
  }

  const removeGoalChecklistItem = (goalId: string, checklistId: string) => {
    updateGoal(goalId, goal => ({
      ...goal,
      checklist: goal.checklist.filter(item => item.id !== checklistId),
    }))
  }

  const applyWallpaperUrl = (url: string) => {
    const normalized = url.trim()
    if (!normalized) return
    setWallpaperUrl(normalized)
  }

  const handleWallpaperUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const dataUrl = await blobToDataUrl(file)
    setWallpaperUrl(dataUrl)
    event.target.value = ''
  }

  const searchImages = useCallback(async () => {
    const query = imageSearch.trim()
    if (!query) {
      setSearchResults([])
      setSearchPage(1)
      setSearchError('Digite algo para pesquisar.')
      return
    }

    setSearchLoading(true)
    setSearchError(null)
    setSearchResults([])
    setSearchPage(1)

    try {
      const apiUrl = new URL('https://commons.wikimedia.org/w/api.php')
      apiUrl.searchParams.set('action', 'query')
      apiUrl.searchParams.set('format', 'json')
      apiUrl.searchParams.set('origin', '*')
      apiUrl.searchParams.set('generator', 'search')
      apiUrl.searchParams.set('gsrnamespace', '6')
      apiUrl.searchParams.set('gsrlimit', String(IMAGE_SEARCH_LIMIT))
      apiUrl.searchParams.set('gsrsearch', query)
      apiUrl.searchParams.set('prop', 'imageinfo')
      apiUrl.searchParams.set('iiprop', 'url')
      apiUrl.searchParams.set('iiurlwidth', '640')

      const response = await fetch(apiUrl.toString())
      if (!response.ok) {
        throw new Error(`Falha na busca (${response.status})`)
      }

      const data = await response.json() as {
        query?: {
          pages?: Record<string, {
            pageid: number
            title: string
            imageinfo?: Array<{
              thumburl?: string
              url?: string
              descriptionurl?: string
            }>
          }>
        }
      }

      const pages = Object.values(data.query?.pages ?? {})
      const mapped: SearchImageResult[] = pages
        .map(page => {
          const info = page.imageinfo?.[0]
          if (!info?.url) return null
          return {
            id: String(page.pageid),
            title: page.title.replace(/^File:/i, ''),
            thumbUrl: info.thumburl ?? info.url,
            fullUrl: info.url,
            sourceUrl: info.descriptionurl ?? 'https://commons.wikimedia.org',
          }
        })
        .filter((item): item is SearchImageResult => Boolean(item))

      if (mapped.length === 0) {
        setSearchError('Nenhuma imagem encontrada para este termo.')
      }
      setSearchResults(mapped)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar imagens.'
      setSearchError(message)
    } finally {
      setSearchLoading(false)
    }
  }, [imageSearch])

  const addMediaItem = () => {
    const candidate = buildMediaCandidate(mediaInput)
    if (!candidate) {
      setMediaError('Link invalido. Use YouTube ou URL de audio.')
      return
    }
    setMediaItems(prev => [{ ...candidate, id: generateId() }, ...prev])
    setMediaInput('')
    setMediaError(null)
  }

  const updateMediaItem = (mediaId: string, updates: Partial<StudyMediaItem>) => {
    setMediaItems(prev => prev.map(item => (
      item.id === mediaId ? { ...item, ...updates } : item
    )))
  }

  const removeMediaItem = (mediaId: string) => {
    setMediaItems(prev => prev.filter(item => item.id !== mediaId))
    delete audioRefs.current[mediaId]
    delete youtubeDockRefs.current[mediaId]
    setYoutubePlaying(prev => {
      const next = { ...prev }
      delete next[mediaId]
      return next
    })
  }

  const sendYoutubeCommand = (
    mediaId: string,
    command: 'playVideo' | 'pauseVideo' | 'setVolume',
    args: Array<number | string> = [],
  ) => {
    const frame = youtubeDockRefs.current[mediaId]
    if (!frame?.contentWindow) return
    frame.contentWindow.postMessage(
      JSON.stringify({
        event: 'command',
        func: command,
        args,
      }),
      '*',
    )
  }

  const toggleYoutubePreviewPlayback = (item: StudyMediaItem) => {
    if (item.kind !== 'youtube') return
    const isPlaying = youtubePlaying[item.id] === true
    const runCommand = () => {
      if (isPlaying) {
        sendYoutubeCommand(item.id, 'pauseVideo')
      } else {
        sendYoutubeCommand(item.id, 'playVideo')
        window.setTimeout(() => sendYoutubeCommand(item.id, 'playVideo'), 260)
      }
      setYoutubePlaying(prev => ({ ...prev, [item.id]: !isPlaying }))
    }

    if (!item.showDock) {
      updateMediaItem(item.id, { showDock: true })
      window.setTimeout(runCommand, 280)
      return
    }

    runCommand()
  }

  const currentQuote = STUDY_QUOTES[quoteIndex % STUDY_QUOTES.length]

  return (
    <div
      className="study-view"
      style={{
        backgroundImage: wallpaperUrl
          ? `linear-gradient(140deg, rgba(0, 0, 0, 0.34), rgba(0, 0, 0, 0.62)), url("${wallpaperUrl}")`
          : 'radial-gradient(circle at 18% 14%, var(--color-primary-light) 0%, transparent 30%), radial-gradient(circle at 84% 0%, var(--color-primary-light) 0%, transparent 36%), linear-gradient(140deg, var(--color-background) 0%, var(--color-background-secondary) 52%, var(--color-background) 100%)',
      }}
    >
      <div className="study-left-stack">
        <div className="study-mini-cards">
          <article className="study-card study-card-mini">
            <span className="study-card-label">Tempo total</span>
            <strong className="study-card-value">{formatHours(totalFocusSeconds)}</strong>
          </article>
          <article className="study-card study-card-mini">
            <span className="study-card-label">Metas concluidas</span>
            <strong className="study-card-value">{goalsDone}/{goals.length}</strong>
          </article>
        </div>

        <article className="study-card study-session-card">
          <header className="study-session-header">
            <div>
              <span className="study-card-label">Sessao atual</span>
              <strong className="study-session-date">
                {new Date().toLocaleDateString('pt-BR')}
              </strong>
            </div>
            <span className={`study-phase-chip ${phase === 'focus' ? 'focus' : 'break'}`}>
              {phase === 'focus' ? 'Foco' : 'Descanso'}
            </span>
          </header>

          <div className="study-timer">{formatClock(secondsLeft)}</div>

          <div className="study-session-actions study-session-actions-icons">
            <button type="button" className="study-btn study-btn-icon" onClick={toggleTimer} title={timerRunning ? 'Pausar' : 'Iniciar'}>
              {timerRunning ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                  <polygon points="8 5 19 12 8 19" />
                </svg>
              )}
            </button>
            <button type="button" className="study-btn study-btn-icon study-btn-ghost" onClick={resetCurrentPhase} title="Resetar fase">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 3v6h6" />
              </svg>
            </button>
            <button type="button" className="study-btn study-btn-icon study-btn-ghost" onClick={skipPhase} title="Pular fase">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <polygon points="5 4 15 12 5 20 5 4" />
                <line x1="19" y1="5" x2="19" y2="19" />
              </svg>
            </button>
          </div>

          <div className="study-session-config study-session-config-stepper">
            <label>
              Foco
              <div className="study-stepper">
                <button type="button" className="study-stepper-btn" onClick={() => adjustFocus(-1)}>-</button>
                <strong>{focusMinutes} min</strong>
                <button type="button" className="study-stepper-btn" onClick={() => adjustFocus(1)}>+</button>
              </div>
            </label>
            <label>
              Descanso
              <div className="study-stepper">
                <button type="button" className="study-stepper-btn" onClick={() => adjustBreak(-1)}>-</button>
                <strong>{breakMinutes} min</strong>
                <button type="button" className="study-stepper-btn" onClick={() => adjustBreak(1)}>+</button>
              </div>
            </label>
          </div>

          <label className="study-mute-toggle">
            <input
              type="checkbox"
              checked={muteSound}
              onChange={e => setMuteSound(e.target.checked)}
            />
            Mutar aviso sonoro
          </label>
        </article>
      </div>

      <aside className="study-right-toolbar">
        <button
          type="button"
          className={`study-toolbar-btn ${activePanel === 'wallpaper' ? 'is-active' : ''}`}
          onClick={() => setActivePanel(prev => prev === 'wallpaper' ? null : 'wallpaper')}
          title="Fundo"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        </button>
        <button
          type="button"
          className={`study-toolbar-btn ${activePanel === 'audio' ? 'is-active' : ''}`}
          onClick={() => setActivePanel(prev => prev === 'audio' ? null : 'audio')}
          title="Audio"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </button>
        <button
          type="button"
          className={`study-toolbar-btn ${activePanel === 'quote' ? 'is-active' : ''}`}
          onClick={() => setActivePanel(prev => prev === 'quote' ? null : 'quote')}
          title="Quote"
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.17 6A4.17 4.17 0 0 0 3 10.17V18a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-5a3 3 0 0 0-3-3H7V9a2.17 2.17 0 0 1 2.17-2.17H10V4H7.17Zm10 0A4.17 4.17 0 0 0 13 10.17V18a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-5a3 3 0 0 0-3-3h-3V9a2.17 2.17 0 0 1 2.17-2.17H20V4h-2.83Z" />
          </svg>
        </button>
        <button
          type="button"
          className={`study-toolbar-btn ${activePanel === 'stats' ? 'is-active' : ''}`}
          onClick={() => setActivePanel(prev => prev === 'stats' ? null : 'stats')}
          title="Estatisticas"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <rect x="7" y="12" width="3" height="6" />
            <rect x="12" y="8" width="3" height="10" />
            <rect x="17" y="5" width="3" height="13" />
          </svg>
        </button>
        <button
          type="button"
          className={`study-toolbar-btn ${activePanel === 'goals' ? 'is-active' : ''}`}
          onClick={() => setActivePanel(prev => prev === 'goals' ? null : 'goals')}
          title="Metas"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </aside>

      {activePanel && (
        <div className="study-floating-panel">
          {activePanel === 'wallpaper' && (
            <div className="study-panel-section">
              <h3>Fundo</h3>
              <label className="study-file-upload-btn">
                <input type="file" accept="image/*" onChange={handleWallpaperUpload} />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Escolher imagem local
              </label>

              <div className="study-input-row">
                <input
                  type="text"
                  value={wallpaperUrlInput}
                  onChange={e => setWallpaperUrlInput(e.target.value)}
                  placeholder="URL de imagem"
                />
                <button type="button" className="study-btn" onClick={() => { void applyWallpaperUrl(wallpaperUrlInput) }}>
                  Aplicar
                </button>
              </div>

              <p className="study-panel-hint">Pesquisa web: 6 imagens por pagina (3x2).</p>
              <div className="study-input-row">
                <input
                  type="text"
                  value={imageSearch}
                  onChange={e => setImageSearch(e.target.value)}
                  placeholder="Pesquisar imagem na internet"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void searchImages()
                    }
                  }}
                />
                <button type="button" className="study-btn" onClick={() => { void searchImages() }}>
                  Buscar
                </button>
              </div>

              {searchLoading && <p className="study-panel-hint">Buscando imagens...</p>}
              {searchError && <p className="study-panel-error">{searchError}</p>}

              {searchResults.length > 0 && (
                <>
                  <div className="study-image-grid">
                    {pagedSearchResults.map(image => (
                      <button
                        key={image.id}
                        type="button"
                        className="study-image-item"
                        onClick={() => { void applyWallpaperUrl(image.fullUrl) }}
                        title={image.title}
                      >
                        <img src={image.thumbUrl} alt={image.title} loading="lazy" />
                        <span>{image.title}</span>
                      </button>
                    ))}
                  </div>

                  <div className="study-pagination">
                    <button
                      type="button"
                      className="study-btn study-btn-ghost"
                      onClick={() => setSearchPage(prev => Math.max(1, prev - 1))}
                      disabled={searchPage <= 1}
                    >
                      Anterior
                    </button>
                    <strong>{searchPage} / {totalSearchPages}</strong>
                    <button
                      type="button"
                      className="study-btn study-btn-ghost"
                      onClick={() => setSearchPage(prev => Math.min(totalSearchPages, prev + 1))}
                      disabled={searchPage >= totalSearchPages}
                    >
                      Proxima
                    </button>
                  </div>
                </>
              )}

              <button type="button" className="study-btn study-btn-ghost" onClick={() => setWallpaperUrl('')}>
                Remover fundo
              </button>
            </div>
          )}

          {activePanel === 'audio' && (
            <div className="study-panel-section">
              <h3>Audio / Video</h3>
              <div className="study-input-row">
                <input
                  type="text"
                  value={mediaInput}
                  onChange={e => setMediaInput(e.target.value)}
                  placeholder="Cole link de YouTube ou audio"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addMediaItem()
                    }
                  }}
                />
                <button type="button" className="study-btn study-btn-icon" onClick={addMediaItem} title="Adicionar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>
              {mediaError && <p className="study-panel-error">{mediaError}</p>}

              <div className="study-media-list">
                {mediaItems.length === 0 && (
                  <p className="study-panel-hint">Nenhuma midia adicionada.</p>
                )}

                {mediaItems.map(item => (
                  <article key={item.id} className={`study-media-item ${item.kind === 'youtube' ? 'is-youtube' : ''}`}>
                    <div className="study-media-item-head">
                      <div>
                        <span className={`study-media-kind ${item.kind}`}>{item.kind === 'youtube' ? 'YouTube' : 'Audio'}</span>
                        <strong>{item.title}</strong>
                      </div>
                      <div className="study-media-item-actions">
                        <button
                          type="button"
                          className="study-btn study-btn-ghost study-btn-icon"
                          onClick={() => updateMediaItem(item.id, { showDock: !item.showDock })}
                          title={item.showDock ? 'Ocultar do player' : 'Mostrar no player'}
                        >
                          {item.showDock ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.89 1 12c.62-1.76 1.68-3.31 3.06-4.5" />
                              <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                              <path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a11.05 11.05 0 0 1-4.09 5.09" />
                              <path d="M1 1l22 22" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                        <button
                          type="button"
                          className="study-btn study-btn-danger study-btn-icon"
                          onClick={() => removeMediaItem(item.id)}
                          title="Remover midia"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {item.kind === 'youtube' && item.youtubeVideoId && (
                      <div className="study-media-inline-youtube">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${item.youtubeVideoId}?rel=0&modestbranding=1&playsinline=1&controls=0&disablekb=1`}
                          title={`study-media-preview-${item.id}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          referrerPolicy="strict-origin-when-cross-origin"
                          tabIndex={-1}
                          allowFullScreen
                        />
                        <div className="study-media-youtube-controls">
                          <button
                            type="button"
                            className="study-btn study-btn-ghost study-btn-icon"
                            onClick={() => toggleYoutubePreviewPlayback(item)}
                            title={youtubePlaying[item.id] ? 'Pausar no player' : 'Tocar no player'}
                          >
                            {youtubePlaying[item.id] ? (
                              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                <rect x="6" y="5" width="4" height="14" rx="1" />
                                <rect x="14" y="5" width="4" height="14" rx="1" />
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                <polygon points="8 5 19 12 8 19" />
                              </svg>
                            )}
                          </button>
                          <button
                            type="button"
                            className={`study-btn study-btn-ghost study-btn-icon ${item.loop ? 'is-active' : ''}`}
                            onClick={() => updateMediaItem(item.id, { loop: !item.loop })}
                            title={item.loop ? 'Loop ligado' : 'Loop desligado'}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <path d="M17 1v4M7 1v4M3 10a9 9 0 1 0 18 0a9 9 0 0 0-18 0Z" />
                              <path d="M8 10a4 4 0 1 1 8 0" />
                            </svg>
                          </button>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={item.volume}
                            onChange={e => {
                              const nextVolume = clampVolume(Number(e.target.value))
                              updateMediaItem(item.id, { volume: nextVolume })
                              sendYoutubeCommand(item.id, 'setVolume', [Math.round(nextVolume * 100)])
                            }}
                            className="study-media-volume-range"
                            title="Volume do player"
                          />
                        </div>
                      </div>
                    )}

                    {item.kind === 'audio' && (
                      <>
                        <audio
                          ref={el => { audioRefs.current[item.id] = el }}
                          controls
                          src={item.url}
                          className="study-audio-player"
                        />
                        <div className="study-media-audio-config">
                          <label className="study-input-group">
                            Volume
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.01}
                              value={item.volume}
                              onChange={e => updateMediaItem(item.id, { volume: clampVolume(Number(e.target.value)) })}
                            />
                          </label>
                          <label className="study-mute-toggle">
                            <input
                              type="checkbox"
                              checked={item.loop}
                              onChange={e => updateMediaItem(item.id, { loop: e.target.checked })}
                            />
                            Loop
                          </label>
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}

          {activePanel === 'quote' && (
            <div className="study-panel-section">
              <h3>Quote do dia</h3>
              <blockquote className="study-quote-card">
                <p>{currentQuote.text}</p>
                <footer>{currentQuote.author}</footer>
              </blockquote>
              <button
                type="button"
                className="study-btn"
                onClick={() => setQuoteIndex(prev => (prev + 1) % STUDY_QUOTES.length)}
              >
                Trocar quote
              </button>
            </div>
          )}

          {activePanel === 'stats' && (
            <div className="study-panel-section">
              <h3>Estatisticas</h3>
              <div className="study-stats-grid">
                <article className="study-stat-box">
                  <span>Tempo total</span>
                  <strong>{formatHours(totalFocusSeconds)}</strong>
                </article>
                <article className="study-stat-box">
                  <span>Tempo hoje</span>
                  <strong>{formatHours(todayFocusSeconds)}</strong>
                </article>
                <article className="study-stat-box">
                  <span>Sessoes</span>
                  <strong>{sessions.length}</strong>
                </article>
                <article className="study-stat-box">
                  <span>Metas abertas</span>
                  <strong>{goalsOpen}</strong>
                </article>
              </div>
            </div>
          )}

          {activePanel === 'goals' && (
            <div className="study-panel-section">
              <div className="study-goals-panel-header">
                <h3>Metas de estudo</h3>
                <button
                  type="button"
                  className={`study-btn study-btn-icon study-btn-ghost ${goalsConfigMode ? 'is-active' : ''}`}
                  onClick={() => setGoalsConfigMode(prev => !prev)}
                  title={goalsConfigMode ? 'Fechar configuracao' : 'Configurar metas'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82L4.21 7.2a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                  </svg>
                </button>
              </div>

              {!goalsConfigMode && (
                <div className="study-goals-cards">
                  {goals.length === 0 && (
                    <p className="study-panel-hint">Sem metas ainda. Abra configuracao para criar.</p>
                  )}

                  {goals.map(goal => {
                    const linkedCard = goal.linkedPlanningCardId
                      ? linkedPlanningCards.get(goal.linkedPlanningCardId)
                      : null
                    const doneChecklist = goal.checklist.filter(item => item.done).length
                    const checklistTotal = goal.checklist.length
                    return (
                      <article key={goal.id} className="study-goal-card-view">
                        <header>
                          <strong>{goal.title}</strong>
                          <span className={`study-goal-card-status is-${goal.status}`}>{STATUS_LABELS[goal.status]}</span>
                        </header>
                        {goal.description.trim() && (
                          <p>{goal.description}</p>
                        )}
                        <footer>
                          <small>{goal.priority ? `${goal.priority} - ${PRIORITY_LABELS[goal.priority]}` : 'Sem prioridade'}</small>
                          <small>{checklistTotal > 0 ? `${doneChecklist}/${checklistTotal} checklist` : 'Sem checklist'}</small>
                        </footer>
                        {goal.linkedPlanningCardId && (
                          <div className="study-goal-actions">
                            <small>{linkedCard?.title ?? 'Card de origem removido'}</small>
                            <small>Vinculada ao planejamento</small>
                          </div>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}

              {goalsConfigMode && (
                <>
                  <div className="study-input-row">
                    <input
                      type="text"
                      value={goalTitle}
                      onChange={e => setGoalTitle(e.target.value)}
                      placeholder="Titulo da meta"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddGoal()
                        }
                      }}
                    />
                    <button type="button" className="study-btn study-btn-icon" onClick={handleAddGoal} title="Adicionar meta">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </div>

                  <div className="study-planning-picker">
                    <button
                      type="button"
                      className="study-btn study-btn-ghost study-planning-picker-toggle"
                      onClick={() => setShowPlanningPicker(prev => !prev)}
                    >
                      <span>Planejamento de hoje</span>
                      <strong>{availablePlanningCards.length}</strong>
                    </button>

                    {showPlanningPicker && (
                      <>
                        {availablePlanningCards.length > 0 ? (
                          availablePlanningCards.map(card => (
                            <button
                              key={card.id}
                              type="button"
                              className="study-planning-picker-item"
                              onClick={() => importPlanningCardAsGoal(card)}
                            >
                              <div>
                                <strong>{card.title}</strong>
                                <small>{card.priority ? `${card.priority} - ` : ''}{STATUS_LABELS[card.status]}</small>
                              </div>
                              <span>Virar meta</span>
                            </button>
                          ))
                        ) : (
                          <p className="study-panel-hint">Sem cards disponiveis para importar hoje.</p>
                        )}
                      </>
                    )}
                  </div>

                  {planningCards.length > 0 && (
                    <div className="study-panel-hint">
                      Hoje no planejamento: {planningCards.length} card(s)
                    </div>
                  )}

                  <div className="study-goals-list">
                    {goals.length === 0 && (
                      <p className="study-panel-hint">Sem metas ainda.</p>
                    )}

                    {goals.map(goal => {
                      const isExpanded = expandedGoals[goal.id] !== false
                      const linkedCard = goal.linkedPlanningCardId
                        ? linkedPlanningCards.get(goal.linkedPlanningCardId)
                        : null

                      return (
                        <article key={goal.id} className="study-goal-item">
                          <div className="study-goal-header">
                            <label className="study-mute-toggle study-goal-done-toggle">
                              <input
                                type="checkbox"
                                checked={goal.status === 'done'}
                                onChange={e => updateGoal(goal.id, current => ({
                                  ...current,
                                  status: e.target.checked ? 'done' : 'todo',
                                }))}
                              />
                              <span className={goal.status === 'done' ? 'is-done' : ''}>Feito</span>
                            </label>
                            <input
                              type="text"
                              className="study-goal-title-input"
                              value={goal.title}
                              onChange={e => updateGoal(goal.id, current => ({ ...current, title: e.target.value }))}
                              placeholder="Titulo da meta"
                            />
                            <button
                              type="button"
                              className="study-btn study-btn-ghost study-btn-icon"
                              onClick={() => setExpandedGoals(prev => ({ ...prev, [goal.id]: !isExpanded }))}
                              title={isExpanded ? 'Ocultar detalhes' : 'Abrir detalhes'}
                            >
                              {isExpanded ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                  <path d="m18 15-6-6-6 6" />
                                </svg>
                              ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                  <path d="m6 9 6 6 6-6" />
                                </svg>
                              )}
                            </button>
                            <button
                              type="button"
                              className="study-btn study-btn-danger study-btn-icon"
                              onClick={() => removeGoal(goal.id)}
                              title="Remover meta"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <path d="M18 6 6 18M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          <div className="study-goal-main">
                            <div className="study-goal-row">
                              <select
                                value={goal.priority ?? ''}
                                onChange={e => updateGoal(goal.id, current => ({
                                  ...current,
                                  priority: (e.target.value || null) as CardPriority | null,
                                }))}
                              >
                                <option value="">Sem prioridade</option>
                                {(['P1', 'P2', 'P3', 'P4'] as CardPriority[]).map(priority => (
                                  <option key={priority} value={priority}>{priority} - {PRIORITY_LABELS[priority]}</option>
                                ))}
                              </select>
                              <select
                                value={goal.status}
                                onChange={e => updateGoal(goal.id, current => ({
                                  ...current,
                                  status: e.target.value as CardStatus,
                                }))}
                              >
                                {(['todo', 'in_progress', 'blocked', 'done'] as CardStatus[]).map(status => (
                                  <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                                ))}
                              </select>
                              {goal.linkedPlanningCardId && (
                                <button
                                  type="button"
                                  className="study-goal-linked-badge"
                                  onClick={() => refreshGoalFromPlanning(goal.id)}
                                  title="Atualizar com dados do planejamento"
                                >
                                  Vinculada
                                </button>
                              )}
                            </div>

                            {isExpanded && (
                              <>
                                <textarea
                                  value={goal.description}
                                  onChange={e => updateGoal(goal.id, current => ({ ...current, description: e.target.value }))}
                                  placeholder="Descricao / notas da meta"
                                />

                                <div className="study-goal-checklist">
                                  <span className="study-card-label">Checklist</span>
                                  {goal.checklist.map(item => (
                                    <div key={item.id} className="study-goal-check-item">
                                      <label className="study-mute-toggle">
                                        <input
                                          type="checkbox"
                                          checked={item.done}
                                          onChange={() => toggleGoalChecklistItem(goal.id, item.id)}
                                        />
                                        <span>{item.text}</span>
                                      </label>
                                      <button
                                        type="button"
                                        className="study-btn study-btn-danger study-btn-icon"
                                        onClick={() => removeGoalChecklistItem(goal.id, item.id)}
                                      >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                                          <path d="M18 6 6 18M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  ))}

                                  <div className="study-input-row">
                                    <input
                                      type="text"
                                      value={goalChecklistDrafts[goal.id] ?? ''}
                                      onChange={e => setGoalChecklistDrafts(prev => ({
                                        ...prev,
                                        [goal.id]: e.target.value,
                                      }))}
                                      placeholder="Novo item da checklist"
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault()
                                          addGoalChecklistItem(goal.id)
                                        }
                                      }}
                                    />
                                    <button type="button" className="study-btn study-btn-icon" onClick={() => addGoalChecklistItem(goal.id)}>
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                        <path d="M12 5v14M5 12h14" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                            {goal.linkedPlanningCardId && (
                              <div className="study-goal-actions">
                                <small>{linkedCard?.title ?? 'Card de origem removido'}</small>
                                <small>Sincroniza automatico com Planejamento</small>
                              </div>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {dockMediaItems.length > 0 && (
        <div className={`study-video-player study-media-dock ${dockCollapsed ? 'is-collapsed' : ''}`}>
          <div className="study-media-dock-topbar">
            <strong>Player ({dockMediaItems.length})</strong>
            <button
              type="button"
              className="study-btn study-btn-ghost study-btn-icon study-media-dock-toggle"
              onClick={() => setDockCollapsed(prev => !prev)}
              title={dockCollapsed ? 'Expandir player' : 'Recolher player'}
            >
              {dockCollapsed ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="m6 15 6-6 6 6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              )}
            </button>
          </div>

          <div className="study-media-dock-body">
            {dockMediaItems.map(item => {
              if (item.kind === 'youtube' && item.youtubeVideoId) {
                return (
                  <article key={item.id} className="study-media-dock-item study-media-dock-item-youtube">
                    <header>{item.title}</header>
                    <iframe
                      ref={el => { youtubeDockRefs.current[item.id] = el }}
                      src={`https://www.youtube-nocookie.com/embed/${item.youtubeVideoId}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1&loop=${item.loop ? 1 : 0}&playlist=${item.youtubeVideoId}`}
                      title={`study-media-${item.id}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      referrerPolicy="strict-origin-when-cross-origin"
                      onLoad={() => {
                        sendYoutubeCommand(item.id, 'setVolume', [Math.round(item.volume * 100)])
                        if (youtubePlaying[item.id]) {
                          sendYoutubeCommand(item.id, 'playVideo')
                        }
                      }}
                      allowFullScreen
                    />
                  </article>
                )
              }

              return (
                <article key={item.id} className="study-media-dock-item">
                  <header>{item.title}</header>
                  <audio
                    ref={el => { audioRefs.current[item.id] = el }}
                    controls
                    src={item.url}
                  />
                </article>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
