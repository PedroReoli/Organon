import React from 'react'
import type { AppView } from '../../shared/InternalNav'
import {
  SquaresFour,
  Kanban,
  Notebook,
  GitFork,
  Headphones,
  ShareNetwork,
  GearSix
} from '@phosphor-icons/react'

interface ModernHubNavigationProps {
  onNavigate: (view: AppView) => void
}

export const ModernHubNavigation: React.FC<ModernHubNavigationProps> = ({ onNavigate }) => {
  const hubs: Array<{
    label: string
    view: AppView
    icon: React.ReactNode
  }> = [
    {
      label: 'Planejador',
      view: 'planner',
      icon: <Kanban size={16} weight="duotone" style={{ color: 'var(--color-primary)' }} />,
    },
    {
      label: 'Notas',
      view: 'notes',
      icon: <Notebook size={16} weight="duotone" style={{ color: 'var(--color-primary)' }} />,
    },
    {
      label: 'Projetos',
      view: 'projects',
      icon: <GitFork size={16} weight="duotone" style={{ color: 'var(--color-primary)' }} />,
    },
    {
      label: 'Modo Foco',
      view: 'study',
      icon: <Headphones size={16} weight="duotone" style={{ color: 'var(--color-primary)' }} />,
    },
    {
      label: 'System Design',
      view: 'system-design',
      icon: <ShareNetwork size={16} weight="duotone" style={{ color: 'var(--color-primary)' }} />,
    },
    {
      label: 'Configurações',
      view: 'settings',
      icon: <GearSix size={16} weight="duotone" style={{ color: 'var(--color-primary)' }} />,
    }
  ]

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
      className="border p-3.5 rounded-xl shadow-xs flex flex-col justify-between h-full select-none"
    >
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <div
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
              color: 'var(--color-primary)',
            }}
            className="p-1.5 rounded-lg"
          >
            <SquaresFour size={16} weight="duotone" />
          </div>
          <div>
            <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold uppercase tracking-wider">
              Acessos Rápidos
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {hubs.map(hub => (
            <button
              key={hub.view}
              type="button"
              onClick={() => onNavigate(hub.view)}
              style={{
                background: 'color-mix(in srgb, var(--color-background) 70%, var(--color-surface))',
                borderColor: 'var(--color-border)',
              }}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all group cursor-pointer hover:border-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface))]"
            >
              <div
                style={{
                  background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                }}
                className="p-1 rounded-md group-hover:scale-110 transition-transform shrink-0"
              >
                {hub.icon}
              </div>
              <span
                style={{ color: 'var(--color-text)' }}
                className="text-xs font-semibold truncate group-hover:text-[var(--color-primary)] transition-colors"
              >
                {hub.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
