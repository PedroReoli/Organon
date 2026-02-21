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
  paths: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 4.5h4l1.2 1.6h5.8v6.4a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" />
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
  files: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <circle cx="5.5" cy="5.5" r="1.5" />
      <path d="M14 10l-3-3-5 5" />
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
  habits: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13 3L6.5 10.5 3 7" />
      <circle cx="8" cy="8" r="6.5" />
    </svg>
  ),
  study: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 4.5L8 2l5.5 2.5L8 7 2.5 4.5Z" />
      <path d="M3 6.5V11l5 2.5 5-2.5V6.5" />
    </svg>
  ),
  financial: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="8" y1="2" x2="8" y2="14" />
      <path d="M11 4H6.5a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4H5" />
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
    </svg>
  ),
  tools: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  ),
  personal: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13 3L6.5 10.5 3 7" />
      <circle cx="8" cy="8" r="6.5" />
    </svg>
  ),
  crm: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4z" />
      <path d="M6 8h4M6 10h4" />
      <circle cx="8" cy="6" r="1" fill="currentColor" />
    </svg>
  ),
  playbook: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3.5 2.5h7a2 2 0 0 1 2 2v9h-9a1 1 0 0 1-1-1v-8a2 2 0 0 1 2-2Z" />
      <path d="M5 5.5h6M5 8h6M5 10.5h4" />
    </svg>
  ),
  colors: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 2.5v11" />
      <path d="M2.5 8h11" />
    </svg>
  ),
}

// Grupos de navegação
export const navGroups: NavGroup[] = [
  {
    id: 'organization',
    label: 'Organização',
    icon: icons.organization,
    items: [
      { view: 'planner', label: 'Planejamento', icon: icons.planner },
      { view: 'calendar', label: 'Calendário', icon: icons.calendar },
    ],
  },
  {
    id: 'work',
    label: 'Trabalho',
    icon: icons.projects,
    items: [
      { view: 'crm', label: 'CRM', icon: icons.crm },
      { view: 'playbook', label: 'Playbook', icon: icons.playbook },
      { view: 'projects', label: 'Projetos', icon: icons.projects },
      { view: 'colors', label: 'Cores', icon: icons.colors },
    ],
  },
  {
    id: 'tools',
    label: 'Ferramentas',
    icon: icons.tools,
    items: [
      { view: 'paths', label: 'Paths', icon: icons.paths },
      { view: 'shortcuts', label: 'Atalhos', icon: icons.shortcuts },
      { view: 'apps', label: 'Apps', icon: icons.apps },
    ],
  },
  {
    id: 'content',
    label: 'Conteúdo',
    icon: icons.content,
    items: [
      { view: 'notes', label: 'Notas', icon: icons.notes },
      { view: 'clipboard', label: 'Clipboard', icon: icons.clipboard },
      { view: 'files', label: 'Arquivos', icon: icons.files },
    ],
  },
  {
    id: 'personal',
    label: 'Pessoal',
    icon: icons.personal,
    items: [
      { view: 'habits', label: 'Hábitos', icon: icons.habits },
      { view: 'study', label: 'Estudos', icon: icons.study },
      { view: 'financial', label: 'Financeiro', icon: icons.financial },
    ],
  },
]
