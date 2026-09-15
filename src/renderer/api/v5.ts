/**
 * API v5 Client - Desktop
 *
 * Endpoints unificados e otimizados.
 * Usa fetch nativo com retry e error handling.
 */

const API_BASE = import.meta.env?.VITE_API_BASE_URL || 'https://reolicodeapi.com'
const API_VERSION = '/api/v1/organon'

// ============================================================
// HELPERS
// ============================================================

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'
  body?: any
  token?: string
  signal?: AbortSignal
}

async function api<T = any>(endpoint: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token, signal } = opts

  const url = `${API_BASE}${API_VERSION}${endpoint}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `API Error: ${response.status}`)
  }

  return response.json()
}

// ============================================================
// DASHBOARD (1 request, tudo!)
// ============================================================

export async function getDashboard(token: string) {
  return api<{
    tasks: any[]
    events: any[]
    habits: any[]
    finance: any
    goals: any[]
    fetched_at: string
  }>('/dashboard', { token })
}

// ============================================================
// MOBILE (dados resumidos)
// ============================================================

export async function getMobileHome(token: string) {
  return api<{
    pending_tasks: number
    today_events: any[]
    habits_today: number
    balance: { income: number; expenses: number }
  }>('/mobile/home', { token })
}

// ============================================================
// SYNC (batch)
// ============================================================

export async function syncPull(token: string, since?: string) {
  const qs = since ? `?since=${encodeURIComponent(since)}` : ''
  return api<{ changes: Record<string, any[]>; timestamp: string; has_more: boolean }>(
    `/sync/pull${qs}`,
    { token }
  )
}

export async function syncPush(token: string, operations: any[]) {
  return api<{ results: any[]; synced_at: string }>(
    '/sync/push',
    { method: 'POST', body: { operations }, token }
  )
}

// ============================================================
// NOTES + FOLDERS (sub-recurso)
// ============================================================

export const NotesAPI = {
  list: (token: string, cursor?: string) => {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
    return api<{ items: any[]; nextCursor: string | null }>(`/notes${qs}`, { token })
  },
  get: (token: string, id: string) => api(`/notes/${id}`, { token }),
  create: (token: string, data: any) =>
    api(`/notes`, { method: 'POST', body: data, token }),
  update: (token: string, id: string, data: any) =>
    api(`/notes/${id}`, { method: 'PATCH', body: data, token }),
  delete: (token: string, id: string) =>
    api(`/notes/${id}`, { method: 'DELETE', token }),
  trash: (token: string) => api(`/notes/trash`, { token }),
  restore: (token: string, id: string) =>
    api(`/notes/${id}/restore`, { method: 'POST', token }),

  // Sub-recurso: folders
  folders: {
    list: (token: string) => api<{ items: any[]; nextCursor: string | null }>('/notes/folders', { token }),
    get: (token: string, id: string) => api(`/notes/folders/${id}`, { token }),
    create: (token: string, data: any) =>
      api(`/notes/folders`, { method: 'POST', body: data, token }),
    update: (token: string, id: string, data: any) =>
      api(`/notes/folders/${id}`, { method: 'PATCH', body: data, token }),
    delete: (token: string, id: string) =>
      api(`/notes/folders/${id}`, { method: 'DELETE', token }),
    restore: (token: string, id: string) =>
      api(`/notes/folders/${id}/restore`, { method: 'POST', token }),
  },
}

// ============================================================
// TASKS (unifica cards + sprint)
// ============================================================

export const TasksAPI = {
  list: (token: string, type?: 'task' | 'sprint') => {
    const qs = type ? `?type=${type}` : ''
    return api<{ items: any[]; nextCursor: string | null }>(`/tasks${qs}`, { token })
  },
  get: (token: string, id: string) => api(`/tasks/${id}`, { token }),
  create: (token: string, data: any) =>
    api(`/tasks`, { method: 'POST', body: data, token }),
  update: (token: string, id: string, data: any) =>
    api(`/tasks/${id}`, { method: 'PATCH', body: data, token }),
  delete: (token: string, id: string) =>
    api(`/tasks/${id}`, { method: 'DELETE', token }),

  // Sprint board
  getBoard: (token: string) => api('/sprint-board', { token }),
  saveBoard: (token: string, board: any) =>
    api('/sprint-board', { method: 'PUT', body: board, token }),
}

// ============================================================
// CALENDAR
// ============================================================

export const CalendarAPI = {
  events: {
    list: (token: string) => api<{ items: any[]; nextCursor: string | null }>('/calendar/events', { token }),
    create: (token: string, data: any) =>
      api(`/calendar/events`, { method: 'POST', body: data, token }),
    update: (token: string, id: string, data: any) =>
      api(`/calendar/events/${id}`, { method: 'PATCH', body: data, token }),
    delete: (token: string, id: string) =>
      api(`/calendar/events/${id}`, { method: 'DELETE', token }),
  },
  categories: {
    list: (token: string) => api<{ items: any[]; nextCursor: string | null }>('/calendar/categories', { token }),
    create: (token: string, data: any) =>
      api(`/calendar/categories`, { method: 'POST', body: data, token }),
    update: (token: string, id: string, data: any) =>
      api(`/calendar/categories/${id}`, { method: 'PATCH', body: data, token }),
    delete: (token: string, id: string) =>
      api(`/calendar/categories/${id}`, { method: 'DELETE', token }),
  },
}

// ============================================================
// FINANCE
// ============================================================

export const FinanceAPI = {
  summary: (token: string) => api('/finance/summary', { token }),

  expenses: {
    list: (token: string) => api<{ items: any[]; nextCursor: string | null }>('/finance/expenses', { token }),
    create: (token: string, data: any) =>
      api(`/finance/expenses`, { method: 'POST', body: data, token }),
    update: (token: string, id: string, data: any) =>
      api(`/finance/expenses/${id}`, { method: 'PATCH', body: data, token }),
    delete: (token: string, id: string) =>
      api(`/finance/expenses/${id}`, { method: 'DELETE', token }),
  },

  incomes: {
    list: (token: string) => api<{ items: any[]; nextCursor: string | null }>('/finance/incomes', { token }),
    create: (token: string, data: any) =>
      api(`/finance/incomes`, { method: 'POST', body: data, token }),
    update: (token: string, id: string, data: any) =>
      api(`/finance/incomes/${id}`, { method: 'PATCH', body: data, token }),
    delete: (token: string, id: string) =>
      api(`/finance/incomes/${id}`, { method: 'DELETE', token }),
  },

  bills: {
    list: (token: string) => api<{ items: any[]; nextCursor: string | null }>('/finance/bills', { token }),
    create: (token: string, data: any) =>
      api(`/finance/bills`, { method: 'POST', body: data, token }),
    update: (token: string, id: string, data: any) =>
      api(`/finance/bills/${id}`, { method: 'PATCH', body: data, token }),
    delete: (token: string, id: string) =>
      api(`/finance/bills/${id}`, { method: 'DELETE', token }),
  },

  goals: {
    list: (token: string) => api<{ items: any[]; nextCursor: string | null }>('/finance/goals', { token }),
    create: (token: string, data: any) =>
      api(`/finance/goals`, { method: 'POST', body: data, token }),
    update: (token: string, id: string, data: any) =>
      api(`/finance/goals/${id}`, { method: 'PATCH', body: data, token }),
    delete: (token: string, id: string) =>
      api(`/finance/goals/${id}`, { method: 'DELETE', token }),
  },

  investments: {
    list: (token: string) => api<{ items: any[]; nextCursor: string | null }>('/finance/investments', { token }),
    create: (token: string, data: any) =>
      api(`/finance/investments`, { method: 'POST', body: data, token }),
    update: (token: string, id: string, data: any) =>
      api(`/finance/investments/${id}`, { method: 'PATCH', body: data, token }),
    delete: (token: string, id: string) =>
      api(`/finance/investments/${id}`, { method: 'DELETE', token }),
  },
}

// ============================================================
// HABITS
// ============================================================

export const HabitsAPI = {
  list: (token: string) => api<{ items: any[]; nextCursor: string | null }>('/habits', { token }),
  create: (token: string, data: any) =>
    api(`/habits`, { method: 'POST', body: data, token }),
  update: (token: string, id: string, data: any) =>
    api(`/habits/${id}`, { method: 'PATCH', body: data, token }),
  delete: (token: string, id: string) =>
    api(`/habits/${id}`, { method: 'DELETE', token }),

  // Sub-recurso: entries
  entries: {
    list: (token: string, habitId?: string, from?: string, to?: string) => {
      const params = new URLSearchParams()
      if (habitId) params.set('habit_id', habitId)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const qs = params.toString() ? `?${params}` : ''
      return api<any[]>(`/habits/entries${qs}`, { token })
    },
    upsert: (token: string, data: { habit_id: string; date: string; value: number }) =>
      api(`/habits/entries`, { method: 'POST', body: data, token }),
  },
}

// ============================================================
// CRM (tudo em 1 request!)
// ============================================================

export const CRMAPI = {
  all: (token: string) =>
    api<{ contacts: any[]; tags: any[]; interactions: any[] }>('/crm/all', { token }),

  contacts: {
    list: (token: string) => api<{ items: any[]; nextCursor: string | null }>('/crm/contacts', { token }),
    create: (token: string, data: any) =>
      api(`/crm/contacts`, { method: 'POST', body: data, token }),
    update: (token: string, id: string, data: any) =>
      api(`/crm/contacts/${id}`, { method: 'PATCH', body: data, token }),
    delete: (token: string, id: string) =>
      api(`/crm/contacts/${id}`, { method: 'DELETE', token }),
  },

  tags: {
    list: (token: string) => api<{ items: any[]; nextCursor: string | null }>('/crm/tags', { token }),
    create: (token: string, data: any) =>
      api(`/crm/tags`, { method: 'POST', body: data, token }),
    update: (token: string, id: string, data: any) =>
      api(`/crm/tags/${id}`, { method: 'PATCH', body: data, token }),
    delete: (token: string, id: string) =>
      api(`/crm/tags/${id}`, { method: 'DELETE', token }),
  },

  interactions: {
    list: (token: string) => api<{ items: any[]; nextCursor: string | null }>('/crm/interactions', { token }),
    create: (token: string, data: any) =>
      api(`/crm/interactions`, { method: 'POST', body: data, token }),
    update: (token: string, id: string, data: any) =>
      api(`/crm/interactions/${id}`, { method: 'PATCH', body: data, token }),
    delete: (token: string, id: string) =>
      api(`/crm/interactions/${id}`, { method: 'DELETE', token }),
  },
}

// ============================================================
// SHORTCUTS (unifica shortcuts + quick-access)
// ============================================================

export const ShortcutsAPI = {
  list: (token: string, scope?: 'normal' | 'quick') => {
    const qs = scope ? `?scope=${scope}` : ''
    return api<{ items: any[]; nextCursor: string | null }>(`/shortcuts${qs}`, { token })
  },
  create: (token: string, data: any) =>
    api(`/shortcuts`, { method: 'POST', body: data, token }),
  update: (token: string, id: string, data: any) =>
    api(`/shortcuts/${id}`, { method: 'PATCH', body: data, token }),
  delete: (token: string, id: string) =>
    api(`/shortcuts/${id}`, { method: 'DELETE', token }),

  folders: {
    list: (token: string) => api<{ items: any[]; nextCursor: string | null }>('/shortcut-folders', { token }),
    create: (token: string, data: any) =>
      api(`/shortcut-folders`, { method: 'POST', body: data, token }),
    update: (token: string, id: string, data: any) =>
      api(`/shortcut-folders/${id}`, { method: 'PATCH', body: data, token }),
    delete: (token: string, id: string) =>
      api(`/shortcut-folders/${id}`, { method: 'DELETE', token }),
  },
}

// ============================================================
// SEARCH (unificada)
// ============================================================

export async function search(token: string, query: string) {
  return api<{ results: any[] }>(`/search?q=${encodeURIComponent(query)}`, { token })
}