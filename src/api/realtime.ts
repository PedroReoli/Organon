/**
 * RealtimeClient — cliente WebSocket do canal realtime do Organon.
 *
 * Conecta em /api/v1/organon/ws com JWT na query string + clientId,
 * faz reconnect exponencial, responde a pings do server, e dispatcha
 * eventos para listeners registrados.
 *
 * Upgrade 02 (MVS).
 */

import { getOrganonBaseUrl, getOrganonClientId, getOrganonTokens, refreshOrganonTokens } from './organon'

export type RealtimeState = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed'

export interface RealtimeEvent {
  type: 'event'
  resource: string
  op: 'create' | 'update' | 'delete'
  data: Record<string, unknown>
  originClientId?: string | null
  ts: string
}

export interface RealtimeHello {
  type: 'hello'
  sessionId: string
  serverTime: string
  heartbeatMs: number
}

type IncomingMessage =
  | RealtimeEvent
  | RealtimeHello
  | { type: 'ping'; ts: number }
  | { type: 'pong'; ts: number }
  | { type: 'auth_expired'; reason?: string }

const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10_000, 30_000]

type EventListener = (event: RealtimeEvent) => void
type StateListener = (state: RealtimeState) => void

class RealtimeClientImpl {
  private socket: WebSocket | null = null
  private state: RealtimeState = 'idle'
  private retryAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private eventListeners = new Set<EventListener>()
  private stateListeners = new Set<StateListener>()
  private explicitlyClosed = false

  /** Conecta. Idempotente — chama varias vezes nao abre conexoes extras. */
  connect(): void {
    if (this.state === 'open' || this.state === 'connecting') return
    if (typeof WebSocket === 'undefined') return
    const { accessToken } = getOrganonTokens()
    if (!accessToken) {
      this.setState('idle')
      return
    }

    this.explicitlyClosed = false
    this.setState(this.retryAttempt > 0 ? 'reconnecting' : 'connecting')

    const baseUrl = getOrganonBaseUrl()
    const wsBase = baseUrl.replace(/^http/i, 'ws')
    const clientId = getOrganonClientId()
    const url = `${wsBase}/api/v1/organon/ws?token=${encodeURIComponent(accessToken)}&clientId=${encodeURIComponent(clientId)}`

    try {
      this.socket = new WebSocket(url)
    } catch {
      this.scheduleReconnect()
      return
    }

    this.socket.onopen = () => {
      this.retryAttempt = 0
      this.setState('open')
    }

    this.socket.onmessage = (raw: MessageEvent) => {
      let msg: IncomingMessage | null = null
      try {
        msg = JSON.parse(typeof raw.data === 'string' ? raw.data : '') as IncomingMessage
      } catch {
        return
      }
      if (!msg || typeof msg !== 'object') return

      if (msg.type === 'ping') {
        this.send({ type: 'pong', ts: msg.ts })
        return
      }

      // Upgrade 02: server avisa que o JWT esta para expirar.
      // Tenta refresh via HTTP e reconecta com novo token.
      if (msg.type === 'auth_expired') {
        void this.handleAuthExpired()
        return
      }

      if (msg.type === 'event') {
        // Filtra eco da propria origem (defesa em profundidade — server ja filtra)
        if (msg.originClientId && msg.originClientId === getOrganonClientId()) {
          return
        }
        for (const listener of this.eventListeners) {
          try { listener(msg) } catch { /* ignore listener errors */ }
        }
        return
      }

      // hello / pong: nada a fazer (so confirma conexao viva)
    }

    this.socket.onerror = () => {
      // onclose vai cuidar do reconnect
    }

    this.socket.onclose = (e: CloseEvent) => {
      // QA fix: limpa handlers do socket antigo pra evitar referencia retida
      if (this.socket) {
        try {
          this.socket.onopen = null
          this.socket.onmessage = null
          this.socket.onerror = null
          this.socket.onclose = null
        } catch { /* ignore */ }
      }
      this.socket = null
      // Codigo 4402 = token expirado mas renovavel. Tenta refresh + reconnect.
      if (e.code === 4402) {
        void this.handleAuthExpired().catch(() => {
          this.setState('idle')
        })
        return
      }
      // Codigo 4401 = invalid-token. Nao tenta reconnect ate user re-autenticar.
      if (e.code === 4401) {
        this.setState('idle')
        return
      }
      if (this.explicitlyClosed) {
        this.setState('closed')
        return
      }
      this.scheduleReconnect()
    }
  }

  /**
   * Upgrade 02 + QA: handler para auth_expired do server.
   * Tenta refresh do JWT via HTTP. Se sucesso, fecha e reabre WS.
   * Se falhar, vai para idle (espera re-login).
   * QA fix: try/catch envolve refreshOrganonTokens, e pause de scheduleReconnect
   * pra evitar dupla tentativa concorrente.
   */
  private async handleAuthExpired(): Promise<void> {
    // Pausa reconnect agendado durante o refresh
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    try {
      const refreshed = await refreshOrganonTokens()
      if (refreshed) {
        if (this.socket) {
          try { this.socket.close(1000, 'token-refresh') } catch { /* ignore */ }
          this.socket = null
        }
        this.retryAttempt = 0
        this.connect()
      } else {
        // Refresh falhou — desliga ate user logar de novo
        this.disconnect()
      }
    } catch {
      this.disconnect()
    }
  }

  /** Fecha explicitamente. Nao reconecta. */
  disconnect(): void {
    this.explicitlyClosed = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.socket) {
      try { this.socket.close(1000, 'client-disconnect') } catch { /* ignore */ }
      this.socket = null
    }
    this.setState('closed')
  }

  /** Envia mensagem (usado para pong). */
  private send(message: object): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try { this.socket.send(JSON.stringify(message)) } catch { /* ignore */ }
    }
  }

  private scheduleReconnect(): void {
    // QA fix: ignora se explicitlyClosed (race entre disconnect() e onclose tardio)
    if (this.explicitlyClosed) return
    if (this.reconnectTimer) return
    const baseDelay = RECONNECT_DELAYS_MS[Math.min(this.retryAttempt, RECONNECT_DELAYS_MS.length - 1)]
    // QA fix: jitter de +/- 30% pra evitar thundering herd em outage
    const jitter = baseDelay * (Math.random() * 0.6 - 0.3)
    const delay = Math.max(500, Math.floor(baseDelay + jitter))
    this.retryAttempt += 1
    this.setState('reconnecting')
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.explicitlyClosed) return
      this.connect()
    }, delay)
  }

  private setState(next: RealtimeState): void {
    if (this.state === next) return
    this.state = next
    for (const listener of this.stateListeners) {
      try { listener(next) } catch { /* ignore */ }
    }
  }

  getState(): RealtimeState {
    return this.state
  }

  /** Registra listener de eventos. Retorna unsubscribe. */
  onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener)
    return () => this.eventListeners.delete(listener)
  }

  /** Registra listener de mudanca de state. Retorna unsubscribe. */
  onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }
}

/** Singleton compartilhado por todo o app. */
let _instance: RealtimeClientImpl | null = null

export function getRealtimeClient(): RealtimeClientImpl {
  if (!_instance) _instance = new RealtimeClientImpl()
  return _instance
}
