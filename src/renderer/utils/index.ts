import { v4 as uuidv4 } from 'uuid'
import type {
  Card,
  CardLocation,
  Day,
  Period,
  CellId,
  ShortcutFolder,
  ShortcutItem,
  PathItem,
  ThemeSettings,
  CalendarEvent,
  Project,
  ProjectLink,
  RegisteredIDE,
  ClipboardCategory,
  KeyboardShortcut,
  Meeting,
} from '../types'

// Gera um novo ID único para cards
export const generateId = (): string => uuidv4()

// Cria um novo card com valores padrão
export const createCard = (title: string, date?: string | null): Card => {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    title: title.trim(),
    descriptionHtml: '',
    location: { day: null, period: null },
    order: Date.now(),
    date: date ?? null,
    time: null,
    hasDate: !!date,
    priority: null,
    status: 'todo',
    checklist: [],
    projectId: null,
    createdAt: now,
    updatedAt: now,
  }
}

// Cria um novo projeto
export const createProject = (input: {
  name: string
  path?: string
  description?: string
  color?: string
  links?: ProjectLink[]
  preferredIdeId?: string | null
}): Project => {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    name: input.name.trim(),
    path: input.path?.trim() ?? '',
    description: input.description?.trim() ?? '',
    color: input.color ?? '#6366f1',
    links: input.links ?? [],
    preferredIdeId: input.preferredIdeId ?? null,
    createdAt: now,
    updatedAt: now,
    order: Date.now(),
  }
}

// Cria uma nova IDE registrada
export const createRegisteredIDE = (input: {
  name: string
  exePath: string
  iconDataUrl?: string | null
  args?: string
}): RegisteredIDE => ({
  id: generateId(),
  name: input.name.trim(),
  exePath: input.exePath.trim(),
  iconDataUrl: input.iconDataUrl ?? null,
  args: input.args ?? '"{folder}"',
  order: Date.now(),
})

// Cria uma nova pasta de atalhos
export const createShortcutFolder = (name: string, parentId?: string | null): ShortcutFolder => ({
  id: generateId(),
  name: name.trim(),
  parentId: parentId ?? null,
  order: Date.now(),
})

// Cria uma nova categoria de clipboard
export const createClipboardCategory = (name: string): ClipboardCategory => ({
  id: generateId(),
  name: name.trim(),
  order: Date.now(),
})

// Cria um novo atalho
export const createShortcut = (input: {
  title: string
  value: string
  folderId: string | null
}): ShortcutItem => ({
  id: generateId(),
  title: input.title.trim(),
  kind: 'url',
  value: input.value.trim(),
  folderId: input.folderId,
  icon: null,
  order: Date.now(),
})

export const createPathItem = (input: {
  title: string
  path: string
}): PathItem => ({
  id: generateId(),
  title: input.title.trim(),
  path: input.path.trim(),
  order: Date.now(),
})

export const createMeeting = (title: string, transcription: string, audioPath: string | null, duration: number): Meeting => {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    title: title.trim(),
    transcription,
    audioPath,
    duration,
    createdAt: now,
    updatedAt: now,
  }
}

// Filtra cards por localização
export const getCardsForCell = (cards: Card[], day: Day | null, period: Period | null): Card[] => {
  return cards
    .filter(card => card.location.day === day && card.location.period === period)
    .sort((a, b) => a.order - b.order)
}

// Recalcula orders após mover/reordenar
export const recalculateOrders = (cards: Card[], _cellId: CellId, orderedIds: string[]): Card[] => {
  const updatedCards = [...cards]

  orderedIds.forEach((id, index) => {
    const cardIndex = updatedCards.findIndex(c => c.id === id)
    if (cardIndex !== -1) {
      updatedCards[cardIndex] = {
        ...updatedCards[cardIndex],
        order: index,
      }
    }
  })

  return updatedCards
}

// Move um card para nova localização
export const moveCard = (
  cards: Card[],
  cardId: string,
  newLocation: CardLocation,
  newOrder: number
): Card[] => {
  return cards.map(card => {
    if (card.id === cardId) {
      return {
        ...card,
        location: newLocation,
        order: newOrder,
      }
    }
    return card
  })
}

