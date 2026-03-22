import type { License, LicenseWithDetails, LicenseEntitlement, LicenseActivation } from '../types/license'

export interface CreateLicenseDto {
  name: string
  planNumber: string
  customerNumber: string
  licenseNumber: string
  maxDevices: number
  issuedAt: string
  expiresAt: string
  graceUntil?: string
  modules?: Record<string, boolean>
}

export interface UpdateLicenseDto {
  name?: string
  maxDevices?: number
  expiresAt?: string
  graceUntil?: string | null
  status?: string
}

const BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) || 'https://reolicodeapi.com'

const ADMIN_TOKEN: string =
  (import.meta.env.VITE_API_TOKEN as string) || ''

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${BASE_URL}/api/v1/organon${path}`
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_TOKEN}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const err = (await res.json()) as { message?: string; error?: string }
      message = err.message ?? err.error ?? message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  return res.json() as Promise<T>
}

export const api = {
  listLicenses: () =>
    request<{ licenses: License[] }>('GET', '/admin/licenses'),

  getLicense: (id: string) =>
    request<{ license: LicenseWithDetails }>('GET', `/admin/licenses/${id}`),

  createLicense: (data: CreateLicenseDto) =>
    request<{ license: LicenseWithDetails }>('POST', '/admin/licenses', data),

  updateLicense: (id: string, data: UpdateLicenseDto) =>
    request<{ license: License }>('PATCH', `/admin/licenses/${id}`, data),

  suspendLicense: (id: string) =>
    request<{ license: License }>('POST', `/admin/licenses/${id}/suspend`),

  revokeLicense: (id: string) =>
    request<{ license: License }>('POST', `/admin/licenses/${id}/revoke`),

  resetActivations: (id: string) =>
    request<{ success: boolean }>('POST', `/admin/licenses/${id}/reset-activations`),

  getActivations: (id: string) =>
    request<{ activations: LicenseActivation[] }>('GET', `/admin/licenses/${id}/activations`),

  updateEntitlements: (id: string, modules: Record<string, boolean>) =>
    request<{ entitlements: LicenseEntitlement[] }>(
      'PUT',
      `/admin/licenses/${id}/entitlements`,
      { modules }
    ),
}
