import type { ChecklistItem, StudyMediaItem, StudyState } from '@types'
import { DEFAULT_STUDY_STATE } from '@types'
import { detectUrlEmbed, generateId, normalizeUrl } from '@utils'
import { STORAGE_KEY, LEGACY_STORAGE_KEY, IMAGE_SEARCH_LIMIT } from '@Study/study/types'

export const clampMinutes = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback
  return Math.min(180, Math.max(1, Math.round(value)))
}

export const clampVolume = (value: number): number => {
  if (!Number.isFinite(value)) return 0.6
  return Math.min(1, Math.max(0, value))
}

export const cloneChecklist = (items: ChecklistItem[]): ChecklistItem[] => items.map(i => ({ ...i }))

export const cloneStudyState = (value: StudyState): StudyState => ({
  wallpaperUrl: value.wallpaperUrl,
  focusMinutes: value.focusMinutes,
  breakMinutes: value.breakMinutes,
  muteSound:    value.muteSound,
  mediaItems:   value.mediaItems.map(i => ({ ...i })),
  goals: value.goals.map(g => ({ ...g, checklist: g.checklist.map(c => ({ ...c })) })),
  sessions: value.sessions.map(s => ({ ...s })),
  presets: value.presets ? value.presets.map(p => ({ ...p })) : undefined,
  activePresetId: value.activePresetId ?? null,
  focusedGoalId: value.focusedGoalId ?? null,
})

export const hasStudyData = (value: StudyState): boolean => (
  value.wallpaperUrl.trim().length > 0 ||
  value.mediaItems.length > 0 ||
  value.goals.length > 0 ||
  value.sessions.length > 0 ||
  value.focusMinutes !== DEFAULT_STUDY_STATE.focusMinutes ||
  value.breakMinutes !== DEFAULT_STUDY_STATE.breakMinutes ||
  value.muteSound !== DEFAULT_STUDY_STATE.muteSound
)

export const formatClock = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds))
  const hh = Math.floor(safe / 3600)
  const mm = Math.floor((safe % 3600) / 60)
  const ss = safe % 60
  if (hh > 0) return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

export const formatHours = (seconds: number): string => `${(seconds / 3600).toFixed(1)} h`

export const buildMediaCandidate = (value: string): Omit<StudyMediaItem, 'id'> | null => {
  const normalized = normalizeUrl(value)
  if (!normalized) return null
  const yt = detectUrlEmbed(normalized)
  if (yt?.type === 'youtube') {
    return { title: `YouTube - ${yt.videoId}`, url: normalized, kind: 'youtube', youtubeVideoId: yt.videoId, volume: 0.6, loop: true, showDock: true }
  }
  let title = 'Audio externo'
  try { title = new URL(normalized).hostname.replace(/^www\./i, '') } catch { /* ignore */ }
  return { title, url: normalized, kind: 'audio', youtubeVideoId: null, volume: 0.6, loop: true, showDock: true }
}

export const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

export const playBeep = () => {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'; osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.8)
    setTimeout(() => ctx.close().catch(() => {}), 1000)
  } catch { /* ignore */ }
}

export const loadStudySettings = (): StudyState | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw       = window.localStorage.getItem(STORAGE_KEY)
    const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw && !legacyRaw) return null

    const parsed = raw ? JSON.parse(raw) as Partial<StudyState> : {}
    const legacy = legacyRaw ? JSON.parse(legacyRaw) as Partial<{
      audioUrl: string; audioVolume: number; audioLoop: boolean; showVideoPlayer: boolean
      goals: Array<{ id?: string; title?: string; done?: boolean; linkedPlanningCardId?: string | null; createdAt?: string; updatedAt?: string }>
    }> : null

    const mediaItems: StudyMediaItem[] = Array.isArray(parsed.mediaItems) ? parsed.mediaItems : []
    const migratedLegacyMedia: StudyMediaItem[] = []
    if (legacy?.audioUrl) {
      const candidate = buildMediaCandidate(legacy.audioUrl)
      if (candidate) {
        migratedLegacyMedia.push({
          ...candidate, id: generateId(),
          volume: clampVolume(Number(legacy.audioVolume)),
          loop: legacy.audioLoop !== false,
          showDock: legacy.showVideoPlayer !== false,
        })
      }
    }

    const parsedGoals = Array.isArray(parsed.goals)
      ? parsed.goals
      : Array.isArray(legacy?.goals)
        ? legacy.goals.map(g => ({
          id: g.id ?? generateId(), title: g.title ?? '', priority: null,
          status: g.done ? 'done' : 'todo', checklist: [],
          linkedPlanningCardId: g.linkedPlanningCardId ?? null,
          createdAt: g.createdAt ?? new Date().toISOString(), updatedAt: g.updatedAt ?? new Date().toISOString(),
        }))
        : []

    return {
      wallpaperUrl: parsed.wallpaperUrl ?? '',
      focusMinutes: clampMinutes(Number(parsed.focusMinutes), DEFAULT_STUDY_STATE.focusMinutes),
      breakMinutes: clampMinutes(Number(parsed.breakMinutes), DEFAULT_STUDY_STATE.breakMinutes),
      muteSound:    parsed.muteSound ?? DEFAULT_STUDY_STATE.muteSound,
      mediaItems:   [...mediaItems, ...migratedLegacyMedia],
      goals:        parsedGoals,
      sessions:     Array.isArray(parsed.sessions) ? parsed.sessions : [],
      presets:      Array.isArray(parsed.presets) ? parsed.presets : undefined,
      activePresetId: typeof parsed.activePresetId === 'string' ? parsed.activePresetId : null,
      focusedGoalId: typeof parsed.focusedGoalId === 'string' ? parsed.focusedGoalId : null,
    } as StudyState
  } catch { return null }
}

export const clearLegacyStorage = () => {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch { /* ignore */ }
}

// Image search via Wikimedia Commons
export const searchWikimediaImages = async (query: string, limit: number = IMAGE_SEARCH_LIMIT) => {
  const apiUrl = new URL('https://commons.wikimedia.org/w/api.php')
  apiUrl.searchParams.set('action', 'query')
  apiUrl.searchParams.set('format', 'json')
  apiUrl.searchParams.set('origin', '*')
  apiUrl.searchParams.set('generator', 'search')
  apiUrl.searchParams.set('gsrnamespace', '6')
  apiUrl.searchParams.set('gsrlimit', String(limit))
  apiUrl.searchParams.set('gsrsearch', query)
  apiUrl.searchParams.set('prop', 'imageinfo')
  apiUrl.searchParams.set('iiprop', 'url')
  apiUrl.searchParams.set('iiurlwidth', '640')

  const response = await fetch(apiUrl.toString())
  if (!response.ok) throw new Error(`Falha na busca (${response.status})`)

  const data = await response.json() as {
    query?: { pages?: Record<string, { pageid: number; title: string; imageinfo?: Array<{ thumburl?: string; url?: string; descriptionurl?: string }> }> }
  }

  return Object.values(data.query?.pages ?? {})
    .map(page => {
      const info = page.imageinfo?.[0]
      if (!info?.url) return null
      return { id: String(page.pageid), title: page.title.replace(/^File:/i, ''), thumbUrl: info.thumburl ?? info.url, fullUrl: info.url, sourceUrl: info.descriptionurl ?? 'https://commons.wikimedia.org' }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
}
