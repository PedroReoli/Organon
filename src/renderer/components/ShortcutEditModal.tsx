import { useEffect, useMemo, useRef, useState } from 'react'
import type { ShortcutIcon, ShortcutItem } from '../types'
import { BUILTIN_SHORTCUT_ICONS, getBuiltinShortcutIcon } from './shortcutIconLibrary'

interface ShortcutEditModalProps {
  selectedIds: string[]
  shortcuts: ShortcutItem[]
  onClose: () => void
  onUpdateOne: (id: string, updates: Partial<Pick<ShortcutItem, 'title' | 'value' | 'icon'>>) => void
  onUpdateManyIcon: (ids: string[], icon: ShortcutIcon | null) => void
}

const isValidHttpUrl = (value: string) => /^https?:\/\/\S+$/i.test(value.trim())

export const ShortcutEditModal = ({ selectedIds, shortcuts, onClose, onUpdateOne, onUpdateManyIcon }: ShortcutEditModalProps) => {
  const isBulk = selectedIds.length > 1
  const selected = useMemo(() => shortcuts.find(s => s.id === selectedIds[0]) ?? null, [shortcuts, selectedIds])

  const [title, setTitle] = useState(selected?.title ?? '')
  const [url, setUrl] = useState(selected?.value ?? '')
  const [iconMode, setIconMode] = useState<'favicon' | 'builtin' | 'emoji'>(() => {
    const kind = selected?.icon?.kind ?? 'favicon'
    return kind
  })
  const [emoji, setEmoji] = useState(() => (selected?.icon?.kind === 'emoji' ? selected.icon.value : ''))
  const [builtinId, setBuiltinId] = useState(() => (selected?.icon?.kind === 'builtin' ? selected.icon.value : 'link'))
  const [error, setError] = useState<string | null>(null)

  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
    titleRef.current?.select()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const iconPreview = useMemo(() => {
    if (iconMode === 'favicon') return null
    if (iconMode === 'emoji') return emoji.trim().slice(0, 2) || null
    return getBuiltinShortcutIcon(builtinId)
  }, [iconMode, emoji, builtinId])

  const buildIcon = (): ShortcutIcon | null => {
    if (iconMode === 'favicon') return null
    if (iconMode === 'emoji') {
      const v = emoji.trim()
      if (!v) return null
      return { kind: 'emoji', value: v.slice(0, 2) }
    }
    return { kind: 'builtin', value: builtinId }
  }

  const handleSave = () => {
    setError(null)

    if (!isBulk) {
      if (!selected) {
        onClose()
        return
      }
      const nextTitle = title.trim()
      const nextUrl = url.trim()
      if (!nextTitle) {
        setError('Defina um nome para o atalho.')
        return
      }
      if (!isValidHttpUrl(nextUrl)) {
        setError('URL invalida. Use http/https.')
        return
      }
      onUpdateOne(selected.id, {
        title: nextTitle,
        value: nextUrl,
        icon: buildIcon(),
      })
      onClose()
      return
    }

    // Bulk: apenas ícone
    const icon = buildIcon()
    onUpdateManyIcon(selectedIds, icon)
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>{isBulk ? `Editar ${selectedIds.length} atalhos` : 'Editar Atalho'}</h2>
          <button className="modal-close-btn" onClick={onClose} title="Fechar (Esc)">&times;</button>
        </header>

        <div className="modal-body">
          {!isBulk && (
            <>
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input
                  ref={titleRef}
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <p className="form-hint">Use http/https.</p>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Icone</label>

            <div className="icon-mode-row">
              <button type="button" className={`icon-mode-btn ${iconMode === 'favicon' ? 'is-active' : ''}`} onClick={() => setIconMode('favicon')}>
                Favicon
              </button>
              <button type="button" className={`icon-mode-btn ${iconMode === 'builtin' ? 'is-active' : ''}`} onClick={() => setIconMode('builtin')}>
                Biblioteca
              </button>
              <button type="button" className={`icon-mode-btn ${iconMode === 'emoji' ? 'is-active' : ''}`} onClick={() => setIconMode('emoji')}>
                Emoji
              </button>
            </div>

            {iconMode === 'emoji' && (
              <div className="form-date-time" style={{ marginTop: 10 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: 🔥"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  style={{ width: 140 }}
                />
                <div className="icon-preview">
                  {iconPreview ?? '—'}
                </div>
              </div>
            )}

            {iconMode === 'builtin' && (
              <>
                <div className="icon-grid" style={{ marginTop: 10 }}>
                  {BUILTIN_SHORTCUT_ICONS.map(icon => (
                    <button
                      key={icon.id}
                      type="button"
                      className={`icon-tile ${builtinId === icon.id ? 'is-active' : ''}`}
                      onClick={() => setBuiltinId(icon.id)}
                      title={icon.label}
                    >
                      <span className="icon-tile-svg" aria-hidden="true">{icon.node}</span>
                      <span className="icon-tile-label">{icon.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {iconMode === 'favicon' && (
              <p className="form-hint" style={{ marginTop: 8 }}>
                Usa o favicon do link automaticamente.
              </p>
            )}
          </div>

          {error && <div className="form-error">{error}</div>}
        </div>

        <footer className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}>
            Salvar
          </button>
        </footer>
      </div>
    </div>
  )
}

