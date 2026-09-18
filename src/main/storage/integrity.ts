import type { Store } from '../types'

const PROTECTED_COLLECTIONS: Array<keyof Store> = [
  'notes', 'noteFolders', 'cards', 'calendarEvents', 'projects',
  'meetings', 'apps', 'shortcuts', 'bills', 'expenses', 'incomes',
]

export interface DataLossAssessment {
  blocked: boolean
  before: number
  after: number
  removed: number
  affected: string[]
}

export const assessCatastrophicDataLoss = (current: Store, next: Store): DataLossAssessment => {
  let before = 0
  let after = 0
  const affected: string[] = []

  for (const key of PROTECTED_COLLECTIONS) {
    const currentValue = current[key]
    const nextValue = next[key]
    if (!Array.isArray(currentValue) || !Array.isArray(nextValue)) continue
    before += currentValue.length
    after += nextValue.length
    if (currentValue.length >= 5 && nextValue.length <= Math.floor(currentValue.length * 0.4)) {
      affected.push(String(key))
    }
  }

  const removed = Math.max(0, before - after)
  const syncChanged = current.lastSyncAt !== next.lastSyncAt && Boolean(next.lastSyncAt)
  const broadCollapse = before >= 12 && removed >= 10 && after <= Math.floor(before * 0.4)
  return {
    blocked: syncChanged && (broadCollapse || affected.length > 0),
    before,
    after,
    removed,
    affected,
  }
}
