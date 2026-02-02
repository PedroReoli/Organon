import { useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import type { AppView } from './InternalNav'
import type { NavGroup } from './navGroups'

interface NavDropdownProps {
  group: NavGroup
  activeView: AppView
  onSelect: (view: AppView) => void
  onClose: () => void
  buttonRef: React.RefObject<HTMLButtonElement>
}

export const NavDropdown = ({ group, activeView, onSelect, onClose, buttonRef }: NavDropdownProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    // Posicionar dropdown
    if (buttonRef.current && dropdownRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      dropdownRef.current.style.top = `${buttonRect.bottom + 4}px`
      dropdownRef.current.style.left = `${buttonRect.left}px`
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose, buttonRef])

  const handleItemClick = (view: AppView) => (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    onSelect(view)
    onClose()
  }

  return (
    <div ref={dropdownRef} className="nav-dropdown">
      {group.items.map(item => (
        <button
          key={item.view}
          className={`nav-dropdown-item ${activeView === item.view ? 'is-active' : ''}`}
          onClick={handleItemClick(item.view)}
        >
          <span className="nav-dropdown-item-icon">{item.icon}</span>
          <span className="nav-dropdown-item-label">{item.label}</span>
        </button>
      ))}
    </div>
  )
}
