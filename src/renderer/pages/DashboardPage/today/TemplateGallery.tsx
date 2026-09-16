import { useState } from 'react'
import type { DashboardTemplate, DashboardWidget } from '@types'
import { BUILTIN_DASHBOARD_TEMPLATES } from '@types'

interface TemplateGalleryProps {
  userTemplates:    DashboardTemplate[]
  onApply:          (widgets: DashboardWidget[]) => void
  onDelete:         (id: string) => void
  onCreateBlank:    () => void
  onClose:          () => void
}

const WIDGET_PREVIEW_LABELS: Record<string, string> = {
  'widget-datetime':  'Data e hora',
  'widget-search':    'Busca',
  'report-tasks':     'Foco do dia',
  'report-events':    'Agenda',
  'report-week':      'Semana',
  'report-financial': 'Financeiro',
  'report-knowledge': 'Conhecimento',
  'report-tools':     'Ferramentas',
  'report-system':    'Sistema',
  'hub-planner':      'Planejamento',
  'hub-calendar':     'Calendário',
  'hub-notes':        'Notas',
  'hub-study':        'Estudos',
  'hub-projects':     'Projetos',
  'hub-shortcuts':    'Atalhos',
  'hub-apps':         'Apps',
  'hub-clipboard':    'Clipboard',
  'hub-colors':       'Cores',
}

const TemplateCard = ({
  template,
  onApply,
  onDelete,
}: {
  template:  DashboardTemplate
  onApply:   (t: DashboardTemplate) => void
  onDelete?: (id: string) => void
}) => {
  const visibleWidgets = template.widgets
    .filter(w => w.visible)
    .sort((a, b) => a.order - b.order)
    .slice(0, 8)

  return (
    <div className="tg-card">
      <div className="tg-card-preview">
        <div className="tg-preview-grid">
          {visibleWidgets.map(w => (
            <div
              key={w.id}
              className="tg-preview-block"
              style={{ gridColumn: `span ${w.colSpan}` }}
            >
              {WIDGET_PREVIEW_LABELS[w.type] ?? w.type}
            </div>
          ))}
        </div>
      </div>
      <div className="tg-card-footer">
        <span className="tg-card-name">{template.name}</span>
        <div className="tg-card-actions">
          {onDelete && !template.isBuiltin && (
            <button
              type="button"
              className="tg-delete-btn"
              onClick={() => onDelete(template.id)}
              title="Excluir template"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </button>
          )}
          <button
            type="button"
            className="tg-apply-btn"
            onClick={() => onApply(template)}
          >
            Usar
          </button>
        </div>
      </div>
    </div>
  )
}

export const TemplateGallery = ({
  userTemplates,
  onApply,
  onDelete,
  onCreateBlank,
  onClose,
}: TemplateGalleryProps) => {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleApply = (template: DashboardTemplate) => {
    // Re-ID widgets so they don't collide
    const freshWidgets: DashboardWidget[] = template.widgets.map((w, i) => ({
      ...w,
      id: `${w.type}-${Date.now()}-${i}`,
      order: i,
    }))
    onApply(freshWidgets)
    onClose()
  }

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      onDelete(id)
      setConfirmDelete(null)
    } else {
      setConfirmDelete(id)
    }
  }

  return (
    <div className="tg-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Templates de dashboard">
      <div className="tg-panel" onClick={e => e.stopPropagation()}>
        <div className="tg-header">
          <div className="tg-header-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <h2>Templates de dashboard</h2>
          </div>
          <button type="button" className="tg-close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="tg-body">
          {/* Blank / custom option */}
          <button type="button" className="tg-create-blank" onClick={() => { onCreateBlank(); onClose() }}>
            <div className="tg-blank-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </div>
            <span className="tg-blank-label">Criar do zero</span>
            <span className="tg-blank-sub">Layout vazio, arraste os widgets que quiser</span>
          </button>

          {/* Built-in templates */}
          <div className="tg-section-label">Templates padrão</div>
          <div className="tg-grid">
            {BUILTIN_DASHBOARD_TEMPLATES.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                onApply={handleApply}
              />
            ))}
          </div>

          {/* User templates */}
          {userTemplates.length > 0 && (
            <>
              <div className="tg-section-label">Meus templates</div>
              <div className="tg-grid">
                {userTemplates.map(t => (
                  <div key={t.id} className="tg-card-wrap">
                    {confirmDelete === t.id && (
                      <div className="tg-confirm-bar">
                        <span>Confirmar exclusão?</span>
                        <button type="button" className="tg-confirm-yes" onClick={() => handleDelete(t.id)}>Sim</button>
                        <button type="button" className="tg-confirm-no" onClick={() => setConfirmDelete(null)}>Não</button>
                      </div>
                    )}
                    <TemplateCard
                      template={t}
                      onApply={handleApply}
                      onDelete={handleDelete}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
