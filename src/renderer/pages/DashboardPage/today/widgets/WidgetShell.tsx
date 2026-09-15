import type { ReactNode } from 'react'
import type { DashboardWidgetColSpan } from '@types'

interface WidgetShellProps {
  colSpan:     DashboardWidgetColSpan
  title:       string
  count?:      number | string
  children:    ReactNode
  footer?:     ReactNode
  editMode?:   boolean
  onRemove?:   () => void
  onSpanChange?: (span: DashboardWidgetColSpan) => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  isDragging?: boolean
}

export const WidgetShell = ({
  colSpan,
  title,
  count,
  children,
  footer,
  editMode,
  onRemove,
  onSpanChange,
  dragHandleProps,
  isDragging,
}: WidgetShellProps) => (
  <article
    className={`dw-shell dw-span-${colSpan} ${editMode ? 'dw-edit-mode' : ''} ${isDragging ? 'dw-dragging' : ''}`}
  >
    <div className="dw-header">
      {editMode && dragHandleProps && (
        <div className="dw-drag-handle" {...dragHandleProps} title="Arrastar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <circle cx="9" cy="5" r="1" fill="currentColor" />
            <circle cx="15" cy="5" r="1" fill="currentColor" />
            <circle cx="9" cy="12" r="1" fill="currentColor" />
            <circle cx="15" cy="12" r="1" fill="currentColor" />
            <circle cx="9" cy="19" r="1" fill="currentColor" />
            <circle cx="15" cy="19" r="1" fill="currentColor" />
          </svg>
        </div>
      )}
      <span className="dw-title">{title}</span>
      {count !== undefined && <span className="dw-count">{count}</span>}

      {editMode && onSpanChange && (
        <div className="dw-span-controls">
          {([1, 2, 3] as DashboardWidgetColSpan[]).map(s => (
            <button
              key={s}
              type="button"
              className={`dw-span-btn ${colSpan === s ? 'is-active' : ''}`}
              onClick={() => onSpanChange(s)}
              title={`${s} coluna${s > 1 ? 's' : ''}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {editMode && onRemove && (
        <button type="button" className="dw-remove-btn" onClick={onRemove} title="Remover widget">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>

    <div className="dw-body">{children}</div>

    {footer && <div className="dw-footer">{footer}</div>}
  </article>
)
