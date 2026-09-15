import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'

export const TablePickerPopover = ({
  editor,
  show,
  onClose,
}: {
  editor: Editor
  show: boolean
  onClose: () => void
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [hoverRows, setHoverRows] = useState(0)
  const [hoverCols, setHoverCols] = useState(0)

  useEffect(() => {
    if (!show) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [show, onClose])

  if (!show) return null

  return (
    <div ref={ref} className="editor-table-picker">
      <div className="editor-table-picker-label">
        {hoverRows > 0 ? `${hoverRows} x ${hoverCols}` : 'Selecione tamanho'}
      </div>
      <div className="editor-table-grid">
        {Array.from({ length: 5 }, (_, row) =>
          Array.from({ length: 5 }, (_, col) => (
            <button
              key={`${row}-${col}`}
              type="button"
              className={`editor-table-cell ${row < hoverRows && col < hoverCols ? 'active' : ''}`}
              onMouseEnter={() => { setHoverRows(row + 1); setHoverCols(col + 1) }}
              onClick={() => {
                editor.chain().focus().insertTable({ rows: row + 1, cols: col + 1, withHeaderRow: true }).run()
                onClose()
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}
