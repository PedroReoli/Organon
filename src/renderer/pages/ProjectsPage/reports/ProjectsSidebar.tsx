import React from 'react'

export interface ProjectsSidebarProps {
  navItems: { id: string; label: string; icon: React.ReactNode }[]
  activeScreen: string
  onSelectScreen: (id: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export const ProjectsSidebar: React.FC<ProjectsSidebarProps> = ({
  navItems,
  activeScreen,
  onSelectScreen,
  isOpen,
  setIsOpen,
}) => {
  return (
    <nav className={`projects-sidebar ${isOpen ? 'is-open' : ''}`}>
      <div className="projects-sidebar-header">
        <span className="projects-sidebar-title">Projetos</span>
      </div>
      <div className="projects-sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            type="button"
            className={`projects-sidebar-item ${activeScreen === item.id ? 'is-active' : ''}`}
            onClick={() => {
              onSelectScreen(item.id)
              if (window.innerWidth <= 800) setIsOpen(false)
            }}
            title={item.label}
          >
            <span className="projects-sidebar-item-icon">{item.icon}</span>
            <span className="projects-sidebar-item-label">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="projects-sidebar-footer">
        {/* Footer actions or info can go here */}
      </div>
    </nav>
  )
}
