import { useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'

export const HeadingDropdown = ({ editor, show, onClose }: { editor: Editor; show: boolean; onClose: () => void }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!show) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [show, onClose])

  if (!show) return null

  const items = [
    { label: 'Paragrafo', action: () => editor.chain().focus().setParagraph().run(), active: editor.isActive('paragraph') && !editor.isActive('heading') },
    { label: 'Titulo 1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }) },
    { label: 'Titulo 2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }) },
    { label: 'Titulo 3', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }) },
  ]

  const currentLabel = items.find(i => i.active)?.label ?? 'Paragrafo'

  return (
    <div ref={ref} className="editor-toolbar-dropdown-menu">
      {items.map(item => (
        <button
          key={item.label}
          type="button"
          className={`editor-toolbar-dropdown-item ${item.active ? 'active' : ''}`}
          onClick={() => { item.action(); onClose() }}
        >
          {item.label}
          {item.label === currentLabel && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ marginLeft: 'auto' }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>
      ))}
    </div>
  )
}
