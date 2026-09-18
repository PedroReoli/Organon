import type { AppView } from '../shared/InternalNav'
import type { DashboardSyncStatus } from '../DashboardPage/DashboardPage'

export type AppHub = {
  id: string
  label: string
  description: string
  accent: string
  primaryView: AppView
  views: Array<{ view: AppView; label: string }>
}

export const APP_VIEW_LABELS: Record<AppView, string> = {
  today: 'Dashboard',
  agenda: 'Planejamento',
  planner: 'Planejamento',
  calendar: 'Planejamento',
  okrs: 'OKRs & Metas',
  study: 'Modo Foco',
  notes: 'Notas',
  canvas: 'Canvas',
  transcripts: 'Whisper Transcrições',
  audio: 'Áudio & Gravações',
  projects: 'Projetos & Git',
  clipboard: 'Clipboard Manager',
  colors: 'Paletas de Cores',
  'system-design': 'System Design',
  settings: 'Configurações',
  history: 'Histórico',
  shortcuts: 'Atalhos',
  apps: 'Aplicativos',
  workflow: 'Workflows',
  financial: 'Financeiro',
}

export const APP_HUBS: AppHub[] = [
  {
    id: 'planning',
    label: 'Planejamento',
    description: 'Sprint board, calendário e grade horária unificados.',
    accent: 'var(--color-primary)',
    primaryView: 'agenda',
    views: [
      { view: 'agenda', label: 'Planejamento' },
      { view: 'calendar', label: 'Calendário' },
      { view: 'okrs', label: 'OKRs & Metas' },
    ],
  },
  {
    id: 'focus',
    label: 'Foco',
    description: 'Sessões de foco contínuo, Pomodoro e metas ativas.',
    accent: '#10b981',
    primaryView: 'study',
    views: [
      { view: 'study', label: 'Modo Foco' },
    ],
  },
  {
    id: 'content',
    label: 'Conhecimento',
    description: 'Notas, gravações, transcrições e canvas.',
    accent: 'var(--color-primary)',
    primaryView: 'notes',
    views: [
      { view: 'notes',       label: 'Notas'        },
      { view: 'canvas',      label: 'Canvas'       },
      { view: 'transcripts', label: 'Whisper'      },
      { view: 'audio',       label: 'Áudio'        },
    ],
  },
  {
    id: 'operation',
    label: 'Operação',
    description: 'Relatórios de código e repositórios Git.',
    accent: '#f97316',
    primaryView: 'projects',
    views: [
      { view: 'projects', label: 'Projetos' },
    ],
  },
  {
    id: 'tools',
    label: 'Ferramentas',
    description: 'Gerenciador de área de transferência, paletas e diagramas.',
    accent: '#60a5fa',
    primaryView: 'clipboard',
    views: [
      { view: 'clipboard',     label: 'Clipboard'     },
      { view: 'colors',        label: 'Cores'         },
      { view: 'system-design', label: 'System Design' },
    ],
  },
  {
    id: 'system',
    label: 'Sistema',
    description: 'Configurações do aplicativo, sync local e histórico.',
    accent: '#94a3b8',
    primaryView: 'settings',
    views: [
      { view: 'settings', label: 'Configurações' },
      { view: 'history',  label: 'Histórico'     },
    ],
  },
]

export const SYNC_STATUS_LABELS: Record<DashboardSyncStatus, string> = {
  idle: 'Local',
  pending: 'Pendente',
  syncing: 'Sincronizando',
  synced: 'Sincronizado',
  error: 'Erro',
}

export const DEBUG_SCREEN_EVENT = 'organon:debug-screen'
