import type { AppView } from './InternalNav'

export interface ViewOption {
  view: AppView
  label: string
  icon: JSX.Element
}

export const AVAILABLE_VIEWS: ViewOption[] = [
  {
    view: 'planner',
    label: 'Planejamento',
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="12" height="11" rx="2" />
        <path d="M2 6h12" />
        <path d="M5 2v2M11 2v2" />
      </svg>
    ),
  },
  {
    view: 'calendar',
    label: 'Calendário',
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="3" width="12" height="11" rx="2" />
        <path d="M2 6h12" />
        <path d="M5 2v2M11 2v2" />
        <circle cx="8" cy="10" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    view: 'shortcuts',
    label: 'Atalhos',
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9.5 1.5L3 9.5h4.5L6.5 14.5L13 6.5H8.5L9.5 1.5Z" />
      </svg>
    ),
  },
  {
    view: 'paths',
    label: 'Paths',
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2.5 4.5h4l1.2 1.6h5.8v6.4a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" />
      </svg>
    ),
  },
  {
    view: 'projects',
    label: 'Projetos',
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="10 12 14 8 10 4" />
        <polyline points="6 4 2 8 6 12" />
      </svg>
    ),
  },
  {
    view: 'colors',
    label: 'Cores',
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="5.5" />
        <path d="M8 2.5v11" />
        <path d="M2.5 8h11" />
      </svg>
    ),
  },
  {
    view: 'notes',
    label: 'Notas',
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6l-4-4Z" />
        <path d="M9 2v4h4" />
        <path d="M5 8h6M5 11h4" />
      </svg>
    ),
  },
  {
    view: 'clipboard',
    label: 'Clipboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10 2H6a1 1 0 0 0-1 1v1h6V3a1 1 0 0 0-1-1Z" />
        <rect x="3" y="4" width="10" height="10" rx="1" />
      </svg>
    ),
  },
  {
    view: 'files',
    label: 'Arquivos',
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="12" height="12" rx="2" />
        <circle cx="5.5" cy="5.5" r="1.5" />
        <path d="M14 10l-3-3-5 5" />
      </svg>
    ),
  },
  {
    view: 'apps',
    label: 'Apps',
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="5" height="5" rx="1" />
        <rect x="9" y="2" width="5" height="5" rx="1" />
        <rect x="2" y="9" width="5" height="5" rx="1" />
        <rect x="9" y="9" width="5" height="5" rx="1" />
      </svg>
    ),
  },
  {
    view: 'habits',
    label: 'Hábitos',
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 3L6.5 10.5 3 7" />
        <circle cx="8" cy="8" r="6.5" />
      </svg>
    ),
  },
  {
    view: 'study',
    label: 'Estudos',
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2.5 4.5L8 2l5.5 2.5L8 7 2.5 4.5Z" />
        <path d="M3 6.5V11l5 2.5 5-2.5V6.5" />
      </svg>
    ),
  },
  {
    view: 'financial',
    label: 'Financeiro',
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="8" y1="2" x2="8" y2="14" />
        <path d="M11 4H6.5a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4H5" />
      </svg>
    ),
  },
  {
    view: 'history',
    label: 'Historico',
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6" />
        <path d="M8 4v4l2.5 2.5" />
      </svg>
    ),
  },
]
