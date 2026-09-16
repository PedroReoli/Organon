import React from 'react'
import type { AppView } from '../../shared/InternalNav'
import {
  Calendar,
  FileText,
  FolderKanban,
  Users,
  Headphones,
  Network,
  CheckSquare,
  Settings,
  LayoutGrid
} from 'lucide-react'

interface ModernHubNavigationProps {
  onNavigate: (view: AppView) => void
}

export const ModernHubNavigation: React.FC<ModernHubNavigationProps> = ({ onNavigate }) => {
  const hubs: Array<{
    label: string
    desc: string
    view: AppView
    icon: React.ReactNode
  }> = [
    {
      label: 'Planejador',
      desc: 'Sprints & Dia',
      view: 'planner',
      icon: <Calendar className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />,
    },
    {
      label: 'Notas',
      desc: 'Base de Conhecimento',
      view: 'notes',
      icon: <FileText className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />,
    },
    {
      label: 'Projetos',
      desc: 'Portfólio & Repos',
      view: 'projects',
      icon: <FolderKanban className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />,
    },
    {
      label: 'CRM',
      desc: 'Contatos & Deals',
      view: 'crm',
      icon: <Users className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />,
    },
    {
      label: 'Modo Foco',
      desc: 'Pomodoro & Som',
      view: 'study',
      icon: <Headphones className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />,
    },
    {
      label: 'System Design',
      desc: 'Diagramas & Canvas',
      view: 'system-design',
      icon: <Network className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />,
    },
    {
      label: 'Hábitos',
      desc: 'Rotina & Streak',
      view: 'habits',
      icon: <CheckSquare className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />,
    },
    {
      label: 'Configurações',
      desc: 'Preferências & Sync',
      view: 'settings',
      icon: <Settings className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />,
    }
  ]

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
      className="border p-4 rounded-xl shadow-xs"
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          style={{
            background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
            color: 'var(--color-primary)',
          }}
          className="p-1.5 rounded-lg"
        >
          <LayoutGrid className="w-4 h-4" />
        </div>
        <div>
          <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold">Acessos Rápidos</h3>
          <p style={{ color: 'var(--color-text-muted)' }} className="text-[11px]">Módulos centrais do Organon</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {hubs.map(hub => (
          <button
            key={hub.view}
            type="button"
            onClick={() => onNavigate(hub.view)}
            style={{
              background: 'color-mix(in srgb, var(--color-background) 60%, var(--color-surface))',
              borderColor: 'var(--color-border)',
            }}
            className="flex items-center gap-2.5 p-2 rounded-lg border text-left transition-all group cursor-pointer hover:border-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-surface))]"
          >
            <div
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
              }}
              className="p-1.5 rounded-md group-hover:scale-105 transition-transform shrink-0"
            >
              {hub.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div
                style={{ color: 'var(--color-text)' }}
                className="text-xs font-bold truncate group-hover:text-[var(--color-primary)]"
              >
                {hub.label}
              </div>
              <div style={{ color: 'var(--color-text-muted)' }} className="text-[10px] truncate">
                {hub.desc}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
