// Cliente HTTP base para a Organon API
// Autenticação via token na URL — sem sessão, sem Bearer

const DEFAULT_BASE_URL = 'https://reolicodeapi.com'

export interface OrganonConfig {
  baseUrl: string
  token: string
}

// Inicializa a partir de variáveis de ambiente (Expo expõe EXPO_PUBLIC_* em process.env)
let _config: OrganonConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_BASE_URL,
  token: process.env.EXPO_PUBLIC_API_TOKEN || '',
}

if (_config.token) {
  console.log('[Organon] Token carregado do .env — API:', _config.baseUrl)
}

export function configureOrganon(config: OrganonConfig): void {
  _config = {
    baseUrl: config.baseUrl || DEFAULT_BASE_URL,
    token: config.token,
  }
  console.log('[Organon] Configurado — API:', _config.baseUrl)
}

export function getOrganonConfig(): OrganonConfig {
  return _config
}

export function hasOrganonToken(): boolean {
  return !!_config.token
}

function buildUrl(path: string): string {
  return `${_config.baseUrl}/api/v1/organon/${_config.token}${path}`
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(buildUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (res.status === 204) return undefined as T

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const message = (body as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`
    const code = (body as { error?: { code?: string } })?.error?.code
    const err = Object.assign(new Error(message), { status: res.status, code })
    throw err
  }

  return res.json() as Promise<T>
}

// ── Tipos de Sync ────────────────────────────────────────────────────────────

export interface SyncOperation {
  resource: string
  operation: 'upsert' | 'delete'
  id: string
  payload?: Record<string, unknown>
  client_updated_at?: string
}

export interface SyncOperationResult {
  id: string
  resource: string
  status: 'ok' | 'conflict' | 'skipped'
}

export interface SyncBatchResult {
  results: SyncOperationResult[]
}

export interface SyncChange {
  resource: string
  id: string
  operation: 'upsert' | 'delete'
  updatedAt: string
  payload?: Record<string, unknown>
}

export interface SyncChangesResponse {
  data: {
    serverTime: string
    nextCursor: string | null
    changes: SyncChange[]
  }
}

// ── API ──────────────────────────────────────────────────────────────────────

export const organonApi = {
  /** Testa conexão com a API. Retorna true se ok. */
  ping: async (): Promise<boolean> => {
    try {
      await apiFetch('/health/db-ping')
      console.log('[Organon] Ping OK —', _config.baseUrl)
      return true
    } catch (err) {
      console.warn('[Organon] Ping falhou:', err)
      return false
    }
  },

  sync: {
    /** Push em lote: upserts e deletes. */
    batch: (operations: SyncOperation[]): Promise<SyncBatchResult> =>
      apiFetch('/sync/batch', {
        method: 'POST',
        body: JSON.stringify({ operations }),
      }),

    /** Pull incremental desde `since` (ISO UTC). Paginado por cursor. */
    changes: (since: string, cursor?: string, limit = 500): Promise<SyncChangesResponse> => {
      const params = new URLSearchParams({ since, limit: String(limit) })
      if (cursor) params.set('cursor', cursor)
      return apiFetch(`/sync/changes?${params.toString()}`)
    },
  },
}
