import React from 'react'

export type ViewName = 'licenses' | 'create'

interface SidebarProps {
  activeView: ViewName
  onNavigate: (view: ViewName) => void
}

const nav: { id: ViewName; label: string; icon: React.ReactNode }[] = [
  {
    id: 'licenses',
    label: 'Licenças',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 9h6M9 12h6M9 15h4" />
      </svg>
    ),
  },
  {
    id: 'create',
    label: 'Nova Licença',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
]

export default function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <div className="w-48 flex-shrink-0 bg-slate-900 border-r border-slate-700/50 flex flex-col py-4">
      <div className="px-4 mb-6">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Menu</span>
      </div>
      <nav className="flex flex-col gap-1 px-2">
        {nav.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
              activeView === item.id
                ? 'bg-blue-600/20 text-blue-400 font-medium'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
