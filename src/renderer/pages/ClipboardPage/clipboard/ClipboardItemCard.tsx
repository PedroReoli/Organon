import type { ClipboardCategory, ClipboardItem } from '@types'
import { CONTENT_TYPE_COLORS, CONTENT_TYPE_LABELS } from './clipboardClassifier'

interface ClipboardItemCardProps {
  item:         ClipboardItem
  categories:   ClipboardCategory[]
  isCopied:     boolean
  onCopy:       (item: ClipboardItem) => void
  onPin:        (item: ClipboardItem) => void
  onRemove:     (id: string) => void
  onMove:       (id: string, categoryId: string | null) => void
  onEditTitle:  (item: ClipboardItem) => void
  /** Upgrade 18: toggle snippet flag. */
  onToggleSnippet?: (id: string) => void
}

export const ClipboardItemCard = ({
  item,
  categories,
  isCopied,
  onCopy,
  onPin,
  onRemove,
  onMove,
  onEditTitle,
  onToggleSnippet,
}: ClipboardItemCardProps) => {
  const typeColor  = CONTENT_TYPE_COLORS[item.contentType]
  const typeLabel  = CONTENT_TYPE_LABELS[item.contentType]
  const isColor    = item.contentType === 'color'
  const preview    = item.content.length > 200
    ? `${item.content.slice(0, 200)}...`
    : item.content

  return (
    <article className={`cb-card ${item.isPinned ? 'is-pinned' : ''}`}>
      <div className="cb-card-header">
        <div className="cb-card-meta">
          <span
            className="cb-card-type-badge"
            style={{ background: `${typeColor}22`, color: typeColor, borderColor: `${typeColor}44` }}
          >
            {isColor && (
              <span className="cb-color-swatch" style={{ background: item.content }} />
            )}
            {typeLabel}
          </span>

          {item.copyCount > 0 && (
            <span className="cb-card-copy-count" title="Vezes copiado">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {item.copyCount}
            </span>
          )}
        </div>

        <div className="cb-card-actions">
          <button type="button" className={`cb-icon-btn ${item.isPinned ? 'is-active' : ''}`} title={item.isPinned ? 'Desafixar' : 'Fixar (nao sera apagado)'} onClick={() => onPin(item)}>
            <svg viewBox="0 0 24 24" fill={item.isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" width="13" height="13">
              <path d="M12 17v5M8 9V3h8v6l2 4H6l2-4Z" />
            </svg>
          </button>
          <button type="button" className="cb-icon-btn" title="Renomear" onClick={() => onEditTitle(item)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
            </svg>
          </button>
          {onToggleSnippet && (
            <button
              type="button"
              className={`cb-icon-btn ${item.isSnippet ? 'is-active' : ''}`}
              title={item.isSnippet ? 'Snippet curado (nao expira) - clique para remover' : 'Marcar como snippet (nao expira)'}
              onClick={() => onToggleSnippet(item.id)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="13" x2="15" y2="13" />
              </svg>
            </button>
          )}
          <button type="button" className="cb-icon-btn cb-icon-btn-danger" title="Remover" onClick={() => onRemove(item.id)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
          </button>
        </div>
      </div>

      {item.title && item.title !== item.content && (
        <p className="cb-card-title">{item.title}</p>
      )}

      <pre className="cb-card-preview">{preview}</pre>

      <div className="cb-card-footer">
        <select
          className="cb-select cb-select-sm"
          value={item.categoryId ?? ''}
          onChange={e => onMove(item.id, e.target.value || null)}
          title="Mover para pasta"
        >
          <option value="">Sem pasta</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <button
          type="button"
          className={`cb-copy-btn ${isCopied ? 'is-copied' : ''}`}
          onClick={() => onCopy(item)}
        >
          {isCopied ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copiado!
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copiar
            </>
          )}
        </button>
      </div>
    </article>
  )
}