// Atualiza um card existente
export const updateCard = (
  cards: Card[],
  cardId: string,
  updates: Partial<Pick<Card, 'title' | 'descriptionHtml' | 'date' | 'time' | 'hasDate' | 'priority' | 'status' | 'checklist' | 'projectId'>>
): Card[] => {
  return cards.map(card => {
    if (card.id === cardId) {
      return {
        ...card,
        ...updates,
        updatedAt: new Date().toISOString(),
      }
    }
    return card
  })
}

// Remove um card
export const deleteCard = (cards: Card[], cardId: string): Card[] => {
  return cards.filter(card => card.id !== cardId)
}

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

export const isValidHexColor = (value: string): boolean => {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())
}

export const normalizeHexColor = (value: string): string | null => {
  const trimmed = value.trim()
  if (!isValidHexColor(trimmed)) return null
  if (trimmed.length === 4) {
    const r = trimmed[1]
    const g = trimmed[2]
    const b = trimmed[3]
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return trimmed.toLowerCase()
}

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value))
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const normalized = normalizeHexColor(hex)
  if (!normalized) return null
  const value = normalized.slice(1)
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return { r, g, b }
}

const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (channel: number) => channel.toString(16).padStart(2, '0')
  return `#${toHex(clamp(Math.round(r), 0, 255))}${toHex(clamp(Math.round(g), 0, 255))}${toHex(clamp(Math.round(b), 0, 255))}`
}

const mixColor = (base: string, mix: string, amount: number): string => {
  const baseRgb = hexToRgb(base)
  const mixRgb = hexToRgb(mix)
  if (!baseRgb || !mixRgb) return base
  const ratio = clamp(amount, 0, 1)
  const r = baseRgb.r + (mixRgb.r - baseRgb.r) * ratio
  const g = baseRgb.g + (mixRgb.g - baseRgb.g) * ratio
  const b = baseRgb.b + (mixRgb.b - baseRgb.b) * ratio
  return rgbToHex(r, g, b)
}

const adjustColor = (base: string, amount: number): string => {
  if (amount === 0) return base
  if (amount > 0) {
    return mixColor(base, '#ffffff', amount)
  }
  return mixColor(base, '#000000', Math.abs(amount))
}

