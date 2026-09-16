/**
 * AlertsWidget — lista consolidada de alertas urgentes na tela principal.
 *
 * Consome o hook `useDashboardAlerts`. Ordena por urgencia (menos tempo
 * primeiro). Cada item e clicavel e encaminha para o callback `onOpenItem`
 * com o id do item de origem.
 */

import React from 'react'
import type { Bill, CalendarEvent, Card, DashboardWidgetColSpan } from '@types'
import {
  useDashboardAlerts,
  type DashboardAlertKind,
} from '@hooks/useDashboardAlerts'
import { WidgetShell } from './WidgetShell'

interface AlertsWidgetProps {
  colSpan: DashboardWidgetColSpan
  cards: Card[]
  calendarEvents: CalendarEvent[]
  bills: Bill[]
  editMode?: boolean
  onRemove?: () => void
  onSpanChange?: (span: DashboardWidgetColSpan) => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
  isDragging?: boolean
  onOpenCard?: (cardId: string) => void
  onOpenEvent?: (eventId: string) => void
  onOpenBill?: (billId: string) => void
}

const KIND_ICON: Record<DashboardAlertKind, string> = {
  'overdue-card': '!',
  'upcoming-event': '@',
  'due-bill': '$',
}

const KIND_LABEL: Record<DashboardAlertKind, string> = {
  'overdue-card': 'Card atrasado',
  'upcoming-event': 'Evento proximo',
  'due-bill': 'Conta vencendo',
}

export const AlertsWidget: React.FC<AlertsWidgetProps> = ({
  colSpan,
  cards,
  calendarEvents,
  bills,
  editMode,
  onRemove,
  onSpanChange,
  dragHandleProps,
  isDragging,
  onOpenCard,
  onOpenEvent,
  onOpenBill,
}) => {
  const { alerts } = useDashboardAlerts({
    cards,
    calendarEvents,
    bills,
  })

  const handleClick = (kind: DashboardAlertKind, sourceId: string) => {
    switch (kind) {
      case 'overdue-card':
        onOpenCard?.(sourceId)
        break
      case 'upcoming-event':
        onOpenEvent?.(sourceId)
        break
      case 'due-bill':
        onOpenBill?.(sourceId)
        break
    }
  }

  return (
    <WidgetShell
      colSpan={colSpan}
      title="Alertas"
      count={alerts.length}
      editMode={editMode}
      onRemove={onRemove}
      onSpanChange={onSpanChange}
      dragHandleProps={dragHandleProps}
      isDragging={isDragging}
    >
      {alerts.length === 0 ? (
        <div className="dw-empty">Nenhum alerta ativo</div>
      ) : (
        <ul className="dw-alerts-list">
          {alerts.map((a) => (
            <li
              key={a.id}
              className={`dw-alert dw-alert-${a.kind}`}
              onClick={() => handleClick(a.kind, a.sourceId)}
              title={KIND_LABEL[a.kind]}
            >
              <span className="dw-alert-icon">{KIND_ICON[a.kind]}</span>
              <div className="dw-alert-body">
                <div className="dw-alert-title">{a.title}</div>
                <div className="dw-alert-subtitle">{a.subtitle}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  )
}
