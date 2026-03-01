import { storage, databases, BUCKET_ID, DATABASE_ID, Query } from './appwrite'
import type { Store } from '../renderer/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_.-]/g, '_').substring(0, 36)
}

function str(v: unknown, max = 255): string | null {
  if (v == null) return null
  const s = String(v)
  return s.substring(0, max)
}

/** Codifica conteúdo escrito em base64 (UTF-8 safe). Retorna null se vazio. */
function b64(v: unknown): string | null {
  if (v == null) return null
  const s = String(v)
  if (!s) return null
  try {
    return btoa(unescape(encodeURIComponent(s)))
  } catch {
    return null
  }
}

function json(v: unknown, max = 3000): string | null {
  if (v == null) return null
  try {
    return JSON.stringify(v).substring(0, max)
  } catch {
    return null
  }
}

/** Apaga todos os documentos do usuário em uma collection (paginado). */
async function clearCollection(collectionId: string, userId: string): Promise<void> {
  let hasMore = true
  while (hasMore) {
    const result = await databases.listDocuments(DATABASE_ID, collectionId, [
      Query.equal('userId', userId),
      Query.limit(100),
    ])
    if (result.documents.length === 0) {
      hasMore = false
      break
    }
    await Promise.all(
      result.documents.map(doc =>
        databases.deleteDocument(DATABASE_ID, collectionId, doc.$id).catch(() => null)
      )
    )
    hasMore = result.documents.length === 100
  }
}

/** Cria um documento com try/catch — ignora falhas individuais. */
async function createDoc(collectionId: string, id: string, data: Record<string, unknown>): Promise<void> {
  try {
    await databases.createDocument(DATABASE_ID, collectionId, id, data)
  } catch (err: unknown) {
    const code = (err as { code?: number }).code
    // 409 = já existe (não deve acontecer depois do clear, mas ignoramos)
    if (code !== 409) {
      console.warn(`[sync] Falha ao criar ${collectionId}/${id}:`, err)
    }
  }
}

// ─── Storage Sync (backup completo) ────────────────────────────────────────────

export async function uploadStore(store: Store, userId: string): Promise<void> {
  const fileId = getFileId(userId)
  const json_ = JSON.stringify(store)
  const file = new File([json_], 'store.json', { type: 'application/json' })

  try { await storage.deleteFile(BUCKET_ID, fileId) } catch { /* ainda não existe */ }
  await storage.createFile(BUCKET_ID, fileId, file)
}

export async function downloadStore(userId: string): Promise<Store | null> {
  const fileId = getFileId(userId)
  try {
    const url = storage.getFileDownload(BUCKET_ID, fileId)
    const response = await fetch(url)
    if (!response.ok) return null
    return await response.json() as Store
  } catch {
    return null
  }
}

// ─── Database Collections Sync ────────────────────────────────────────────────

export interface SyncReport {
  collections: Record<string, { sent: number; errors: number }>
  totalSent: number
  totalErrors: number
}

