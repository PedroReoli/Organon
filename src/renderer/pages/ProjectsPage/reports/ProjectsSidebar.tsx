import React, { useState } from 'react'
import {
  LayoutGrid,
  CalendarDays,
  Activity,
  GitCompare,
  BarChart3,
  Clock,
  Target,
  Search,
  Hexagon,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  FolderGit2,
} from 'lucide-react'

export interface ProjectsSidebarProps {
  activeScreen: string
  onSelectScreen: (id: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  repoCount?: number
  weekLabel?: string
  alertsCount?: number
}

interface NavItemDef {
  id: string
  label: string
  icon: React.ReactNode
  badge?: string | number | null
}

interface NavGroupDef {
  id: string
  title: string
  items: NavItemDef[]
}

export const ProjectsSidebar: React.FC<ProjectsSidebarProps> = ({
  activeScreen,
  onSelectScreen,
  isOpen,
  setIsOpen,
  repoCount,
  weekLabel,
  alertsCount,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)

  React.useEffect(() => {
    const handleToggle = () => {
      setIsCollapsed(prev => !prev)
    }
    window.addEventListener('organon:toggle-left-sidebar', handleToggle)
    return () => window.removeEventListener('organon:toggle-left-sidebar', handleToggle)
  }, [])

  const groups: NavGroupDef[] = [
    {
      id: 'operacional',
      title: 'Operacional',
      items: [
        {
          id: 'general',
          label: 'Central Git',
          icon: <LayoutGrid size={15} />,
          badge: repoCount && repoCount > 0 ? repoCount : null,
        },
        {
          id: 'dashboard',
          label: 'Semana Atual',
          icon: <CalendarDays size={15} />,
          badge: weekLabel ? (weekLabel.match(/\d+/) ? `S-${weekLabel.match(/\d+/)![0]}` : 'Atual') : null,
        },
        {
          id: 'timeline',
          label: 'Timeline',
          icon: <Activity size={15} />,
        },
        {
          id: 'compare',
          label: 'Comparativo',
          icon: <GitCompare size={15} />,
        },
      ],
    },
    {
      id: 'analise',
      title: 'Análise & Metas',
      items: [
        {
          id: 'overview',
          label: 'Visão Geral',
          icon: <BarChart3 size={15} />,
        },
        {
          id: 'history',
          label: 'Histórico',
          icon: <Clock size={15} />,
        },
        {
          id: 'goals',
          label: 'Metas',
          icon: <Target size={15} />,
        },
        {
          id: 'search',
          label: 'Busca',
          icon: <Search size={15} />,
        },
      ],
    },
    {
      id: 'sistema',
      title: 'Sistema',
      items: [
        {
          id: 'packagejson',
          label: 'package.json',
          icon: <Hexagon size={15} />,
          badge: alertsCount && alertsCount > 0 ? `! ${alertsCount}` : null,
        },
        {
          id: 'config',
          label: 'Configurações',
          icon: <Settings size={15} />,
        },
      ],
    },
  ]

  return (
    <nav
      className={`projects-sidebar-enhanced ${isOpen ? 'is-open' : ''} ${
        isCollapsed ? 'is-collapsed' : ''
      }`}
    >
      {/* Brand Header */}
      <div className="projects-sidebar-brand">
        <div className="projects-sidebar-brand-left">
          <div className="projects-sidebar-brand-icon">
            <FolderGit2 size={16} />
          </div>
          {!isCollapsed && (
            <span className="projects-sidebar-brand-title">Projetos & Git</span>
          )}
        </div>

        <button
          type="button"
          className="projects-icon-btn"
          style={{ width: 24, height: 24 }}
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          {isCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {/* Nav Items grouped */}
      <div className="projects-sidebar-nav-scroll">
        {groups.map(group => (
          <div key={group.id} className="projects-sidebar-group">
            {!isCollapsed && (
              <span className="projects-sidebar-group-label">{group.title}</span>
            )}
            {group.items.map(item => {
              const isActive = activeScreen === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`projects-sidebar-btn ${isActive ? 'is-active' : ''}`}
                  onClick={() => {
                    onSelectScreen(item.id)
                    if (window.innerWidth <= 800) setIsOpen(false)
                  }}
                  title={item.label}
                >
                  <span className="projects-sidebar-btn-icon">{item.icon}</span>
                  {!isCollapsed && (
                    <>
                      <span className="projects-sidebar-btn-label">{item.label}</span>
                      {item.badge && (
                        <span className="projects-sidebar-badge">{item.badge}</span>
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer Status */}
      <div className="projects-sidebar-enhanced-footer">
        <div className="projects-sidebar-status-pill">
          <span className="projects-sidebar-status-dot" />
          {!isCollapsed && <span>Git Engine Pronto</span>}
        </div>
      </div>
    </nav>
  )
}
