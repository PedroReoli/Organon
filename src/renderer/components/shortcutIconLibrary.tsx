import type { ReactNode } from 'react'

export type BuiltinShortcutIconId =
  | 'link'
  | 'briefcase'
  | 'code'
  | 'music'
  | 'mail'
  | 'search'
  | 'calendar'
  | 'book'
  | 'star'
  | 'home'
  | 'bolt'
  | 'chat'

export const BUILTIN_SHORTCUT_ICONS: Array<{ id: BuiltinShortcutIconId; label: string; node: ReactNode }> = [
  {
    id: 'link',
    label: 'Link',
    node: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
        <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
      </svg>
    ),
  },
  {
    id: 'briefcase',
    label: 'Trabalho',
    node: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M3 13h18" />
      </svg>
    ),
  },
  {
    id: 'code',
    label: 'Code',
    node: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 18l6-6-6-6" />
        <path d="M8 6l-6 6 6 6" />
      </svg>
    ),
  },
  {
    id: 'music',
    label: 'Música',
    node: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18V5l12-2v13" />
        <circle cx="7" cy="18" r="3" />
        <circle cx="19" cy="16" r="3" />
      </svg>
    ),
  },
  {
    id: 'mail',
    label: 'Email',
    node: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </svg>
    ),
  },
  {
    id: 'search',
    label: 'Busca',
    node: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
    ),
  },
  {
    id: 'calendar',
    label: 'Calendário',
    node: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M3 10h18" />
        <path d="M8 2v4M16 2v4" />
      </svg>
    ),
  },
  {
    id: 'book',
    label: 'Leitura',
    node: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19a2 2 0 0 1 2-2h14" />
        <path d="M6 3h14v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      </svg>
    ),
  },
  {
    id: 'star',
    label: 'Favorito',
    node: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 17.3l-6.2 3.3 1.2-6.9L2 8.9l7-1L12 1.6l3 6.3 7 1-5 4.8 1.2 6.9z" />
      </svg>
    ),
  },
  {
    id: 'home',
    label: 'Home',
    node: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 10l9-7 9 7" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
  },
  {
    id: 'bolt',
    label: 'Ação',
    node: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2L3 14h9l-1 8 10-12h-9z" />
      </svg>
    ),
  },
  {
    id: 'chat',
    label: 'Chat',
    node: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
      </svg>
    ),
  },
]

export const getBuiltinShortcutIcon = (id: string) => BUILTIN_SHORTCUT_ICONS.find(i => i.id === id)?.node ?? null