export async function syncCollectionsToCloud(store: Store, userId: string, noteContents?: Map<string, string>): Promise<SyncReport> {
  const report: SyncReport = { collections: {}, totalSent: 0, totalErrors: 0 }

  async function syncItems<T extends { id: string }>(
    collectionId: string,
    items: T[] | undefined | null,
    toDoc: (item: T) => Record<string, unknown>
  ) {
    const safeItems = items ?? []
    const col = { sent: 0, errors: 0 }
    try {
      await clearCollection(collectionId, userId)
      for (const item of safeItems) {
        try {
          await createDoc(collectionId, item.id, { userId, ...toDoc(item) })
          col.sent++
        } catch {
          col.errors++
        }
      }
    } catch (err) {
      console.warn(`[sync] Falha ao sincronizar collection "${collectionId}":`, err)
      col.errors += safeItems.length
    }
    report.collections[collectionId] = col
    report.totalSent   += col.sent
    report.totalErrors += col.errors
  }

  // ── cards ────────────────────────────────────────────────────────────────
  await syncItems('cards', store.cards, (c) => ({
    title:          str(c.title, 500),
    description:    str(c.description, 2000),
    priority:       str(c.priority, 10),
    status:         str(c.status, 20),
    date:           str(c.date, 20),
    time:           str(c.time, 10),
    locationDay:    str(c.location?.day, 15),
    locationPeriod: str(c.location?.period, 20),
    projectId:      str(c.projectId, 255),
    order:          c.order ?? 0,
    checklist:      json(c.checklist, 3000),
    tags:           json((c as Record<string, unknown>).tags, 500),
    createdAt:      str(c.createdAt, 30),
    updatedAt:      str(c.updatedAt, 30),
  }))

  // ── calendarEvents ───────────────────────────────────────────────────────
  await syncItems('calendarEvents', store.calendarEvents, (e) => ({
    title:       str(e.title, 500),
    date:        str(e.date, 20),
    time:        str(e.time, 10),
    description: str(e.description, 5000),
    color:       str(e.color, 30),
    recurrence:  json(e.recurrence, 1000),
    reminder:    json(e.reminder, 500),
    createdAt:   str(e.createdAt, 30),
    updatedAt:   str(e.updatedAt, 30),
  }))

  // ── projects ─────────────────────────────────────────────────────────────
  await syncItems('projects', store.projects, (p) => ({
    name:        str(p.name, 500),
    path:        str(p.path, 1000),
    color:       str(p.color, 30),
    ideId:       str(p.ideId, 255),
    description: str(p.description, 2000),
    links:       json(p.links, 3000),
    githubUrl:   str((p as Record<string, unknown>).githubUrl as string, 500),
    order:       p.order ?? 0,
    createdAt:   str(p.createdAt, 30),
    updatedAt:   str(p.updatedAt, 30),
  }))

  // ── notes ────────────────────────────────────────────────────────────────
  await syncItems('notes', store.notes, (n) => ({
    title:     str(n.title, 500),
    folderId:  str(n.folderId, 255),
    projectId: str(n.projectId, 255),
    mdPath:    str(n.mdPath, 500),
    content:   b64(noteContents?.get(n.id) ?? ''),
    order:     n.order ?? 0,
    createdAt: str(n.createdAt, 30),
    updatedAt: str(n.updatedAt, 30),
  }))

  // ── noteFolders ──────────────────────────────────────────────────────────
  await syncItems('noteFolders', store.noteFolders, (f) => ({
    name:      str(f.name, 500),
    parentId:  str(f.parentId, 255),
    order:     f.order ?? 0,
    createdAt: str(f.createdAt, 30),
  }))

  // ── habits ───────────────────────────────────────────────────────────────
  await syncItems('habits', store.habits, (h) => ({
    name:      str(h.name, 500),
    type:      str(h.type, 20),
    frequency: str(h.frequency, 20),
    color:     str(h.color, 30),
    unit:      str(h.unit, 100),
    goal:      h.goal ?? 0,
    order:     h.order ?? 0,
    active:    h.active ?? true,
    createdAt: str(h.createdAt, 30),
  }))

  // ── habitEntries ─────────────────────────────────────────────────────────
  await syncItems('habitEntries', store.habitEntries, (e) => ({
    habitId:    str(e.habitId, 255),
    date:       str(e.date, 20),
    value:      e.value ?? 0,
    skipped:    e.skipped ?? false,
    skipReason: str(e.skipReason, 500),
  }))

  // ── crmContacts ──────────────────────────────────────────────────────────
  await syncItems('crmContacts', store.crmContacts, (c) => ({
    name:         str(c.name, 500),
    company:      str(c.company, 500),
    email:        str(c.email, 500),
    phone:        str(c.phone, 100),
    stage:        str(c.stage, 50),
    priority:     str(c.priority, 10),
    tags:         json(c.tags, 1000),
    notes:        b64(c.notes),
    followUpDate: str(c.followUpDate, 20),
    order:        c.order ?? 0,
    createdAt:    str(c.createdAt, 30),
    updatedAt:    str(c.updatedAt, 30),
  }))

  // ── bills ────────────────────────────────────────────────────────────────
  await syncItems('bills', store.bills, (b) => ({
    name:      str(b.name, 500),
    amount:    b.amount ?? 0,
    dueDay:    b.dueDay ?? 1,
    category:  str(b.category, 100),
    active:    b.active ?? true,
    color:     str(b.color, 30),
    createdAt: str(b.createdAt, 30),
  }))

  // ── expenses ─────────────────────────────────────────────────────────────
  await syncItems('expenses', store.expenses, (e) => ({
    description:        str(e.description, 500),
    amount:             e.amount ?? 0,
    date:               str(e.date, 20),
    category:           str(e.category, 100),
    type:               str(e.type, 20),
    installments:       e.installments ?? 1,
    installmentCurrent: e.installmentCurrent ?? 1,
    tags:               json((e as Record<string, unknown>).tags, 500),
    createdAt:          str(e.createdAt, 30),
  }))

  // ── shortcuts ────────────────────────────────────────────────────────────
  await syncItems('shortcuts', store.shortcuts, (s) => ({
    title:     str(s.title, 500),
    url:       str(s.url, 2000),
    folderId:  str(s.folderId, 255),
    favicon:   str(s.favicon, 500),
    order:     s.order ?? 0,
    createdAt: str(s.createdAt, 30),
  }))

  // ── playbooks ────────────────────────────────────────────────────────────
  await syncItems('playbooks', store.playbooks, (p) => ({
    title:     str(p.title, 500),
    sector:    str(p.sector, 255),
    category:  str(p.category, 255),
    summary:   b64(p.summary),
    content:   b64(p.content),
    dialogs:   b64(JSON.stringify(p.dialogs ?? [])),
    order:     p.order ?? 0,
    createdAt: str(p.createdAt, 30),
    updatedAt: str(p.updatedAt, 30),
  }))

  // ── settings (único doc por usuário) ─────────────────────────────────────
  try {
    await clearCollection('settings', userId)
    await createDoc('settings', userId, {
      userId,
      themeName:             str(store.settings.themeName, 50),
      dataDir:               str(store.settings.dataDir, 500),
      navbarConfig:          json(store.settings.navbarConfig, 3000),
      keyboardShortcuts:     json(store.settings.keyboardShortcuts, 2000),
      backupEnabled:         store.settings.backupEnabled ?? true,
      backupIntervalMinutes: store.settings.backupIntervalMinutes ?? 15,
      updatedAt:             new Date().toISOString(),
    })
    const col = { sent: 1, errors: 0 }
    report.collections['settings'] = col
    report.totalSent++
  } catch (err) {
    console.warn('[sync] Falha ao sincronizar settings:', err)
    report.collections['settings'] = { sent: 0, errors: 1 }
    report.totalErrors++
  }

  return report
}
