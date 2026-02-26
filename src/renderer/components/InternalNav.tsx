import { useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import type { NavbarConfig } from '../types'
import { renderNavIcon, resolveNavbarConfig } from './navConfig'
import { NavDropdown, type NavDropdownGroup } from './NavDropdown'

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

type SyncStatus = 'idle' | 'pending' | 'syncing' | 'synced' | 'error'

interface InternalNavProps {
  activeView: AppView
  onChange: (view: AppView) => void
  disabled?: boolean
  navbarConfig?: NavbarConfig
  onOpenNavbarCustomize?: () => void
  syncStatus?: SyncStatus
  userLoggedIn?: boolean
}

interface NavGroupItem {
  type: 'item' | 'group'
  view?: AppView
  group?: NavDropdownGroup
  label: string
  icon: JSX.Element
}

const todayIcon = renderNavIcon('dashboard')

const settingsIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6.5 1.5h3l.5 2a5.5 5.5 0 0 1 1.7 1l2-.5 1.5 2.6-1.6 1.2c.1.3.1.7.1 1s0 .7-.1 1l1.6 1.2-1.5 2.6-2-.5a5.5 5.5 0 0 1-1.7 1l-.5 2h-3l-.5-2a5.5 5.5 0 0 1-1.7-1l-2 .5-1.5-2.6 1.6-1.2a4.8 4.8 0 0 1 0-2L1.2 6.6l1.5-2.6 2 .5a5.5 5.5 0 0 1 1.7-1l.5-2Z" />
    <circle cx="8" cy="8" r="2.25" />
  </svg>
)

const navbarCustomizeIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2.5 5.5h7" />
    <path d="M2.5 10.5h11" />
    <circle cx="11.5" cy="5.5" r="1.5" />
    <circle cx="6.5" cy="10.5" r="1.5" />
  </svg>
)

const syncIcons: Record<SyncStatus, JSX.Element> = {
  idle: <></>,
  pending: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3.5L10 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  syncing: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="nav-sync-spin">
      <path d="M13.5 8A5.5 5.5 0 0 0 4 4.5" strokeLinecap="round" />
      <path d="M2.5 8A5.5 5.5 0 0 0 12 11.5" strokeLinecap="round" />
      <path d="M2 3l2 1.5L2 6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 10l-2 1.5 2 1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  synced: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8.5l3.5 3.5 6.5-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
    </svg>
  ),
}

const syncLabels: Record<SyncStatus, string> = {
  idle: '',
  pending: 'Pendente',
  syncing: 'Sincronizando',
  synced: 'Sincronizado',
  error: 'Erro no sync',
}

export const InternalNav = ({ activeView, onChange, disabled = false, navbarConfig, onOpenNavbarCustomize, syncStatus = 'idle', userLoggedIn = false }: InternalNavProps) => {
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const groupButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const resolvedGroups = useMemo(() => {
    const config = resolveNavbarConfig(navbarConfig)
    const enabledGroups = config.groups.filter(group => group.enabled)
    const itemsByGroup = new Map(enabledGroups.map(group => [group.id, [] as NavDropdownGroup['items']]))

    for (const item of config.items) {
      if (!item.groupId) continue
      const list = itemsByGroup.get(item.groupId)
      if (!list) continue
      list.push({
        view: item.view as AppView,
        label: item.label,
        icon: renderNavIcon(item.iconId),
      })
    }

    return enabledGroups.map(group => ({
      id: group.id,
      label: group.label,
      icon: renderNavIcon(group.iconId),
      items: itemsByGroup.get(group.id) ?? [],
    }))
  }, [navbarConfig])

  const navItems: NavGroupItem[] = useMemo(() => ([
    {
      type: 'item',
      view: 'today',
      label: 'Dashboard',
      icon: todayIcon,
    },
    ...resolvedGroups.map(group => ({
      type: 'group' as const,
      group: {
        id: group.id,
        label: group.label,
        items: group.items,
      },
      label: group.label,
      icon: group.icon,
    })),
  ]), [resolvedGroups])

  const handleClick = (view: AppView) => (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (disabled) return
    setOpenDropdownId(null)
    onChange(view)
  }

  const handleGroupClick = (groupId: string) => (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (disabled) return
    setOpenDropdownId(prev => (prev === groupId ? null : groupId))
  }

  const isGroupActive = (group: NavDropdownGroup): boolean => group.items.some(item => item.view === activeView)

  const handleDropdownSelect = (view: AppView) => {
    onChange(view)
    setOpenDropdownId(null)
  }

  const handleOpenNavbarCustomize = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (disabled) return
    setOpenDropdownId(null)
    onOpenNavbarCustomize?.()
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
            }

            if (item.type === 'group' && item.group) {
              const isActive = isGroupActive(item.group)
              const isOpen = openDropdownId === item.group.id
              const anchorEl = groupButtonRefs.current[item.group.id] ?? null

              return (
                <div key={item.group.id} className="nav-dropdown-wrapper">
                  <button
                    ref={el => {
                      groupButtonRefs.current[item.group!.id] = el
                    }}
                    className={`app-nav-tab ${isActive ? 'is-active' : ''} ${isOpen ? 'is-open' : ''}`}
                    onClick={handleGroupClick(item.group.id)}
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
                      onClose={() => setOpenDropdownId(null)}
                      anchorEl={anchorEl}
                    />
                  )}
                </div>
              )
            }

            return null
          })}
        </div>

        <div className="app-nav-actions">
          {userLoggedIn && syncStatus !== 'idle' && (
            <div
              className={`nav-sync-indicator nav-sync-indicator--${syncStatus}`}
              title={syncLabels[syncStatus]}
            >
              <span className="app-nav-icon" aria-hidden="true">
                {syncIcons[syncStatus]}
              </span>
              <span>{syncLabels[syncStatus]}</span>
            </div>
          )}

          <button
            className="app-nav-action app-nav-action-navbar"
            onClick={handleOpenNavbarCustomize}
            disabled={disabled}
            title="Personalizar navbar"
          >
            <span className="app-nav-icon" aria-hidden="true">
              {navbarCustomizeIcon}
            </span>
            <span>Navbar</span>
          </button>

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
