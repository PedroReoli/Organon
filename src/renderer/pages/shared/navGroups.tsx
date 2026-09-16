import type { AppView } from './InternalNav'

export interface NavGroupItem {
  view: AppView
  label: string
  icon: JSX.Element
}

export interface NavGroup {
  id: string
  label: string
  icon: JSX.Element
  items: NavGroupItem[]
}

// Ícones reutilizáveis
const icons = {
  planner: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="11" rx="2" />
      <path d="M2 6h12" />
      <path d="M5 2v2M11 2v2" />
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="11" rx="2" />
      <path d="M2 6h12" />
      <path d="M5 2v2M11 2v2" />
      <circle cx="8" cy="10" r="1" fill="currentColor" />
    </svg>
  ),
  shortcuts: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9.5 1.5L3 9.5h4.5L6.5 14.5L13 6.5H8.5L9.5 1.5Z" />
    </svg>
  ),
  projects: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="10 12 14 8 10 4" />
      <polyline points="6 4 2 8 6 12" />
    </svg>
  ),
  notes: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6l-4-4Z" />
      <path d="M9 2v4h4" />
      <path d="M5 8h6M5 11h4" />
    </svg>
  ),
  clipboard: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2H6a1 1 0 0 0-1 1v1h6V3a1 1 0 0 0-1-1Z" />
      <rect x="3" y="4" width="10" height="10" rx="1" />
    </svg>
  ),
  apps: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  ),
  study: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 4.5L8 2l5.5 2.5L8 7 2.5 4.5Z" />
      <path d="M3 6.5V11l5 2.5 5-2.5V6.5" />
    </svg>
  ),
  colors: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 2.5v11" />
      <path d="M2.5 8h11" />
    </svg>
  ),
  organization: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="11" rx="2" />
      <path d="M2 6h12" />
      <path d="M5 2v2M11 2v2" />
    </svg>
  ),
  content: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6l-4-4Z" />
      <path d="M9 2v4h4" />
      <path d="M5 8h6M5 11h4" />
    </svg>
  ),
}

// Grupos de navegação
export const navGroups: NavGroup[] = [
  {
    id: 'organization',
    label: 'Planejamento',
    icon: icons.organization,
    items: [
      { view: 'planner', label: 'Planejamento', icon: icons.planner },
    ],
  },
  {
    id: 'content',
    label: 'Conhecimento',
    icon: icons.content,
    items: [
      { view: 'notes', label: 'Notas', icon: icons.notes },
    ],
  },
  {
    id: 'work',
    label: 'Trabalho',
    icon: icons.projects,
    items: [
      { view: 'projects', label: 'Projetos', icon: icons.projects },
    ],
  },
]