const toRgba = (hex: string, alpha: number): string => {
  const rgb = hexToRgb(hex)
  if (!rgb) return `rgba(0, 0, 0, ${alpha})`
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1)})`
}

export const applyTheme = (theme: ThemeSettings): void => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const primary = theme.primary
  const background = theme.background
  const surface = theme.surface
  const text = theme.text

  root.style.setProperty('--color-primary', primary)
  root.style.setProperty('--color-primary-hover', adjustColor(primary, 0.18))
  root.style.setProperty('--color-primary-light', toRgba(primary, 0.15))
  root.style.setProperty('--color-primary-glow', toRgba(primary, 0.4))

  root.style.setProperty('--color-background', background)
  root.style.setProperty('--color-background-secondary', adjustColor(background, 0.08))
  root.style.setProperty('--color-background-tertiary', adjustColor(background, 0.16))
  root.style.setProperty('--color-background-elevated', adjustColor(background, 0.1))

  root.style.setProperty('--color-surface', surface)
  root.style.setProperty('--color-surface-hover', adjustColor(surface, 0.08))
  root.style.setProperty('--color-surface-light', adjustColor(surface, 0.16))

  root.style.setProperty('--color-border', adjustColor(background, 0.14))
  root.style.setProperty('--color-border-light', adjustColor(background, 0.2))
  root.style.setProperty('--color-border-focus', primary)

  root.style.setProperty('--color-text', text)
  root.style.setProperty('--color-text-secondary', toRgba(text, 0.65))
  root.style.setProperty('--color-text-muted', toRgba(text, 0.45))
  root.style.setProperty('--color-text-inverse', background)

  root.style.setProperty('--color-backlog-bg', background)
  root.style.setProperty('--color-backlog-header', adjustColor(background, 0.08))
  root.style.setProperty('--color-titlebar-bg', background)
  root.style.setProperty('--color-titlebar-text', toRgba(text, 0.65))
  root.style.setProperty('--color-titlebar-btn-hover', adjustColor(background, 0.18))

  root.style.setProperty('--color-drag-highlight', toRgba(primary, 0.2))
  root.style.setProperty('--color-drag-active', toRgba(primary, 0.3))
  root.style.setProperty('--color-drag-placeholder', toRgba(text, 0.2))
}

// ========================================
// FUNÇÕES DE DATA
// ========================================

// Formata data ISO para exibição (DD/MM)
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

// Formata data ISO para exibição completa (DD/MM/YYYY)
export const formatDateFull = (isoDate: string): string => {
  const date = new Date(isoDate + 'T00:00:00')
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Obtém a data de hoje em formato ISO (YYYY-MM-DD)
export const getTodayISO = (): string => {
  return toISODate(new Date())
}

// Verifica se uma data é hoje
export const isToday = (isoDate: string): boolean => {
  return isoDate === getTodayISO()
}

// Obtém o dia da semana de uma data ISO
export const getDayFromDate = (isoDate: string): Day => {
  const date = new Date(isoDate + 'T00:00:00')
  const dayIndex = date.getDay() // 0 = domingo
  const days: Day[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return days[dayIndex]
}

// Obtém as datas da semana atual (segunda a domingo)
export const getCurrentWeekDates = (): Record<Day, string> => {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = domingo

  // Calcular a segunda-feira da semana atual
  const monday = new Date(today)
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  monday.setDate(today.getDate() + diff)

  const dates: Partial<Record<Day, string>> = {}
  const days: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    dates[days[i]] = toISODate(date)
  }

  return dates as Record<Day, string>
}

// Reset semanal: remove cards com data, mantém cards sem data
export const performWeeklyReset = (cards: Card[], weekStart: string): Card[] => {
  return cards.filter(card => {
    if (!card.hasDate) return true
    if (!card.date) return false
    return card.date >= weekStart
  })
}

// Normaliza card antigo para novo formato (migração)
export const normalizeCard = (card: Partial<Card> & { id: string; title: string }): Card => {
  const now = new Date().toISOString()
  return {
    id: card.id,
    title: card.title,
    descriptionHtml: card.descriptionHtml ?? '',
    location: card.location ?? { day: null, period: null },
    order: card.order ?? Date.now(),
    date: card.date ?? null,
    time: (card as Card & { time?: string | null }).time ?? null,
    hasDate: card.hasDate ?? false,
    priority: card.priority ?? null,
    status: card.status ?? 'todo',
    projectId: (card as Card & { projectId?: string | null }).projectId ?? null,
    checklist: Array.isArray(card.checklist) ? card.checklist : [],
    createdAt: card.createdAt ?? now,
    updatedAt: card.updatedAt ?? now,
  }
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

    // Garantir que nao entra em loop infinito caso a data esteja mal formatada
    for (let guard = 0; guard < 2000; guard++) {
      if (current > stop) break
      pushIfInRange(current, e.id)

      if (frequency === 'daily') {
        current = addDaysISO(current, interval)
      } else if (frequency === 'weekly') {
        current = addDaysISO(current, 7 * interval)
      } else if (frequency === 'monthly') {
        current = addMonthsISO(current, interval)
      } else {
        break
      }
    }
  }

  return out
}

// Verifica se um evento de teclado corresponde a um atalho customizado
export const matchesShortcut = (e: KeyboardEvent, shortcut: KeyboardShortcut['keys']): boolean => {
  const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase() ||
    (shortcut.key === 'Enter' && e.key === 'Enter') ||
    (shortcut.key === 'Escape' && e.key === 'Escape') ||
    (shortcut.key === ' ' && e.key === ' ')

  if (!keyMatches) return false

  // Para ctrl, aceita tanto ctrlKey quanto metaKey (Mac)
  const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey)
  const shiftMatch = !!shortcut.shift === e.shiftKey
  const altMatch = !!shortcut.alt === e.altKey
  // meta é específico para Cmd no Mac, não deve ser usado junto com ctrl
  const metaMatch = shortcut.meta ? e.metaKey : !e.metaKey

  return ctrlMatch && shiftMatch && altMatch && metaMatch
}

// Obtém um atalho pelo ID
export const getShortcutById = (shortcuts: KeyboardShortcut[] | undefined, id: string): KeyboardShortcut['keys'] | null => {
  if (!shortcuts) return null
  const shortcut = shortcuts.find(s => s.id === id)
  return shortcut ? shortcut.keys : null
}
