export type LicenseStatus = 'trial' | 'active' | 'expired' | 'suspended' | 'revoked'

export interface License {
  id: string
  code: string
  name: string
  status: LicenseStatus
  planNumber: string
  customerNumber: string
  licenseNumber: string
  maxDevices: number
  issuedAt: string
  expiresAt: string
  graceUntil: string | null
  lastValidationAt: string | null
  createdAt: string
  updatedAt: string
}

export interface LicenseEntitlement {
  id: string
  licenseId: string
  moduleKey: string
  enabled: boolean
}

export interface LicenseActivation {
  id: string
  licenseId: string
  deviceId: string
  deviceName: string
  platform: string
  appVersion: string
  isActive: boolean
  lastSeenAt: string
  deactivatedAt: string | null
  deactivationReason: string | null
  createdAt: string
}


export interface LicenseWithDetails extends License {
  entitlements: LicenseEntitlement[]
}

export const MODULES = [
  'planning',
  'notes',
  'calendar',
  'files',
  'habits',
  'finance',
  'study',
  'crm',
  'meetings',
  'backup_pro',
] as const

export type ModuleKey = (typeof MODULES)[number]

export const PLANS: Record<string, string> = {
  '01': 'Basic',
  '02': 'Pro',
  '03': 'Premium',
  '04': 'Business',
  '99': 'Interno/Teste',
}

export const STATUS_LABELS: Record<LicenseStatus, string> = {
  trial: 'Trial',
  active: 'Ativo',
  expired: 'Expirado',
  suspended: 'Suspenso',
  revoked: 'Revogado',
}
