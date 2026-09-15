import { useEffect, useRef } from 'react'
import type { SlashCommand } from '@types'

export interface SlashMenuState {
  open: boolean
  query: string
  top: number
  left: number
  selectedIndex: number
}

export const SlashCommandMenu = ({
  menu,
  items,
  onSelect,
  onHover,
  onClose,
}: {
  menu: SlashMenuState
  items: SlashCommand[]
  onSelect: (item: SlashCommand) => void
  onHover: (index: number) => void
  onClose: () => void
}) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  useEffect(() => {
    const el = ref.current?.querySelector(`[data-index="${menu.selectedIndex}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [menu.selectedIndex])

  if (!items.length) return null

  return (
    <div
      ref={ref}
      className="slash-menu"
      style={{ top: menu.top, left: menu.left }}
    >
      {items.map((item, idx) => (
        <button
          key={item.id}
          data-index={idx}
          className={`slash-menu-item ${idx === menu.selectedIndex ? 'selected' : ''}`}
          onMouseDown={e => { e.preventDefault(); onSelect(item) }}
          onMouseEnter={() => onHover(idx)}
          type="button"
        >
          <div className="slash-menu-item-icon">{item.icon}</div>
          <div className="slash-menu-item-text">
            <div className="slash-menu-item-label">{item.label}</div>
            <div className="slash-menu-item-desc">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  )
}
