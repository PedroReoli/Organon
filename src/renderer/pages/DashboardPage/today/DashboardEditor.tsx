import { useState } from 'react'
import type { DashboardWidget, DashboardWidgetColSpan, DashboardWidgetType } from '@types'
import { DEFAULT_DASHBOARD_WIDGETS } from '@types'

const WIDGET_LABELS: Record<DashboardWidgetType, string> = {
  'widget-search':    'Barra de busca',
  'widget-datetime':  'Data e hora',
  'report-tasks':     'Foco do dia',
  'report-events':    'Agenda de hoje',
  'report-week':      'Semana',
  'report-financial': 'Financeiro',
  'report-knowledge': 'Conhecimento',
  'report-tools':     'Ferramentas',
  'report-system':    'Sistema',
  'hub-planner':      'Hub — Planejamento',
  'hub-calendar':     'Hub — Calendário',
  'hub-crm':          'Hub — CRM',
  'hub-playbook':     'Hub — Playbook',
  'hub-projects':     'Hub — Projetos',
  'hub-notes':        'Hub — Notas',
  'hub-habits':       'Hub — Hábitos',
  'hub-study':        'Hub — Estudos',
  'hub-financial':    'Hub — Financeiro',
  'hub-shortcuts':    'Hub — Atalhos',
  'hub-apps':         'Hub — Apps',
  'hub-clipboard':    'Hub — Clipboard',
  'hub-colors':       'Hub — Cores',
}

interface DashboardEditorProps {
  widgets:   DashboardWidget[]
  onChange:  (widgets: DashboardWidget[]) => void
  onClose:   () => void
}

export const DashboardEditor = ({ widgets, onChange, onClose }: DashboardEditorProps) => {
  const [local,     setLocal]     = useState<DashboardWidget[]>(() => [...widgets].sort((a, b) => a.order - b.order))
  const [dragIdx,   setDragIdx]   = useState<number | null>(null)
  const [overIdx,   setOverIdx]   = useState<number | null>(null)

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverIdx(idx)
  }

  const handleDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setOverIdx(null); return }
    const reordered = [...local]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(idx, 0, moved)
    const updated = reordered.map((w, i) => ({ ...w, order: i }))
    setLocal(updated)
    setDragIdx(null)
    setOverIdx(null)
  }

  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null) }

  // ── Widget controls ────────────────────────────────────────────────────────

  const toggleVisible = (id: string) =>
    setLocal(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w))

  const changeSpan = (id: string, colSpan: DashboardWidgetColSpan) =>
    setLocal(prev => prev.map(w => w.id === id ? { ...w, colSpan } : w))

  const handleReset = () =>
    setLocal([...DEFAULT_DASHBOARD_WIDGETS].sort((a, b) => a.order - b.order))

  const handleSave = () => {
    onChange(local.map((w, i) => ({ ...w, order: i })))
    onClose()
  }

  const visibleCount = local.filter(w => w.visible).length
  const visible      = local.filter(w => w.visible)
  const hidden       = local.filter(w => !w.visible)

  return (
    <div className="de-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Editor de dashboard">
      <div className="de-panel" onClick={e => e.stopPropagation()}>
        <div className="de-header">
          <div className="de-header-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <h2>Personalizar dashboard</h2>
          </div>
          <button type="button" className="de-close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <p className="de-hint">
          Arraste para reordenar, ajuste a largura (1–3 colunas) e ative/desative widgets.
        </p>

        <section className="de-section">
          <div className="de-section-label">Visíveis ({visibleCount})</div>
          <div className="de-list">
            {visible.map((widget, idx) => (
              <div
                key={widget.id}
                className={`de-item de-item-visible ${dragIdx === idx ? 'de-dragging' : ''} ${overIdx === idx ? 'de-over' : ''}`}
                draggable
                onDragStart={handleDragStart(idx)}
                onDragOver={handleDragOver(idx)}
                onDrop={handleDrop(idx)}
                onDragEnd={handleDragEnd}
              >
                <div className="de-item-drag" title="Arrastar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <circle cx="9" cy="5" r="1" fill="currentColor" />
                    <circle cx="15" cy="5" r="1" fill="currentColor" />
                    <circle cx="9" cy="12" r="1" fill="currentColor" />
                    <circle cx="15" cy="12" r="1" fill="currentColor" />
                    <circle cx="9" cy="19" r="1" fill="currentColor" />
                    <circle cx="15" cy="19" r="1" fill="currentColor" />
                  </svg>
                </div>

                <span className="de-item-label">{WIDGET_LABELS[widget.type]}</span>

                <div className="de-span-btns">
                  {([1, 2, 3] as DashboardWidgetColSpan[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      className={`de-span-btn ${widget.colSpan === s ? 'is-active' : ''}`}
                      onClick={() => changeSpan(widget.id, s)}
                      title={`${s} coluna${s > 1 ? 's' : ''}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <button type="button" className="de-toggle-btn de-toggle-on" onClick={() => toggleVisible(widget.id)} title="Ocultar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>

        {hidden.length > 0 && (
          <section className="de-section">
            <div className="de-section-label">Ocultos ({hidden.length})</div>
            <div className="de-list">
              {hidden.map(widget => (
                <div key={widget.id} className="de-item de-item-hidden">
                  <span className="de-item-label de-label-muted">{WIDGET_LABELS[widget.type]}</span>
                  <button type="button" className="de-toggle-btn de-toggle-off" onClick={() => toggleVisible(widget.id)} title="Mostrar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="de-actions">
          <button type="button" className="de-reset-btn" onClick={handleReset}>Restaurar padrão</button>
          <div className="de-actions-right">
            <button type="button" className="de-cancel-btn" onClick={onClose}>Cancelar</button>
            <button type="button" className="de-save-btn" onClick={handleSave}>Salvar layout</button>
          </div>
        </div>
      </div>
    </div>
  )
}
