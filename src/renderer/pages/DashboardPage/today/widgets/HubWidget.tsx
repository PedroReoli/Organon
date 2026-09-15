import type { DashboardWidgetType } from '@types'
import type { AppView } from '../../../shared/InternalNav'
import { DEFAULT_NAVBAR_ITEMS, renderNavIcon } from '../../../shared/navConfig'

const HUB_TYPE_TO_VIEW: Partial<Record<DashboardWidgetType, AppView>> = {
  'hub-planner':   'planner',
  'hub-calendar':  'calendar',
  'hub-crm':       'crm',
  'hub-playbook':  'playbook',
  'hub-projects':  'projects',
  'hub-notes':     'notes',
  'hub-habits':    'habits',
  'hub-study':     'study',
  'hub-financial': 'financial',
  'hub-shortcuts': 'shortcuts',
  'hub-apps':      'apps',
  'hub-clipboard': 'clipboard',
  'hub-colors':    'colors',
}

const HUB_DESCRIPTIONS: Partial<Record<DashboardWidgetType, string>> = {
  'hub-planner':   'Gerencie seus cards e tarefas semanais',
  'hub-calendar':  'Visualize e crie eventos com recorrência',
  'hub-crm':       'Contatos, interações e pipeline de clientes',
  'hub-playbook':  'Documentos de processos e roteiros',
  'hub-projects':  'Projetos ativos e seus links',
  'hub-notes':     'Suas notas em markdown, organizadas em pastas',
  'hub-habits':    'Rastreie seus hábitos diários',
  'hub-study':     'Pomodoro, metas e sessões de estudo',
  'hub-financial': 'Contas, despesas, receitas e metas financeiras',
  'hub-shortcuts': 'Links e atalhos rápidos para URLs',
  'hub-apps':      'Acesso rápido a aplicativos instalados',
  'hub-clipboard': 'Histórico e categorias de clipboard',
  'hub-colors':    'Paletas de cores e hexadecimais',
}

interface HubWidgetProps {
  type:       DashboardWidgetType
  onNavigate: (view: AppView) => void
}

export const HubWidget = ({ type, onNavigate }: HubWidgetProps) => {
  const view = HUB_TYPE_TO_VIEW[type]
  if (!view) return null

  const navItem = DEFAULT_NAVBAR_ITEMS.find(i => i.view === view)
  const icon    = navItem ? renderNavIcon(navItem.iconId) : null
  const label   = navItem?.label ?? view
  const desc    = HUB_DESCRIPTIONS[type] ?? ''

  return (
    <button
      type="button"
      className="dw-hub-btn"
      onClick={() => onNavigate(view)}
    >
      <span className="dw-hub-icon">{icon}</span>
      <div className="dw-hub-text">
        <strong className="dw-hub-label">{label}</strong>
        {desc && <span className="dw-hub-desc">{desc}</span>}
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="dw-hub-arrow">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  )
}
