import React from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'

export interface SectionHeaderProps {
  label: string
  icon?: React.ReactNode
  count?: number
  isCollapsed?: boolean
  isDropTarget?: boolean
  onToggle?: () => void
  onDragOver?: (event: React.DragEvent<HTMLButtonElement>) => void
  onDragLeave?: (event: React.DragEvent<HTMLButtonElement>) => void
  onDrop?: (event: React.DragEvent<HTMLButtonElement>) => void
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  label,
  icon,
  count,
  isCollapsed,
  isDropTarget,
  onToggle,
  onDragOver,
  onDragLeave,
  onDrop,
}) => (
  <button
    type="button"
    onClick={onToggle}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
    style={{
      borderColor: isDropTarget ? 'var(--color-primary)' : 'transparent',
      background: isDropTarget ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)' : 'transparent',
    }}
    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/[0.04] transition-all cursor-pointer group select-none"
  >
    <div className="flex items-center gap-1.5 truncate">
      {onToggle && (
        <span className="opacity-60 group-hover:opacity-100 transition-opacity">
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </span>
      )}
      {icon && <span className="opacity-80">{icon}</span>}
      <span className="uppercase text-[11px] font-bold tracking-wider truncate">{label}</span>
    </div>

    {count !== undefined && count > 0 && (
      <span
        style={{
          background: 'color-mix(in srgb, var(--color-background) 80%, var(--color-surface))',
          color: 'var(--color-text-muted)',
        }}
        className="text-[10px] font-mono px-1.5 py-0.2 rounded-full border border-neutral-700/20 shrink-0"
      >
        {count}
      </span>
    )}
  </button>
)
