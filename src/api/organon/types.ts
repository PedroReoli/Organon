export interface OrganonUser {
  id: string
  email: string
  name: string | null
  created_at: string
  updated_at?: string
}

export interface AuthData {
  user: OrganonUser
  token?: string
  accessToken?: string
  access_token?: string
  modules?: Record<string, boolean> | null
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
  status: 'ok' | 'conflict' | 'skipped' | 'deleted' | 'error'
  reason?: string
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

export type Paginated<T> = {
  data: T[]
  meta: { cursor: string | null; limit: number }
}

export interface RefreshTokens {
  accessToken: string
  refreshToken: string
}
