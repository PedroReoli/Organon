import { useEffect, useRef } from 'react'
import { PRESET_COLORS } from '../constants'

export const ColorPickerPopover = ({
  show,
  onClose,
  onSelect,
  activeColor,
}: {
  show: boolean
  onClose: () => void
  onSelect: (color: string) => void
  activeColor: string | null
}) => {
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

  return (
    <div ref={ref} className="editor-color-picker">
      <button
        type="button"
        className={`editor-color-swatch ${!activeColor ? 'active' : ''}`}
        style={{ background: 'transparent', border: '2px dashed var(--color-border)' }}
        onClick={() => { onSelect(''); onClose() }}
        title="Remover cor"
      />
      {PRESET_COLORS.map(color => (
        <button
          key={color}
          type="button"
          className={`editor-color-swatch ${activeColor === color ? 'active' : ''}`}
          style={{ background: color }}
          onClick={() => { onSelect(color); onClose() }}
          title={color}
        />
      ))}
    </div>
  )
}
