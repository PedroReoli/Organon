/**
 * RealtimeIndicator — bolinha colorida + tooltip mostrando o estado da
 * conexao WebSocket. 3 estados visuais: open (verde), reconnecting (amarelo
 * pulsante), idle/closed (cinza).
 *
 * Upgrade 02.
 */

import React from 'react'
import type { RealtimeState } from '../../../api/realtime'

interface RealtimeIndicatorProps {
  state: RealtimeState
}

const STATE_LABELS: Record<RealtimeState, string> = {
  idle: 'Realtime offline',
  connecting: 'Conectando...',
  open: 'Realtime conectado',
  reconnecting: 'Reconectando...',
  closed: 'Realtime fechado',
}

export const RealtimeIndicator: React.FC<RealtimeIndicatorProps> = ({ state }) => {
  return (
    <div
      className={`realtime-indicator is-${state}`}
      title={STATE_LABELS[state]}
      aria-label={STATE_LABELS[state]}
    >
      <span className="realtime-indicator-dot" />
    </div>
  )
}
