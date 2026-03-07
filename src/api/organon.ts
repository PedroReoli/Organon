// Cliente HTTP para a Organon API
// Auth: Bearer token — accessToken em memória, auto-refresh via refreshToken

const DEFAULT_BASE_URL = 'https://reolicodeapi.com'

// ── Estado de autenticação (módulo singleton) ─────────────────────────────────

let _baseUrl: string = (import.meta.env.VITE_API_BASE_URL as string) || DEFAULT_BASE_URL
let _accessToken = ''
let _refreshToken = ''
let _refreshPromise: Promise<void> | null = null
let _onTokensUpdated: ((accessToken: string, refreshToken: string) => void) | null = null

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' ? value as Record<string, unknown> : {}
)

const getString = (value: unknown): string => (typeof value === 'string' ? value : '')

const readTokenPair = (payload: unknown): { accessToken: string; refreshToken: string } | null => {
  const root = asRecord(payload)
  const accessToken = getString(root.accessToken ?? root.access_token)
  const refreshToken = getString(root.refreshToken ?? root.refresh_token)
  if (!accessToken || !refreshToken) return null
  return { accessToken, refreshToken }
}

export function configureOrganon(config: {
  baseUrl?: string
  accessToken?: string
  refreshToken?: string
}): void {
  if (config.baseUrl) _baseUrl = config.baseUrl || DEFAULT_BASE_URL
  if (config.accessToken !== undefined) _accessToken = config.accessToken
  if (config.refreshToken !== undefined) _refreshToken = config.refreshToken
}

export function setOrganonCallbacks(callbacks: {
  onTokensUpdated?: (accessToken: string, refreshToken: string) => void
}): void {
  if (callbacks.onTokensUpdated) _onTokensUpdated = callbacks.onTokensUpdated
}

export function isOrganonAuthenticated(): boolean {
  return !!_accessToken
}

export function getOrganonRefreshToken(): string {
  return _refreshToken
}

export function getOrganonBaseUrl(): string {
  return _baseUrl
}

// ── HTTP core ─────────────────────────────────────────────────────────────────

function buildUrl(path: string): string {
  return `${_baseUrl}/api/v1/organon${path}`
}

