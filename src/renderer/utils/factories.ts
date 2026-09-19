import { v4 as uuidv4 } from 'uuid'
import type {
  Card,
  CardLocation,
  Day,
  Period,
  CellId,
  ShortcutFolder,
  ShortcutItem,
  Project,
  ProjectLink,
  RegisteredIDE,
  ClipboardCategory,
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
    isLocked: false,
    priority: null,
    status: 'todo',
    checklist: [],
    projectId: null,
    durationMinutes: null,
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
    color: input.color ?? 'var(--color-primary)',
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

export const createMeeting = (
  title: string,
  transcription: string,
  audioPath: string | null,
  duration: number
): Meeting => {
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
  updates: Partial<Pick<Card, 'title' | 'descriptionHtml' | 'date' | 'time' | 'hasDate' | 'isLocked' | 'priority' | 'status' | 'checklist' | 'projectId' | 'durationMinutes' | 'location' | 'inSprint' | 'sprintColumnId' | 'swimLaneId' | 'sprintSectionId'>>
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
    isLocked: (card as Card & { isLocked?: boolean }).isLocked ?? false,
    durationMinutes: card.durationMinutes ?? null,
    checklist: Array.isArray(card.checklist) ? card.checklist : [],
    createdAt: card.createdAt ?? now,
    updatedAt: card.updatedAt ?? now,
    inSprint: card.inSprint ?? false,
    sprintColumnId: card.sprintColumnId ?? null,
    swimLaneId: card.swimLaneId ?? null,
    sprintSectionId: card.sprintSectionId ?? null,
  }
}
