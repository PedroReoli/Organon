import { useEffect, useRef, useState } from 'react'
import type { KeyboardShortcut } from '../types'

interface KeyboardShortcutCaptureProps {
  shortcut: KeyboardShortcut
  onSave: (keys: KeyboardShortcut['keys']) => void
  onCancel: () => void
}

export const KeyboardShortcutCapture = ({ shortcut, onSave, onCancel }: KeyboardShortcutCaptureProps) => {
  const [capturedKeys, setCapturedKeys] = useState<KeyboardShortcut['keys'] | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(1000) // 1 segundo em ms
  const [isCapturing, setIsCapturing] = useState(true)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastKeyTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    if (!isCapturing) return

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const now = Date.now()
      lastKeyTimeRef.current = now
      setTimeRemaining(1000)

      // Reset timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Ignorar teclas especiais que não são úteis
      if (e.key === 'Escape') {
        setIsCapturing(false)
        onCancel()
        return
      }

      const keys: KeyboardShortcut['keys'] = {
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey,
        key: e.key,
      }

      setCapturedKeys(keys)

      // Se passou 1 segundo sem nova tecla, salva (só se houver uma tecla válida)
      if (keys.key && keys.key !== 'Meta' && keys.key !== 'Control' && keys.key !== 'Shift' && keys.key !== 'Alt') {
        timeoutRef.current = setTimeout(() => {
          setIsCapturing(false)
          onSave(keys)
        }, 1000)
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isCapturing, onSave, onCancel])

  useEffect(() => {
    if (!isCapturing) return

    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = now - lastKeyTimeRef.current
      const remaining = Math.max(0, 1000 - elapsed)
      setTimeRemaining(remaining)

      if (remaining === 0 && capturedKeys) {
        setIsCapturing(false)
        onSave(capturedKeys)
      }
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [isCapturing, capturedKeys, onSave, onCancel])

  const formatKey = (key: string) => {
    const keyMap: Record<string, string> = {
      ' ': 'Space',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
      'Enter': 'Enter',
      'Escape': 'Esc',
      'Tab': 'Tab',
      'Backspace': 'Backspace',
      'Delete': 'Delete',
      'Meta': 'Cmd',
    }
    return keyMap[key] || key.toUpperCase()
  }

  const formatShortcut = (keys: KeyboardShortcut['keys'] | null) => {
    if (!keys) return 'Pressione as teclas...'
    const parts: string[] = []
    if (keys.ctrl) parts.push('Ctrl')
    if (keys.shift) parts.push('Shift')
    if (keys.alt) parts.push('Alt')
    if (keys.meta) parts.push('Cmd')
    parts.push(formatKey(keys.key))
    return parts.join(' + ')
  }

  return (
    <div className="keyboard-shortcut-capture">
      <div className="keyboard-shortcut-capture-content">
        <div className="keyboard-shortcut-capture-label">Capturando atalho...</div>
        <div className="keyboard-shortcut-capture-keys">
          {formatShortcut(capturedKeys)}
        </div>
        <div className="keyboard-shortcut-capture-timer">
          <div
            className="keyboard-shortcut-capture-timer-bar"
            style={{ width: `${(timeRemaining / 1000) * 100}%` }}
          />
        </div>
        <div className="keyboard-shortcut-capture-hint">
          Pressione Esc para cancelar
        </div>
      </div>
    </div>
  )
}
