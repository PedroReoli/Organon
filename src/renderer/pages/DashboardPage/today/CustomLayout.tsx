import { useState } from 'react'
import { X } from 'lucide-react'
import type {
  Bill, CalendarEvent, Card, DashboardWidget, Expense,
  Note, SavingsGoal, ShortcutItem, StudyState,
} from '@types'
import type { AppView } from '../../shared/InternalNav'
import type { DashboardSyncStatus } from '../DashboardPage'
import { WidgetShell } from './widgets/WidgetShell'
import {
  TasksWidget, EventsWidget, WeekWidget,
  FinancialWidget, KnowledgeWidget, ToolsWidget, SystemWidget,
  SearchWidget, DateTimeWidget,
} from './widgets/ReportWidgets'
import { HubWidget } from './widgets/HubWidget'
import { DashboardEditor } from './DashboardEditor'
import { TemplateGallery } from './TemplateGallery'
import type { DashboardTemplate } from '@types'

interface CustomLayoutProps {
  widgets:            DashboardWidget[]
  onWidgetsChange:    (widgets: DashboardWidget[]) => void
  // Data
  cards:              Card[]
  calendarEvents:     CalendarEvent[]
  bills:              Bill[]
  expenses:           Expense[]
  savingsGoals:       SavingsGoal[]
  shortcuts:          ShortcutItem[]
  notes:              Note[]
  study:              StudyState
  syncStatus:         DashboardSyncStatus
  lastSyncAt?:        string | null
  userLoggedIn:       boolean
  appsCount:          number
  clipboardCount:     number
  colorPalettesCount: number
  // Callbacks
  onNavigate:         (view: AppView) => void
  onGoToPlannerCard:  (id: string) => void
  onGoToCalendarDate: (date: string) => void
  // Templates
  userTemplates:      DashboardTemplate[]
  onSaveTemplate:     (name: string, widgets: DashboardWidget[]) => void
  onDeleteTemplate:   (id: string) => void
  onApplyTemplate:    (widgets: DashboardWidget[]) => void
}

const WIDGET_TITLES: Record<string, string> = {
  'report-tasks':     'Foco do dia',
  'report-events':    'Agenda de hoje',
  'report-week':      'Semana',
  'report-financial': 'Financeiro',
  'report-knowledge': 'Conhecimento',
  'report-tools':     'Ferramentas e design',
  'report-system':    'Sistema',
  'widget-search':    'Busca',
  'widget-datetime':  'Data e hora',
}