async function doFetch<T>(path: string, init?: RequestInit, withAuth = true): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (withAuth && _accessToken) headers['Authorization'] = `Bearer ${_accessToken}`

  const res = await fetch(buildUrl(path), {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  })

  if (res.status === 204) return undefined as T

  // Auto-refresh on 401 (token expirado)
  if (res.status === 401 && withAuth && _refreshToken) {
    await doRefresh()
    const headers2: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${_accessToken}`,
    }
    const res2 = await fetch(buildUrl(path), {
      ...init,
      headers: { ...headers2, ...(init?.headers as Record<string, string> | undefined) },
    })
    if (res2.status === 204) return undefined as T
    if (!res2.ok) {
      const body = await res2.json().catch(() => ({}))
      throw makeError(res2.status, body)
    }
    return res2.json() as Promise<T>
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    console.error(`[Organon] ${init?.method ?? 'GET'} ${path} → ${res.status}`)
    throw makeError(res.status, body)
  }

  return res.json() as Promise<T>
}

function makeError(status: number, body: unknown): Error {
  const b = body as { error?: { message?: string; code?: string } }
  return Object.assign(new Error(b?.error?.message ?? `HTTP ${status}`), {
    status,
    code: b?.error?.code,
  })
}

async function doRefresh(): Promise<void> {
  if (_refreshPromise) return _refreshPromise

  _refreshPromise = (async () => {
    if (!_refreshToken) throw new Error('No refresh token')

    const tryRefresh = async (body: Record<string, string>) => {
      const res = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) return null
      const json = await res.json().catch(() => ({}))
      return readTokenPair(asRecord(json).data ?? json)
    }

    const tokenPair =
      await tryRefresh({ refreshToken: _refreshToken })
      ?? await tryRefresh({ refresh_token: _refreshToken })

    if (!tokenPair) {
      _accessToken = ''
      _refreshToken = ''
      _onTokensUpdated?.('', '')
      throw new Error('Token refresh failed')
    }
    _accessToken = tokenPair.accessToken
    _refreshToken = tokenPair.refreshToken
    _onTokensUpdated?.(_accessToken, _refreshToken)
  })().finally(() => {
    _refreshPromise = null
  })

  return _refreshPromise
}

// Atalhos de método
const get = <T>(path: string) => doFetch<T>(path)
const post = <T>(path: string, body: unknown, withAuth = true) =>
  doFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }, withAuth)
const patch = <T>(path: string, body: unknown) =>
  doFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
const put = <T>(path: string, body: unknown) =>
  doFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) })
const del = <T>(path: string) => doFetch<T>(path, { method: 'DELETE' })

function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

// ── Tipos exportados ──────────────────────────────────────────────────────────

export interface OrganonUser {
  id: string
  email: string
  name: string | null
  created_at: string
}

export interface AuthData {
  user: OrganonUser
  accessToken: string
  refreshToken: string
}

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

export interface PingAttemptResult {
  path: string
  withAuth: boolean
  ok: boolean
  status: number | null
  error?: string
  skipped?: boolean
}

export interface PingDiagnostics {
  ok: boolean
  baseUrl: string
  checkedAt: string
  message: string
  attempts: PingAttemptResult[]
}

type Paginated<T> = { data: T[]; meta: { cursor: string | null; limit: number } }

// ── API ───────────────────────────────────────────────────────────────────────

export const organonApi = {

  // HEALTH
  pingDetailed: async (): Promise<PingDiagnostics> => {
    const attempts: Array<{ path: string; withAuth: boolean }> = [
      { path: '/health/db-ping', withAuth: false },
      { path: '/health', withAuth: false },
      { path: '/auth/me', withAuth: true },
    ]

    const results: PingAttemptResult[] = []

    for (const attempt of attempts) {
      if (attempt.withAuth && !_accessToken) {
        results.push({
          path: attempt.path,
          withAuth: true,
          ok: false,
          status: null,
          skipped: true,
          error: 'Sem access token na sessão atual.',
        })
        continue
      }
      try {
        const headers: Record<string, string> = {}
        if (attempt.withAuth && _accessToken) {
          headers.Authorization = `Bearer ${_accessToken}`
        }
        const res = await fetch(buildUrl(attempt.path), { method: 'GET', headers })
        results.push({
          path: attempt.path,
          withAuth: attempt.withAuth,
          ok: res.ok,
          status: res.status,
        })
        if (res.ok) {
          return {
            ok: true,
            baseUrl: _baseUrl,
            checkedAt: new Date().toISOString(),
            message: attempt.withAuth
              ? 'API online e autenticação válida.'
              : 'API online (endpoint público respondeu).',
            attempts: results,
          }
        }
      } catch {
        results.push({
          path: attempt.path,
          withAuth: attempt.withAuth,
          ok: false,
          status: null,
          error: 'Falha de rede/timeout/CORS ao alcançar o endpoint.',
        })
      }
    }

    const hasUnauthorized = results.some(item => item.status === 401)
    const message = hasUnauthorized
      ? 'API alcançada, mas a autenticação falhou (401: token inválido/expirado).'
      : 'Não foi possível confirmar conectividade com a API.'

    return {
      ok: false,
      baseUrl: _baseUrl,
      checkedAt: new Date().toISOString(),
      message,
      attempts: results,
    }
  },

  ping: async (): Promise<boolean> => {
    const report = await organonApi.pingDetailed()
    return report.ok
  },

  // AUTH
  auth: {
    register: (email: string, password: string, name?: string): Promise<{ data: AuthData }> =>
      post('/auth/register', { email, password, name }, false),

    login: (email: string, password: string): Promise<{ data: AuthData }> =>
      post('/auth/login', { email, password }, false),

    refresh: (refreshToken: string): Promise<{ data: { accessToken: string; refreshToken: string } }> =>
      post('/auth/refresh', { refreshToken }, false),

    logout: (refreshToken: string): Promise<void> =>
      post('/auth/logout', { refreshToken }),

    me: (): Promise<{ data: OrganonUser }> =>
      get('/auth/me'),
  },

  // SETTINGS
  settings: {
    get: () => get<{ data: Record<string, unknown> }>('/settings'),
    update: (data: Record<string, unknown>) => patch<{ data: Record<string, unknown> }>('/settings', data),
  },

  // PROJECTS
  projects: {
    list: (params?: { limit?: number; cursor?: string }): Promise<Paginated<unknown>> =>
      get(`/projects${qs({ limit: params?.limit, cursor: params?.cursor })}`),
    get: (id: string) => get<{ data: unknown }>(`/projects/${id}`),
    create: (body: Record<string, unknown>) => post<{ data: unknown }>('/projects', body),
    update: (id: string, body: Record<string, unknown>) => patch<{ data: unknown }>(`/projects/${id}`, body),
    delete: (id: string) => del<void>(`/projects/${id}`),
    addLink: (id: string, body: { label: string; url: string; sort_order?: number }) =>
      post<{ data: unknown }>(`/projects/${id}/links`, body),
    deleteLink: (id: string, linkId: string) => del<void>(`/projects/${id}/links/${linkId}`),
  },

  // CARDS
  cards: {
    list: (params?: { limit?: number; cursor?: string; status?: string }): Promise<Paginated<unknown>> =>
      get(`/cards${qs({ limit: params?.limit, cursor: params?.cursor, status: params?.status })}`),
    get: (id: string) => get<{ data: unknown }>(`/cards/${id}`),
    create: (body: Record<string, unknown>) => post<{ data: unknown }>('/cards', body),
    update: (id: string, body: Record<string, unknown>) => patch<{ data: unknown }>(`/cards/${id}`, body),
    delete: (id: string) => del<void>(`/cards/${id}`),
    addChecklist: (id: string, body: { text: string; sort_order?: number }) =>
      post<{ data: unknown }>(`/cards/${id}/checklist`, body),
    updateChecklist: (id: string, itemId: string, body: { text?: string; done?: boolean; sort_order?: number }) =>
      patch<{ data: unknown }>(`/cards/${id}/checklist/${itemId}`, body),
    deleteChecklist: (id: string, itemId: string) => del<void>(`/cards/${id}/checklist/${itemId}`),
  },

  // CALENDAR EVENTS
  calendarEvents: {
    list: (params?: { limit?: number; cursor?: string }): Promise<Paginated<unknown>> =>
      get(`/calendar-events${qs({ limit: params?.limit, cursor: params?.cursor })}`),
    get: (id: string) => get<{ data: unknown }>(`/calendar-events/${id}`),
    create: (body: Record<string, unknown>) => post<{ data: unknown }>('/calendar-events', body),
    update: (id: string, body: Record<string, unknown>) => patch<{ data: unknown }>(`/calendar-events/${id}`, body),
    delete: (id: string) => del<void>(`/calendar-events/${id}`),
  },

  // NOTE FOLDERS
  noteFolders: {
    list: (params?: { limit?: number; cursor?: string }): Promise<Paginated<unknown>> =>
      get(`/note-folders${qs({ limit: params?.limit, cursor: params?.cursor })}`),
    get: (id: string) => get<{ data: unknown }>(`/note-folders/${id}`),
    create: (body: { name: string; parent_id?: string | null; sort_order?: number }) =>
      post<{ data: unknown }>('/note-folders', body),
    update: (id: string, body: { name?: string; parent_id?: string | null; sort_order?: number }) =>
      patch<{ data: unknown }>(`/note-folders/${id}`, body),
    delete: (id: string) => del<void>(`/note-folders/${id}`),
  },

  // NOTES
  notes: {
    list: (params?: { limit?: number; cursor?: string; folder_id?: string; project_id?: string }): Promise<Paginated<unknown>> =>
      get(`/notes${qs({ limit: params?.limit, cursor: params?.cursor, folder_id: params?.folder_id, project_id: params?.project_id })}`),
    get: (id: string) => get<{ data: unknown }>(`/notes/${id}`),
    create: (body: Record<string, unknown>) => post<{ data: unknown }>('/notes', body),
    update: (id: string, body: Record<string, unknown>) => patch<{ data: unknown }>(`/notes/${id}`, body),
    delete: (id: string) => del<void>(`/notes/${id}`),
    revisions: (id: string) => get<{ data: unknown[] }>(`/notes/${id}/revisions`),
    addAsset: (id: string, asset_id: string) => post<{ data: unknown }>(`/notes/${id}/assets`, { asset_id }),
    deleteAsset: (id: string, assetId: string) => del<void>(`/notes/${id}/assets/${assetId}`),
  },

  // ASSETS
  assets: {
    uploadUrl: (body: { file_name: string; mime_type: string; size_bytes: number; category?: string }) =>
      post<{ data: { uploadToken: string; uploadUrl: string; storageKey: string; expiresIn: number } }>('/assets/upload-url', body),
    complete: (body: Record<string, unknown>) => post<{ data: unknown }>('/assets/complete', body),
    get: (id: string) => get<{ data: unknown }>(`/assets/${id}`),
    delete: (id: string) => del<void>(`/assets/${id}`),
  },

  // HABITS
  habits: {
    list: (params?: { limit?: number; cursor?: string }): Promise<Paginated<unknown>> =>
      get(`/habits${qs({ limit: params?.limit, cursor: params?.cursor })}`),
    get: (id: string) => get<{ data: unknown }>(`/habits/${id}`),
    create: (body: Record<string, unknown>) => post<{ data: unknown }>('/habits', body),
    update: (id: string, body: Record<string, unknown>) => patch<{ data: unknown }>(`/habits/${id}`, body),
    delete: (id: string) => del<void>(`/habits/${id}`),
    entries: {
      list: (params?: { habit_id?: string; since?: string; limit?: number }) =>
        get<{ data: unknown[] }>(`/habits/entries${qs({ habit_id: params?.habit_id, since: params?.since, limit: params?.limit })}`),
      upsert: (body: { habit_id: string; date: string; value?: number; skipped?: boolean; skip_reason?: string }) =>
        post<{ data: unknown }>('/habits/entries', body),
    },
  },

  // FINANCE
  finance: {
    bills: {
      list: (params?: { limit?: number; cursor?: string }) =>
        get<{ data: unknown[] }>(`/finance/bills${qs({ limit: params?.limit, cursor: params?.cursor })}`),
      create: (body: Record<string, unknown>) => post<{ data: unknown }>('/finance/bills', body),
      update: (id: string, body: Record<string, unknown>) => patch<{ data: unknown }>(`/finance/bills/${id}`, body),
      delete: (id: string) => del<void>(`/finance/bills/${id}`),
    },
    expenses: {
      list: (params?: { limit?: number; cursor?: string }) =>
        get<{ data: unknown[] }>(`/finance/expenses${qs({ limit: params?.limit, cursor: params?.cursor })}`),
      create: (body: Record<string, unknown>) => post<{ data: unknown }>('/finance/expenses', body),
      update: (id: string, body: Record<string, unknown>) => patch<{ data: unknown }>(`/finance/expenses/${id}`, body),
      delete: (id: string) => del<void>(`/finance/expenses/${id}`),
    },
    incomes: {
      list: (params?: { limit?: number; cursor?: string }) =>
        get<{ data: unknown[] }>(`/finance/incomes${qs({ limit: params?.limit, cursor: params?.cursor })}`),
      create: (body: Record<string, unknown>) => post<{ data: unknown }>('/finance/incomes', body),
      delete: (id: string) => del<void>(`/finance/incomes/${id}`),
    },
    budgetCategories: {
      list: () => get<{ data: unknown[] }>('/finance/budget-categories'),
      upsert: (category: string, limit_amount: number) =>
        put<{ data: unknown }>(`/finance/budget-categories/${category}`, { limit_amount }),
      delete: (category: string) => del<void>(`/finance/budget-categories/${category}`),
    },
    config: {
      get: () => get<{ data: { monthly_income: number; monthly_spending_limit: number } }>('/finance/config'),
      update: (body: { monthly_income?: number; monthly_spending_limit?: number }) =>
        patch<{ data: unknown }>('/finance/config', body),
    },
    savingsGoals: {
      list: (params?: { limit?: number; cursor?: string }) =>
        get<{ data: unknown[] }>(`/finance/savings-goals${qs({ limit: params?.limit, cursor: params?.cursor })}`),
      create: (body: Record<string, unknown>) => post<{ data: unknown }>('/finance/savings-goals', body),
      update: (id: string, body: Record<string, unknown>) => patch<{ data: unknown }>(`/finance/savings-goals/${id}`, body),
      delete: (id: string) => del<void>(`/finance/savings-goals/${id}`),
    },
  },

  // CRM
  crm: {
    contacts: {
      list: (params?: { limit?: number; cursor?: string }) =>
        get<{ data: unknown[] }>(`/crm/contacts${qs({ limit: params?.limit, cursor: params?.cursor })}`),
      get: (id: string) => get<{ data: unknown }>(`/crm/contacts/${id}`),
      create: (body: Record<string, unknown>) => post<{ data: unknown }>('/crm/contacts', body),
      update: (id: string, body: Record<string, unknown>) => patch<{ data: unknown }>(`/crm/contacts/${id}`, body),
      delete: (id: string) => del<void>(`/crm/contacts/${id}`),
      addTag: (id: string, tag_id: string) => post<{ data: unknown }>(`/crm/contacts/${id}/tags`, { tag_id }),
      deleteTag: (id: string, tagId: string) => del<void>(`/crm/contacts/${id}/tags/${tagId}`),
      interactions: (id: string) => get<{ data: unknown[] }>(`/crm/contacts/${id}/interactions`),
      addInteraction: (id: string, body: { type: string; content: string; occurred_at: string }) =>
        post<{ data: unknown }>(`/crm/contacts/${id}/interactions`, body),
    },
    tags: {
      list: () => get<{ data: unknown[] }>('/crm/tags'),
      create: (body: { name: string; color?: string }) => post<{ data: unknown }>('/crm/tags', body),
      delete: (id: string) => del<void>(`/crm/tags/${id}`),
    },
    interactions: {
      delete: (id: string) => del<void>(`/crm/interactions/${id}`),
    },
  },

  // SHORTCUTS
  shortcuts: {
    folders: {
      list: () => get<{ data: unknown[] }>('/shortcuts/folders'),
      create: (body: { name: string; sort_order?: number }) => post<{ data: unknown }>('/shortcuts/folders', body),
      update: (id: string, body: { name?: string; sort_order?: number }) =>
        patch<{ data: unknown }>(`/shortcuts/folders/${id}`, body),
      delete: (id: string) => del<void>(`/shortcuts/folders/${id}`),
    },
    list: (params?: { limit?: number; cursor?: string }) =>
      get<{ data: unknown[] }>(`/shortcuts${qs({ limit: params?.limit, cursor: params?.cursor })}`),
    create: (body: Record<string, unknown>) => post<{ data: unknown }>('/shortcuts', body),
    update: (id: string, body: Record<string, unknown>) => patch<{ data: unknown }>(`/shortcuts/${id}`, body),
    delete: (id: string) => del<void>(`/shortcuts/${id}`),
    paths: {
      list: () => get<{ data: unknown[] }>('/shortcuts/paths'),
      create: (body: { name: string; path: string; icon?: string; sort_order?: number }) =>
        post<{ data: unknown }>('/shortcuts/paths', body),
      update: (id: string, body: Record<string, unknown>) => patch<{ data: unknown }>(`/shortcuts/paths/${id}`, body),
      delete: (id: string) => del<void>(`/shortcuts/paths/${id}`),
    },
  },

  // CLIPBOARD
  clipboard: {
    categories: {
      list: () => get<{ data: unknown[] }>('/clipboard/categories'),
      create: (body: { name: string; sort_order?: number }) => post<{ data: unknown }>('/clipboard/categories', body),
      update: (id: string, body: { name?: string; sort_order?: number }) =>
        patch<{ data: unknown }>(`/clipboard/categories/${id}`, body),
      delete: (id: string) => del<void>(`/clipboard/categories/${id}`),
    },
    items: {
      list: () => get<{ data: unknown[] }>('/clipboard/items'),
      create: (body: Record<string, unknown>) => post<{ data: unknown }>('/clipboard/items', body),
      update: (id: string, body: Record<string, unknown>) => patch<{ data: unknown }>(`/clipboard/items/${id}`, body),
      delete: (id: string) => del<void>(`/clipboard/items/${id}`),
    },
  },

  // COLOR PALETTES
  colorPalettes: {
    list: () => get<{ data: unknown[] }>('/color-palettes'),
    create: (body: { name: string; colors?: string[]; sort_order?: number }) =>
      post<{ data: unknown }>('/color-palettes', body),
    update: (id: string, body: { name?: string; colors?: string[]; sort_order?: number }) =>
      patch<{ data: unknown }>(`/color-palettes/${id}`, body),
    delete: (id: string) => del<void>(`/color-palettes/${id}`),
  },

  // APPS & MACROS
  apps: {
    list: () => get<{ data: unknown[] }>('/apps'),
    create: (body: Record<string, unknown>) => post<{ data: unknown }>('/apps', body),
    update: (id: string, body: Record<string, unknown>) => patch<{ data: unknown }>(`/apps/${id}`, body),
    delete: (id: string) => del<void>(`/apps/${id}`),
    macros: {
      list: (appId: string) => get<{ data: unknown[] }>(`/apps/${appId}/macros`),
      create: (appId: string, body: { name: string; sort_order?: number }) =>
        post<{ data: unknown }>(`/apps/${appId}/macros`, body),
      delete: (appId: string, macroId: string) => del<void>(`/apps/${appId}/macros/${macroId}`),
      items: {
        list: (appId: string, macroId: string) =>
          get<{ data: unknown[] }>(`/apps/${appId}/macros/${macroId}/items`),
        create: (appId: string, macroId: string, body: Record<string, unknown>) =>
          post<{ data: unknown }>(`/apps/${appId}/macros/${macroId}/items`, body),
        delete: (appId: string, macroId: string, itemId: string) =>
          del<void>(`/apps/${appId}/macros/${macroId}/items/${itemId}`),
      },
    },
  },

  // MEETINGS
  meetings: {
    list: (params?: { limit?: number; cursor?: string }) =>
      get<{ data: unknown[] }>(`/meetings${qs({ limit: params?.limit, cursor: params?.cursor })}`),
    get: (id: string) => get<{ data: unknown }>(`/meetings/${id}`),
    create: (body: Record<string, unknown>) => post<{ data: unknown }>('/meetings', body),
    update: (id: string, body: Record<string, unknown>) => patch<{ data: unknown }>(`/meetings/${id}`, body),
    delete: (id: string) => del<void>(`/meetings/${id}`),
  },

  // PLAYBOOKS
  playbooks: {
    list: (params?: { limit?: number; cursor?: string }) =>
      get<{ data: unknown[] }>(`/playbooks${qs({ limit: params?.limit, cursor: params?.cursor })}`),
    get: (id: string) => get<{ data: unknown }>(`/playbooks/${id}`),
    create: (body: Record<string, unknown>) => post<{ data: unknown }>('/playbooks', body),
    update: (id: string, body: Record<string, unknown>) => patch<{ data: unknown }>(`/playbooks/${id}`, body),
    delete: (id: string) => del<void>(`/playbooks/${id}`),
    addDialog: (id: string, body: { role: string; content: string; sort_order?: number }) =>
      post<{ data: unknown }>(`/playbooks/${id}/dialogs`, body),
    deleteDialog: (id: string, dialogId: string) => del<void>(`/playbooks/${id}/dialogs/${dialogId}`),
  },

  // STUDY
  study: {
    config: {
      get: () =>
        get<{ data: { daily_goal_minutes: number; pomodoro_work_min: number; pomodoro_break_min: number } }>('/study/config'),
      update: (body: { daily_goal_minutes?: number; pomodoro_work_min?: number; pomodoro_break_min?: number }) =>
        patch<{ data: unknown }>('/study/config', body),
    },
    mediaItems: {
      list: (params?: { limit?: number; cursor?: string }) =>
        get<{ data: unknown[] }>(`/study/media-items${qs({ limit: params?.limit, cursor: params?.cursor })}`),
      create: (body: Record<string, unknown>) => post<{ data: unknown }>('/study/media-items', body),
      update: (id: string, body: Record<string, unknown>) => patch<{ data: unknown }>(`/study/media-items/${id}`, body),
      delete: (id: string) => del<void>(`/study/media-items/${id}`),
    },
    goals: {
      list: () => get<{ data: unknown[] }>('/study/goals'),
      create: (body: Record<string, unknown>) => post<{ data: unknown }>('/study/goals', body),
      update: (id: string, body: Record<string, unknown>) => patch<{ data: unknown }>(`/study/goals/${id}`, body),
      delete: (id: string) => del<void>(`/study/goals/${id}`),
    },
    sessions: {
      list: () => get<{ data: unknown[] }>('/study/sessions'),
      create: (body: { started_at: string; ended_at?: string; duration_s?: number; media_item_id?: string }) =>
        post<{ data: unknown }>('/study/sessions', body),
    },
  },

  // QUICK ACCESS
  quickAccess: {
    list: () => get<{ data: unknown[] }>('/quick-access'),
    create: (body: { type: string; target_id: string; label: string; sort_order?: number }) =>
      post<{ data: unknown }>('/quick-access', body),
    update: (id: string, body: { label?: string; sort_order?: number }) =>
      patch<{ data: unknown }>(`/quick-access/${id}`, body),
    delete: (id: string) => del<void>(`/quick-access/${id}`),
  },

  // SYNC
  sync: {
    batch: (
      operations: SyncOperation[],
      options?: { client_id?: string; base_cursor?: string },
    ): Promise<SyncBatchResult> =>
      post('/sync/batch', { operations, ...options }),

    changes: (since: string, cursor?: string, limit = 500): Promise<SyncChangesResponse> =>
      get(`/sync/changes${qs({ since, cursor, limit })}`),
  },
}
