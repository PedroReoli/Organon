import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'

export const LinkPopover = ({
  editor,
  show,
  onClose,
}: {
  editor: Editor
  show: boolean
  onClose: () => void
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (show) {
      const existingUrl = editor.getAttributes('link').href ?? ''
      setUrl(existingUrl)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [show, editor])

  useEffect(() => {
    if (!show) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [show, onClose])

  if (!show) return null

  const applyLink = () => {
    if (url.trim()) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    }
    onClose()
  }

  return (
    <div ref={ref} className="editor-link-popover">
      <input
        ref={inputRef}
        type="text"
        value={url}
        onChange={e => setUrl(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && applyLink()}
        placeholder="https://..."
        className="form-input"
      />
      <button type="button" className="btn btn-primary btn-sm" onClick={applyLink}>
        OK
      </button>
      {editor.isActive('link') && (
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => { editor.chain().focus().unsetLink().run(); onClose() }}
          style={{ color: 'var(--color-danger)' }}
        >
          Remover
        </button>
      )}
    </div>
  )
}
