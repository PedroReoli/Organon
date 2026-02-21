import { useState, useRef } from 'react'
import type { MouseEvent } from 'react'
import { navGroups, type NavGroup } from './navGroups'
import { NavDropdown } from './NavDropdown'

export type AppView =
  | 'today'
  | 'planner'
  | 'calendar'
  | 'crm'
  | 'playbook'
  | 'colors'
  | 'shortcuts'
  | 'paths'
  | 'projects'
  | 'notes'
  | 'clipboard'
  | 'files'
  | 'apps'
  | 'habits'
  | 'study'
  | 'financial'
  | 'history'
  | 'settings'

interface InternalNavProps {
  activeView: AppView
  onChange: (view: AppView) => void
  disabled?: boolean
}

interface NavGroupItem {
  type: 'item' | 'group'
  view?: AppView
  group?: NavGroup
  label: string
  icon: JSX.Element
}

// Ícone do Dashboard
const todayIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="6" />
    <path d="M8 4v4l2.5 2.5" />
  </svg>
)

const settingsIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6.5 1.5h3l.5 2a5.5 5.5 0 0 1 1.7 1l2-.5 1.5 2.6-1.6 1.2c.1.3.1.7.1 1s0 .7-.1 1l1.6 1.2-1.5 2.6-2-.5a5.5 5.5 0 0 1-1.7 1l-.5 2h-3l-.5-2a5.5 5.5 0 0 1-1.7-1l-2 .5-1.5-2.6 1.6-1.2a4.8 4.8 0 0 1 0-2L1.2 6.6l1.5-2.6 2 .5a5.5 5.5 0 0 1 1.7-1l.5-2Z" />
    <circle cx="8" cy="8" r="2.25" />
  </svg>
)

// Itens da navbar (itens individuais + grupos)
const navItems: NavGroupItem[] = [
  {
    type: 'item',
    view: 'today',
    label: 'Dashboard',
    icon: todayIcon,
  },
  ...navGroups.map(group => ({
    type: 'group' as const,
    group,
    label: group.label,
    icon: group.icon,
  })),
]

export const InternalNav = ({ activeView, onChange, disabled = false }: InternalNavProps) => {
  const [openDropdown, setOpenDropdown] = useState<NavGroup | null>(null)
  const orgRef = useRef<HTMLButtonElement>(null)
  const workRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLButtonElement>(null)
  const toolsRef = useRef<HTMLButtonElement>(null)
  const personalRef = useRef<HTMLButtonElement>(null)

  const getButtonRef = (groupId: string): React.RefObject<HTMLButtonElement> => {
    switch (groupId) {
      case 'organization': return orgRef
      case 'work': return workRef
      case 'content': return contentRef
      case 'tools': return toolsRef
      case 'personal': return personalRef
      default: return { current: null }
    }
  }

  const handleClick = (view: AppView) => (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (disabled) return
    setOpenDropdown(null)
    onChange(view)
  }

  const handleGroupClick = (group: NavGroup) => (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (disabled) return
    setOpenDropdown(openDropdown?.id === group.id ? null : group)
  }

  const isGroupActive = (group: NavGroup): boolean => {
    return group.items.some(item => item.view === activeView)
  }

  const handleDropdownSelect = (view: AppView) => {
    onChange(view)
    setOpenDropdown(null)
  }

  return (
    <>
      <nav className="app-nav">
        <div className="app-nav-tabs">
          {navItems.map((item) => {
            if (item.type === 'item' && item.view) {
              return (
                <button
                  key={item.view}
                  className={`app-nav-tab ${activeView === item.view ? 'is-active' : ''}`}
                  onClick={handleClick(item.view)}
                  disabled={disabled}
                  title={item.label}
                >
                  <span className="app-nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              )
            } else if (item.type === 'group' && item.group) {
              const isActive = isGroupActive(item.group)
              const isOpen = openDropdown?.id === item.group.id
              const buttonRef = getButtonRef(item.group.id)
              
              return (
                <div key={item.group.id} className="nav-dropdown-wrapper">
                  <button
                    ref={buttonRef}
                    className={`app-nav-tab ${isActive ? 'is-active' : ''} ${isOpen ? 'is-open' : ''}`}
                    onClick={handleGroupClick(item.group)}
                    disabled={disabled}
                    title={item.label}
                  >
                    <span className="app-nav-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    <span className="nav-dropdown-arrow">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 4.5l3 3 3-3" />
                      </svg>
                    </span>
                  </button>
                  {isOpen && (
                    <NavDropdown
                      group={item.group}
                      activeView={activeView}
                      onSelect={handleDropdownSelect}
                      onClose={() => setOpenDropdown(null)}
                      buttonRef={buttonRef}
                    />
                  )}
                </div>
              )
            }
            return null
          })}
        </div>

        <div className="app-nav-actions">
          <button
            className={`app-nav-action app-nav-action-settings ${activeView === 'settings' ? 'is-active' : ''}`}
            onClick={handleClick('settings')}
            disabled={disabled}
            title="Configuracoes"
          >
            <span className="app-nav-icon app-nav-settings-icon" aria-hidden="true">
              {settingsIcon}
            </span>
            <span>Config</span>
          </button>
        </div>

      </nav>
    </>
  )
}
