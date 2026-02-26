import { storage, BUCKET_ID } from './appwrite'
import type { Store } from '../renderer/types'

function getFileId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_.-]/g, '_').substring(0, 36)
}

export async function uploadStore(store: Store, userId: string): Promise<void> {
  const fileId = getFileId(userId)
  const json = JSON.stringify(store)
  const file = new File([json], 'store.json', { type: 'application/json' })

  // Try to delete existing file first (ignore error if not found)
  try {
    await storage.deleteFile(BUCKET_ID, fileId)
  } catch {
    // File doesn't exist yet — that's fine
  }

  await storage.createFile(BUCKET_ID, fileId, file)
}

export async function downloadStore(userId: string): Promise<Store | null> {
  const fileId = getFileId(userId)

  try {
    const url = storage.getFileDownload(BUCKET_ID, fileId)
    const response = await fetch(url)
    if (!response.ok) return null
    const data = await response.json()
    return data as Store
  } catch {
    return null
  }
}
