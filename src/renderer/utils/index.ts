export * from './factories'
export * from './theme'

import type {
  Card,
  Day,
  Period,
  CalendarEvent,
  KeyboardShortcut,
} from '../types'

// Debounce simples para salvar
export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// Verifica se está em ambiente Electron
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined'
}

// Normaliza URL para garantir esquema
export const normalizeUrl = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return trimmed
  }
  return `https://${trimmed}`
}

export const getShortcutTitleFromUrl = (value: string): string => {
  const normalized = normalizeUrl(value)
  if (!normalized) return ''
  try {
    const url = new URL(normalized)
    const host = url.hostname.replace(/^www\./i, '')
    return host || normalized
  } catch {
    return value.trim()
  }
}

export const getFaviconUrl = (value: string): string => {
  const normalized = normalizeUrl(value)
  if (!normalized) return ''
  try {
    const url = new URL(normalized)
    return `${url.origin}/favicon.ico`
  } catch {
    return ''
  }
}

// Abre URL externa
export const openExternalLink = async (url: string): Promise<boolean> => {
  const normalized = normalizeUrl(url)
  if (!normalized) return false
  if (isElectron()) {
    return window.electronAPI.openExternal(normalized)
  }
  if (typeof window !== 'undefined') {
    window.open(normalized, '_blank', 'noopener,noreferrer')
    return true
  }
  return false
}

export interface UrlEmbed {
  type: 'youtube'
  videoId: string
  thumbnailUrl: string
}

export const detectUrlEmbed = (url: string): UrlEmbed | null => {
  const normalized = normalizeUrl(url)
  if (!normalized) return null

  const toEmbed = (videoId: string): UrlEmbed | null => {
    const clean = videoId.trim()
    if (!/^[a-zA-Z0-9_-]{11}$/.test(clean)) return null
    return {
      type: 'youtube',
      videoId: clean,
      thumbnailUrl: `https://img.youtube.com/vi/${clean}/mqdefault.jpg`,
    }
  }

  try {
    const parsed = new URL(normalized)
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase()

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0] ?? ''
      return toEmbed(id)
    }

    if (host.endsWith('youtube.com')) {
      const watchId = parsed.searchParams.get('v')
      if (watchId) {
        return toEmbed(watchId)
      }

      const parts = parsed.pathname.split('/').filter(Boolean)
      const markerIndex = parts.findIndex(part => part === 'embed' || part === 'shorts' || part === 'live')
      if (markerIndex >= 0) {
        const id = parts[markerIndex + 1] ?? ''
        return toEmbed(id)
      }
    }
  } catch {
    // Fallback para regex abaixo.
  }

  const fallbackPatterns = [
    /(?:youtube\.com\/watch\?.*v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtube\.com\/live\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  ]

  for (const pattern of fallbackPatterns) {
    const match = pattern.exec(normalized)
    if (match?.[1]) {
      return toEmbed(match[1])
    }
  }

  return null
}

// Abre caminho local (pasta/arquivo)
export const openLocalPath = async (targetPath: string): Promise<boolean> => {
  const trimmed = targetPath.trim()
  if (!trimmed) return false
  if (isElectron()) {
    return window.electronAPI.openPath(trimmed)
  }
  return false
}

// Copia texto para area de transferencia
export const copyTextToClipboard = async (text: string): Promise<boolean> => {
  if (!text.trim()) return false
  if (isElectron()) {
    return window.electronAPI.copyToClipboard(text)
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }
  return false
}

// ========================================
// FUNÇÕES DE DATA
// ========================================

const toISODate = (date: Date): string => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const formatDateShort = (isoDate: string): string => {
  const date = new Date(isoDate + 'T00:00:00')
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  return `${day}/${month}`
}

