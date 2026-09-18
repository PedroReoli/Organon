import type {
  AuthData,
  OrganonUser,
  Paginated,
  PingAttemptResult,
  PingDiagnostics,
  SyncBatchResult,
  SyncChangesResponse,
  SyncOperation,
} from './types'
import {
  buildUrl,
  del,
  doFetch,
  doRefresh,
  get,
  getOrganonBaseUrl,
  getOrganonTokens,
  patch,
  post,
  put,
  qs,
} from './client'

export const organonEndpoints = {
  // HEALTH
  pingDetailed: async (): Promise<PingDiagnostics> => {
    const baseUrl = getOrganonBaseUrl()
    const { accessToken } = getOrganonTokens()
    const attempts: Array<{ path: string; withAuth: boolean; url?: string }> = [
      { path: '/organon/health/ping', withAuth: false, url: `${baseUrl}/api/v1/organon/health/ping` },
      { path: '/health/db-ping', withAuth: true, url: buildUrl('/health/db-ping') },
      { path: '/auth/me', withAuth: true },
    ].map((item) => ({ ...item, url: item.url ?? buildUrl(item.path) }))

    const results: PingAttemptResult[] = []

    for (const attempt of attempts) {
      if (attempt.withAuth && !accessToken) {
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
        if (attempt.withAuth && accessToken) {
          headers.Authorization = `Bearer ${accessToken}`
        }
        const res = await fetch(attempt.url!, { method: 'GET', headers })
        results.push({
          path: attempt.path,
          withAuth: attempt.withAuth,
          ok: res.ok,
          status: res.status,
        })
        if (res.ok) {
          return {
            ok: true,
            baseUrl,
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

    const publicPingOk = results.some((item) => item.path === '/organon/health/ping' && item.ok)
    const hasUnauthorized = results.some((item) => item.status === 401)
    const message = publicPingOk
      ? hasUnauthorized
        ? 'API pública online, mas autenticação Organon falhou (401).'
        : 'API pública online, mas endpoints Organon não responderam como esperado.'
      : 'Não foi possível confirmar conectividade com a API.'

    return {
      ok: false,
      baseUrl,
      checkedAt: new Date().toISOString(),
      message,
      attempts: results,
    }
  },

  ping: async (): Promise<boolean> => {
    const report = await organonEndpoints.pingDetailed()
    return report.ok
  },

  // AUTH
  auth: {
    register: (email: string, password: string, name?: string): Promise<{ data: AuthData }> =>
      post('/auth/register', { email, password, name }, false),

    login: (email: string, password: string): Promise<{ data: AuthData }> =>
      post('/auth/login', { email, password }, false),

    refresh: async (): Promise<{ data: { accessToken: string; refreshToken: string } }> => {
      const data = await doRefresh()
      return { data }
    },

    logout: (): Promise<void> =>
      doFetch('/auth/logout', { method: 'POST' }, true),

    me: (): Promise<{ data: OrganonUser }> =>
      get('/auth/me'),

    updateProfile: (updates: { name?: string }): Promise<{ data: OrganonUser }> =>
      patch('/auth/profile', updates),
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
    updateLink: (id: string, linkId: string, body: { label?: string; url?: string; sort_order?: number }) =>
      patch<{ data: unknown }>(`/projects/${id}/links/${linkId}`, body),
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

  // PREFERENCES
  preferences: {
    getPlanner: () =>
      get<{ data: { planner_start_hour: number; planner_end_hour: number; planner_interval: number } }>(
        '/preferences/planner'
      ),
    savePlanner: (body: { planner_start_hour?: number; planner_end_hour?: number; planner_interval?: number }) =>
      put<{ data: { planner_start_hour: number; planner_end_hour: number; planner_interval: number } }>(
        '/preferences/planner',
        body
      ),
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
    create: (body: { name: string; parent_id?: string | null; sort_order?: number; is_home?: boolean }) =>
      post<{ data: unknown }>('/note-folders', body),
    update: (id: string, body: { name?: string; parent_id?: string | null; sort_order?: number; is_home?: boolean }) =>
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
      post<{ data: { uploadToken: string; uploadUrl: string; storageKey: string; expiresIn: number } }>(
        '/assets/upload-url',
        body
      ),
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
      delete: (entryId: string) => del<void>(`/habits/entries/${entryId}`),
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
      update: (id: string, body: Record<string, unknown>) => patch<{ data: unknown }>(`/finance/incomes/${id}`, body),
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
      addInteraction: (
        id: string,
        body: { type: string; content: string; occurred_at?: string; date?: string; time?: string }
      ) => post<{ data: unknown }>(`/crm/contacts/${id}/interactions`, body),
      getLinks: (id: string) => get<{ data: unknown }>(`/crm/contacts/${id}/links`),
      updateLinks: (
        id: string,
        links: {
          noteIds?: string[]
          calendarEventIds?: string[]
          fileIds?: string[]
          cardIds?: string[]
          projectIds?: string[]
        }
      ) => put<{ data: unknown }>(`/crm/contacts/${id}/links`, links),
    },
    tags: {
      list: () => get<{ data: unknown[] }>('/crm/tags'),
      create: (body: { name: string; color?: string }) => post<{ data: unknown }>('/crm/tags', body),
      update: (id: string, body: { name?: string; color?: string }) => patch<{ data: unknown }>(`/crm/tags/${id}`, body),
      delete: (id: string) => del<void>(`/crm/tags/${id}`),
    },
    interactions: {
      update: (id: string, body: { type?: string; content?: string; occurred_at?: string; date?: string; time?: string }) =>
        patch<{ data: unknown }>(`/crm/interactions/${id}`, body),
      delete: (id: string) => del<void>(`/crm/interactions/${id}`),
    },
  },

  // SHORTCUTS
  shortcuts: {
    folders: {
      list: () => get<{ data: unknown[] }>('/shortcuts/folders'),
      create: (body: { name: string; parent_id?: string | null; sort_order?: number }) =>
        post<{ data: unknown }>('/shortcuts/folders', body),
      update: (id: string, body: { name?: string; parent_id?: string | null; sort_order?: number }) =>
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
      update: (id: string, body: { name?: string; path?: string; icon?: string; sort_order?: number }) =>
        patch<{ data: unknown }>(`/shortcuts/paths/${id}`, body),
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
  },

  // MACROS (standalone — app_ids: string[], mode: 'sequential'|'simultaneous')
  macros: {
    list: () => get<{ data: unknown[] }>('/macros'),
    create: (body: { name: string; app_ids: string[]; mode?: 'sequential' | 'simultaneous'; sort_order?: number }) =>
      post<{ data: unknown }>('/macros', body),
    update: (
      id: string,
      body: { name?: string; app_ids?: string[]; mode?: 'sequential' | 'simultaneous'; sort_order?: number }
    ) => patch<{ data: unknown }>(`/macros/${id}`, body),
    delete: (id: string) => del<void>(`/macros/${id}`),
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

  // STUDY
  study: {
    config: {
      get: () =>
        get<{ data: { daily_goal_minutes: number; pomodoro_work_min: number; pomodoro_break_min: number } }>(
          '/study/config'
        ),
      update: (body: {
        daily_goal_minutes?: number
        pomodoro_work_min?: number
        focus_minutes?: number
        pomodoro_break_min?: number
        break_minutes?: number
        wallpaper_url?: string
        mute_sound?: boolean
      }) => patch<{ data: unknown }>('/study/config', body),
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
      options?: { client_id?: string; base_cursor?: string }
    ): Promise<{ data: SyncBatchResult }> =>
      doFetch<{ data: SyncBatchResult }>('/sync/batch', {
        method: 'POST',
        body: JSON.stringify({ operations, ...options }),
      }),

    changes: (since: string, cursor?: string, limit = 500): Promise<SyncChangesResponse> =>
      get(`/sync/changes${qs({ since, cursor, limit })}`),
  },
}
