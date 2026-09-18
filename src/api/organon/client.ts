import type { RefreshTokens } from './types'

const DEFAULT_BASE_URL = 'https://reolicodeapi.com'

let _baseUrl: string = (import.meta.env.VITE_API_BASE_URL as string) || DEFAULT_BASE_URL
let _accessToken = (import.meta.env.VITE_API_TOKEN as string) || ''
let _refreshToken = ''
let _refreshPromise: Promise<RefreshTokens> | null = null
let _onTokensUpdated: ((accessToken: string, refreshToken: string) => void) | null = null

const CLIENT_ID_STORAGE_KEY = 'organon.clientId'

function generateClientId(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36)
  )
}

function loadClientId(): string {
  if (typeof window === 'undefined') return generateClientId()
  try {
    const existing = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY)
    if (existing) return existing
    const fresh = generateClientId()
    window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, fresh)
    return fresh
  } catch {
    return generateClientId()
  }
}

const _clientId: string = loadClientId()

export function getOrganonClientId(): string {
  return _clientId
}

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' ? value as Record<string, unknown> : {}
)

const getString = (value: unknown): string => (typeof value === 'string' ? value : '')

const readAccessToken = (payload: unknown): string => {
  const root = asRecord(payload)
  return getString(root.token ?? root.accessToken ?? root.access_token)
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

export function getOrganonTokens(): { accessToken: string; refreshToken: string } {
  return { accessToken: _accessToken, refreshToken: _refreshToken }
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

export function buildUrl(path: string): string {
  return `${_baseUrl}/api/v1/organon${path}`
}

const MAX_429_RETRIES = 3
const BASE_RETRY_DELAY_MS = 2000
function _retrySleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)) }

export async function doFetch<T>(path: string, init?: RequestInit, withAuth = true): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-Id': _clientId,
  }
  if (withAuth && _accessToken) headers['Authorization'] = `Bearer ${_accessToken}`

  const res = await fetch(buildUrl(path), {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  })

  if (res.status === 204) return undefined as T

  // Auto-refresh on 401 (token expirado)
  if (res.status === 401 && withAuth && _accessToken) {
    await doRefresh()
    const headers2: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-Id': _clientId,
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

  // Retry automatico para 429 (rate limit)
  if (res.status === 429) {
    for (let _retry = 0; _retry < MAX_429_RETRIES; _retry++) {
      const ra = parseInt(res.headers.get('retry-after') || '', 10)
      await _retrySleep((ra > 0 ? ra * 1000 : BASE_RETRY_DELAY_MS) * Math.pow(2, _retry))
      const retryRes = await fetch(buildUrl(path), {
        ...init,
        headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
      })
      if (retryRes.status === 204) return undefined as T
      if (retryRes.status !== 429) {
        if (!retryRes.ok) {
          const b = await retryRes.json().catch(() => ({}))
          throw makeError(retryRes.status, b)
        }
        return retryRes.json() as Promise<T>
      }
    }
    const body = await res.json().catch(() => ({}))
    throw makeError(429, body)
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

const readRefreshTokens = (payload: unknown): RefreshTokens | null => {
  const data = asRecord(asRecord(payload).data ?? payload)
  const accessToken = readAccessToken(data)
  if (!accessToken) return null
  return {
    accessToken,
    refreshToken: getString(data.refreshToken ?? data.refresh_token ?? ''),
  }
}

const fetchRefreshWithBody = async (refreshToken: string): Promise<RefreshTokens | null> => {
  const res = await fetch(buildUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) return null
  return readRefreshTokens(await res.json().catch(() => ({})))
}

const fetchRefreshWithBearer = async (token: string): Promise<RefreshTokens | null> => {
  const res = await fetch(buildUrl('/auth/refresh'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  })
  if (!res.ok) return null
  return readRefreshTokens(await res.json().catch(() => ({})))
}

export async function refreshOrganonTokens(): Promise<boolean> {
  try {
    await doRefresh()
    return !!_accessToken
  } catch {
    return false
  }
}

export async function doRefresh(): Promise<RefreshTokens> {
  if (_refreshPromise) return _refreshPromise

  _refreshPromise = (async () => {
    const tokenForRefresh = _refreshToken || _accessToken
    if (!tokenForRefresh) throw new Error('No token available for refresh')

    const refreshed =
      (_refreshToken ? await fetchRefreshWithBody(_refreshToken) : null)
      ?? await fetchRefreshWithBearer(tokenForRefresh)

    if (!refreshed) {
      _accessToken = ''
      _refreshToken = ''
      _onTokensUpdated?.('', '')
      throw new Error('Token refresh failed')
    }

    _accessToken = refreshed.accessToken
    if (refreshed.refreshToken) _refreshToken = refreshed.refreshToken
    _onTokensUpdated?.(_accessToken, _refreshToken)
    return {
      accessToken: _accessToken,
      refreshToken: _refreshToken,
    }
  })().finally(() => {
    _refreshPromise = null
  })

  return _refreshPromise
}

export const get = <T>(path: string) => doFetch<T>(path)
export const post = <T>(path: string, body: unknown, withAuth = true) =>
  doFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }, withAuth)
export const patch = <T>(path: string, body: unknown) =>
  doFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
export const put = <T>(path: string, body: unknown) =>
  doFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) })
export const del = <T>(path: string) => doFetch<T>(path, { method: 'DELETE' })

export function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}