export const formatDateFull = (isoDate: string): string => {
  const date = new Date(isoDate + 'T00:00:00')
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export const getTodayISO = (): string => {
  return toISODate(new Date())
}

export const isToday = (isoDate: string): boolean => {
  return isoDate === getTodayISO()
}

export const getDayFromDate = (isoDate: string): Day => {
  const date = new Date(isoDate + 'T00:00:00')
  const dayIndex = date.getDay()
  const days: Day[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return days[dayIndex]
}

export const getWeekDatesForOffset = (offset: number): Record<Day, string> => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  monday.setDate(today.getDate() + diff + offset * 7)

  const dates: Partial<Record<Day, string>> = {}
  const days: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    dates[days[i]] = toISODate(date)
  }
  return dates as Record<Day, string>
}

export const getCurrentWeekDates = (): Record<Day, string> => {
  return getWeekDatesForOffset(0)
}

export const performWeeklyReset = (cards: Card[], weekStart: string): Card[] => {
  return cards.filter(card => {
    if (!card.hasDate) return true
    if (!card.date) return false
    return card.date >= weekStart
  })
}

export const normalizeTime = (input: string | null | undefined): string | null => {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(trimmed)
  if (!match) return null
  const hh = match[1].padStart(2, '0')
  const mm = match[2]
  return `${hh}:${mm}`
}

export const getPeriodFromTime = (time: string): Period => {
  const normalized = normalizeTime(time)
  const hour = normalized ? Number(normalized.slice(0, 2)) : 0
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'night'
}

const addDaysISO = (isoDate: string, days: number): string => {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

const addMonthsISO = (isoDate: string, months: number): string => {
  const d = new Date(isoDate + 'T00:00:00')
  const day = d.getDate()
  d.setMonth(d.getMonth() + months, 1)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return toISODate(d)
}

const addYearsISO = (isoDate: string, years: number): string => {
  const d = new Date(isoDate + 'T00:00:00')
  const day = d.getDate()
  d.setFullYear(d.getFullYear() + years, d.getMonth(), 1)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return toISODate(d)
}

export const expandCalendarEvents = (
  events: CalendarEvent[],
  startISO: string,
  endISO: string
): Array<CalendarEvent & { sourceId?: string }> => {
  const out: Array<CalendarEvent & { sourceId?: string }> = []
  const start = startISO
  const end = endISO

  for (const e of events) {
    const rec = e.recurrence
    const frequency = rec?.frequency ?? 'none'
    const interval = Math.max(1, rec?.interval ?? 1)
    const until = rec?.until ?? null

    const pushIfInRange = (dateISO: string, sourceId?: string) => {
      if (dateISO < start || dateISO > end) return
      out.push({
        ...e,
        id: sourceId ? `${e.id}:${dateISO}` : e.id,
        date: dateISO,
        sourceId,
      })
    }

    if (frequency === 'none') {
      pushIfInRange(e.date, undefined)
      continue
    }

    let current = e.date
    const stop = until && until < end ? until : end

    for (let guard = 0; guard < 2000; guard++) {
      if (current > stop) break
      pushIfInRange(current, e.id)

      if (frequency === 'daily') {
        current = addDaysISO(current, interval)
      } else if (frequency === 'weekly') {
        current = addDaysISO(current, 7 * interval)
      } else if (frequency === 'monthly') {
        current = addMonthsISO(current, interval)
      } else if (frequency === 'yearly') {
        current = addYearsISO(current, interval)
      } else {
        break
      }
    }
  }

  return out
}

export const matchesShortcut = (e: KeyboardEvent, shortcut: KeyboardShortcut['keys']): boolean => {
  const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase() ||
    (shortcut.key === 'Enter' && e.key === 'Enter') ||
    (shortcut.key === 'Escape' && e.key === 'Escape') ||
    (shortcut.key === ' ' && e.key === ' ')

  if (!keyMatches) return false

  const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey)
  const shiftMatch = !!shortcut.shift === e.shiftKey
  const altMatch = !!shortcut.alt === e.altKey
  const metaMatch = shortcut.meta ? e.metaKey : !e.metaKey

  return ctrlMatch && shiftMatch && altMatch && metaMatch
}

export const getShortcutById = (shortcuts: KeyboardShortcut[] | undefined, id: string): KeyboardShortcut['keys'] | null => {
  if (!shortcuts) return null
  const shortcut = shortcuts.find(s => s.id === id)
  return shortcut ? shortcut.keys : null
}