export const CustomLayout = ({
  widgets, onWidgetsChange,
  cards, calendarEvents, bills, expenses, savingsGoals,
  shortcuts, notes, study, syncStatus, lastSyncAt, userLoggedIn,
  appsCount, clipboardCount, colorPalettesCount,
  onNavigate, onGoToPlannerCard, onGoToCalendarDate,
  userTemplates, onSaveTemplate, onDeleteTemplate, onApplyTemplate,
}: CustomLayoutProps) => {
  const [editMode,      setEditMode]      = useState(true)
  const [showEditor,    setShowEditor]    = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [saveNameInput, setSaveNameInput] = useState('')
  const [showSaveForm,  setShowSaveForm]  = useState(false)
  const [dragIdx,     setDragIdx]     = useState<number | null>(null)
  const [overIdx,     setOverIdx]     = useState<number | null>(null)

  const visible = [...widgets]
    .filter(w => w.visible)
    .sort((a, b) => a.order - b.order)

  // ── In-grid drag & drop (edit mode) ───────────────────────────────────────

  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    if (!editMode) { e.preventDefault(); return }
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    if (!editMode) return
    e.preventDefault()
    setOverIdx(idx)
  }

  const handleDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setOverIdx(null); return }
    const reordered = [...visible]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(idx, 0, moved)
    // Rebuild full widgets list with updated order for visible ones
    const updatedVisible = reordered.map((w, i) => ({ ...w, order: i }))
    const hiddenWidgets  = widgets.filter(w => !w.visible).map(w => ({ ...w, order: updatedVisible.length + w.order }))
    onWidgetsChange([...updatedVisible, ...hiddenWidgets])
    setDragIdx(null)
    setOverIdx(null)
  }

  const handleDragEnd = () => { setDragIdx(null); setOverIdx(null) }

  const changeSpan = (id: string, colSpan: DashboardWidget['colSpan']) =>
    onWidgetsChange(widgets.map(w => w.id === id ? { ...w, colSpan } : w))

  const removeFromView = (id: string) =>
    onWidgetsChange(widgets.map(w => w.id === id ? { ...w, visible: false } : w))

  const renderWidgetBody = (widget: DashboardWidget) => {
    switch (widget.type) {
      case 'report-tasks':
        return <TasksWidget cards={cards} onGoToPlannerCard={onGoToPlannerCard} onNavigate={onNavigate} />
      case 'report-events':
        return <EventsWidget calendarEvents={calendarEvents} onGoToCalendarDate={onGoToCalendarDate} onNavigate={onNavigate} />
      case 'report-week':
        return <WeekWidget cards={cards} calendarEvents={calendarEvents} />
      case 'report-financial':
        return <FinancialWidget bills={bills} expenses={expenses} savingsGoals={savingsGoals} onNavigate={onNavigate} />
      case 'report-knowledge':
        return <KnowledgeWidget notes={notes} study={study} onNavigate={onNavigate} />
      case 'report-tools':
        return <ToolsWidget shortcutsCount={shortcuts.length} appsCount={appsCount} clipboardCount={clipboardCount} colorPalettesCount={colorPalettesCount} />
      case 'report-system':
        return <SystemWidget syncStatus={syncStatus} lastSyncAt={lastSyncAt} userLoggedIn={userLoggedIn} onNavigate={onNavigate} />
      case 'widget-search':
        return <SearchWidget onNavigate={onNavigate} />
      case 'widget-datetime':
        return <DateTimeWidget />
      default:
        return <HubWidget type={widget.type} onNavigate={onNavigate} />
    }
  }

  const handleSaveTemplate = () => {
    if (!saveNameInput.trim()) return
    onSaveTemplate(saveNameInput.trim(), widgets.filter(w => w.visible))
    setSaveNameInput('')
    setShowSaveForm(false)
  }

  return (
    <div className="cl-layout">
      <div className="cl-toolbar">
        {editMode ? (
          <>
            <span className="cl-toolbar-hint">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <circle cx="9" cy="5" r="1" fill="currentColor" /><circle cx="15" cy="5" r="1" fill="currentColor" />
                <circle cx="9" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" />
                <circle cx="9" cy="19" r="1" fill="currentColor" /><circle cx="15" cy="19" r="1" fill="currentColor" />
              </svg>
              Arraste · 1 2 3 para largura
            </span>
            <button type="button" className="cl-manage-btn" onClick={() => setShowTemplates(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Templates
            </button>
            {showSaveForm ? (
              <div className="cl-save-form">
                <input
                  autoFocus
                  className="cl-save-input"
                  placeholder="Nome do template..."
                  value={saveNameInput}
                  onChange={e => setSaveNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveTemplate(); if (e.key === 'Escape') setShowSaveForm(false) }}
                />
                <button type="button" className="cl-confirm-btn" onClick={handleSaveTemplate}>Salvar</button>
                <button type="button" className="cl-cancel-btn" onClick={() => setShowSaveForm(false)} aria-label="Cancelar"><X size={13} /></button>
              </div>
            ) : (
              <button type="button" className="cl-manage-btn" onClick={() => setShowSaveForm(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                  <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                </svg>
                Salvar template
              </button>
            )}
            <button type="button" className="cl-confirm-btn" onClick={() => setEditMode(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Confirmar
            </button>
          </>
        ) : (
          <>
            <button type="button" className="cl-manage-btn" onClick={() => setShowTemplates(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Templates
            </button>
            <button type="button" className="cl-edit-btn" onClick={() => setEditMode(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
              </svg>
              Editar layout
            </button>
          </>
        )}
      </div>

      <div className="cl-grid">
        {visible.map((widget, idx) => (
          <div
            key={widget.id}
            className={`cl-grid-item ${dragIdx === idx ? 'cl-dragging' : ''} ${overIdx === idx && dragIdx !== idx ? 'cl-over' : ''}`}
            style={{ gridColumn: `span ${widget.colSpan}` }}
            draggable={editMode}
            onDragStart={handleDragStart(idx)}
            onDragOver={handleDragOver(idx)}
            onDrop={handleDrop(idx)}
            onDragEnd={handleDragEnd}
          >
            <WidgetShell
              colSpan={widget.colSpan}
              title={WIDGET_TITLES[widget.type] ?? widget.type.replace(/^hub-/, '')}
              editMode={editMode}
              onRemove={() => removeFromView(widget.id)}
              onSpanChange={span => changeSpan(widget.id, span)}
              isDragging={dragIdx === idx}
              dragHandleProps={{
                onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
              }}
            >
              {renderWidgetBody(widget)}
            </WidgetShell>
          </div>
        ))}

        {editMode && (
          <button
            type="button"
            className="cl-add-card"
            onClick={() => setShowEditor(true)}
            title="Adicionar widgets"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            <span>Adicionar widget</span>
          </button>
        )}

        {visible.length === 0 && !editMode && (
          <div className="cl-empty">
            <p>Nenhum widget visível.</p>
          </div>
        )}
      </div>

      {showEditor && (
        <DashboardEditor
          widgets={widgets}
          onChange={w => { onWidgetsChange(w); setShowEditor(false) }}
          onClose={() => setShowEditor(false)}
        />
      )}

      {showTemplates && (
        <TemplateGallery
          userTemplates={userTemplates}
          onApply={(freshWidgets) => { onApplyTemplate(freshWidgets); setShowTemplates(false) }}
          onDelete={onDeleteTemplate}
          onCreateBlank={() => { onApplyTemplate([]); setEditMode(true) }}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  )
}
