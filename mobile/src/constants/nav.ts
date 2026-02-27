export type ScreenName =
  | 'Today'
  | 'Planner'
  | 'Calendar'
  | 'Backlog'
  | 'Notes'
  | 'CRM'
  | 'Playbook'
  | 'Shortcuts'
  | 'Colors'
  | 'Habits'
  | 'Study'
  | 'Financial'
  | 'History'
  | 'Settings'
  | 'Auth'

export interface NavSection {
  title: string
  items: NavItem[]
}

export interface NavItem {
  name: ScreenName
  label: string
  icon: string  // nome do Feather icon
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Organização',
    items: [
      { name: 'Today',    label: 'Hoje',       icon: 'sun' },
      { name: 'Planner',  label: 'Planejador', icon: 'grid' },
      { name: 'Calendar', label: 'Calendário', icon: 'calendar' },
      { name: 'Backlog',  label: 'Backlog',    icon: 'list' },
    ],
  },
  {
    title: 'Pessoal',
    items: [
      { name: 'Habits',    label: 'Hábitos',   icon: 'check-circle' },
      { name: 'Financial', label: 'Financeiro', icon: 'dollar-sign' },
      { name: 'Study',     label: 'Estudo',    icon: 'book-open' },
    ],
  },
  {
    title: 'Conteúdo',
    items: [
      { name: 'Notes',    label: 'Notas',      icon: 'file-text' },
      { name: 'Shortcuts', label: 'Atalhos',   icon: 'link' },
      { name: 'Colors',   label: 'Cores',      icon: 'droplet' },
    ],
  },
  {
    title: 'Trabalho',
    items: [
      { name: 'CRM',      label: 'CRM',        icon: 'users' },
      { name: 'Playbook', label: 'Playbook',   icon: 'book' },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { name: 'History',  label: 'Histórico',  icon: 'clock' },
      { name: 'Settings', label: 'Configurações', icon: 'settings' },
    ],
  },
]
