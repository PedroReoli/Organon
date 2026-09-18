import { app } from 'electron'
import { createHash } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

import {
  copyDirMerge,
  copyDirReplace,
  deletePathIfExists,
  ensureBackupDir,
  ensureDataDir,
  getBackupDir,
  getDataPath,
  getMeetingsDir,
  getNotesDir,
  getPathSizeRecursive,
  getStorePath,
  isDedicatedStorageRoot,
  readJsonFile,
  writeTextFileAtomic,
} from '../storage/filesystem'
import {
  getSectionJsonRelativePaths,
  loadSectionedStoreFromRoot,
  loadStoreFromPath,
  normalizeStore,
  saveStoreToPath,
  writeSectionedStoreToDir,
} from '../storage/store'
import type { BackupListItem, BackupManifest, Store } from '../types'

export { mergeDataFromOldPath } from '../storage/legacyDataMerge'

type BackupCategory = NonNullable<BackupManifest['category']>

const CATEGORY_DIRS: Record<BackupCategory, string> = {
  automatic: 'Diarios',
  daily: 'Diarios',
  weekly: 'Semanais',
  monthly: 'Mensais',
  manual: 'Manuais',
  emergency: 'Emergencia',
  'pre-update': 'Pre-atualizacao',
}

const RETENTION: Partial<Record<BackupCategory, number>> = {
  daily: 7,
  automatic: 7,
  weekly: 8,
  monthly: 12,
  emergency: 10,
  'pre-update': 5,
}

const sha256File = (filePath: string): string => createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')

const listFilesRecursive = (root: string): string[] => {
  if (!fs.existsSync(root)) return []
  const files: string[] = []
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name)
    if (entry.isDirectory()) files.push(...listFilesRecursive(fullPath))
    else if (entry.isFile()) files.push(fullPath)
  }
  return files
}

const countStoreItems = (store: Store): Record<string, number> => ({
  notes: store.notes.length,
  noteFolders: store.noteFolders.length,
  cards: store.cards.length,
  calendarEvents: store.calendarEvents.length,
  projects: store.projects.length,
  meetings: store.meetings.length,
})

const getCategoryDir = (dataPath: string, category: BackupCategory): string => {
  const root = getBackupDir(dataPath)
  return isDedicatedStorageRoot(dataPath) ? path.join(root, CATEGORY_DIRS[category]) : root
}

const createBackupManifest = (dataPath: string, category: BackupCategory, store: Store): BackupManifest => ({
  formatVersion: 2,
  createdAt: new Date().toISOString(),
  category,
  appVersion: app.getVersion(),
  storageLayoutVersion: isDedicatedStorageRoot(dataPath) ? 2 : 1,
  storeRoot: '',
  jsonFiles: getSectionJsonRelativePaths(''),
  sourceJsonFiles: getSectionJsonRelativePaths(''),
  notesRoot: 'notes',
  meetingsRoot: 'meetings',
  notesLinkedBy: 'notes.json -> notes[].mdPath',
  counts: countStoreItems(store),
  files: [],
  complete: false,
})

const loadStoreFromBackupManifest = (backupPath: string): Store | null => {
  const manifestPath = path.join(backupPath, 'backup.json')
  const manifestRaw = readJsonFile(manifestPath)
  if (!manifestRaw || typeof manifestRaw !== 'object') return null

  const manifest = manifestRaw as Partial<BackupManifest>
  if (!Array.isArray(manifest.jsonFiles)) return null

  const merged: Partial<Store> = {}
  for (const relPath of manifest.jsonFiles) {
    if (typeof relPath !== 'string' || !relPath.endsWith('.json')) continue
    const absPath = path.join(backupPath, relPath)
    const parsed = readJsonFile(absPath)
    if (!parsed || typeof parsed !== 'object') continue
    Object.assign(merged, parsed as Partial<Store>)
  }

  return normalizeStore(merged)
}

export const validateBackup = (backupPath: string): { valid: boolean; error?: string; store?: Store } => {
  try {
    if (!fs.existsSync(backupPath) || !fs.statSync(backupPath).isDirectory()) {
      return { valid: false, error: 'Backup nao encontrado.' }
    }
    const store = loadStoreFromBackupManifest(backupPath) ?? loadSectionedStoreFromRoot(backupPath)
    if (!store) return { valid: false, error: 'Os indices JSON estao corrompidos.' }
    const raw = readJsonFile(path.join(backupPath, 'backup.json')) as Partial<BackupManifest> | null
    if (raw?.formatVersion === 2) {
      if (!raw.complete || !raw.completedAt) return { valid: false, error: 'Backup incompleto.' }
      for (const item of raw.files ?? []) {
        const filePath = path.join(backupPath, item.path)
        if (!fs.existsSync(filePath)) return { valid: false, error: `Arquivo ausente: ${item.path}` }
        if (fs.statSync(filePath).size !== item.size || sha256File(filePath) !== item.sha256) {
          return { valid: false, error: `Falha de integridade: ${item.path}` }
        }
      }
      const notesDir = path.join(backupPath, raw.notesRoot ?? 'notes')
      const missing = store.notes.filter(note => note.mdPath && !fs.existsSync(path.join(notesDir, note.mdPath)))
      if (missing.length > 0) return { valid: false, error: `${missing.length} nota(s) sem arquivo.` }
    }
    return { valid: true, store }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : String(error) }
  }
}

const applyRetention = (dataPath: string, category: BackupCategory): void => {
  const limit = RETENTION[category]
  if (!limit) return
  const categoryDir = getCategoryDir(dataPath, category)
  if (!fs.existsSync(categoryDir)) return
  const backups = fs.readdirSync(categoryDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith('backup-'))
    .map(entry => ({ path: path.join(categoryDir, entry.name), time: fs.statSync(path.join(categoryDir, entry.name)).mtimeMs }))
    .sort((a, b) => b.time - a.time)
  for (const oldBackup of backups.slice(limit)) deletePathIfExists(oldBackup.path)
}

export const createBackup = (dataPath: string, category: BackupCategory = 'manual'): { success: boolean; backupPath?: string; error?: string } => {
  try {
    ensureBackupDir(dataPath)
    const store = loadStoreFromPath(dataPath)

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const backupFileName = `backup-${category}-${timestamp}`
    const categoryDir = getCategoryDir(dataPath, category)
    ensureDataDir(categoryDir)
    const backupPath = path.join(categoryDir, backupFileName)
    const stagingPath = `${backupPath}.parcial`
    deletePathIfExists(stagingPath)
    ensureDataDir(stagingPath)

    if (!writeSectionedStoreToDir(store, stagingPath)) throw new Error('Falha ao gravar os indices do backup.')
    if (!writeTextFileAtomic(path.join(stagingPath, 'store.json'), JSON.stringify(store, null, 2))) throw new Error('Falha ao gravar store.json.')
    copyDirMerge(getNotesDir(dataPath), path.join(stagingPath, 'notes'), true)
    copyDirMerge(getMeetingsDir(dataPath), path.join(stagingPath, 'meetings'), true)
    for (const note of store.notes) {
      if (!note.mdPath) continue
      const notePath = path.join(stagingPath, 'notes', note.mdPath)
      if (!fs.existsSync(notePath)) {
        ensureDataDir(path.dirname(notePath))
        fs.writeFileSync(notePath, '', 'utf-8')
      }
    }

    const manifest = createBackupManifest(dataPath, category, store)
    manifest.files = listFilesRecursive(stagingPath).map(file => ({
      path: path.relative(stagingPath, file).replace(/\\/g, '/'),
      size: fs.statSync(file).size,
      sha256: sha256File(file),
    }))
    manifest.completedAt = new Date().toISOString()
    manifest.complete = true
    if (!writeTextFileAtomic(path.join(stagingPath, 'backup.json'), JSON.stringify(manifest, null, 2))) throw new Error('Falha ao finalizar o manifesto.')
    const validation = validateBackup(stagingPath)
    if (!validation.valid) throw new Error(validation.error ?? 'Backup nao passou na validacao.')
    fs.renameSync(stagingPath, backupPath)
    applyRetention(dataPath, category)

    return { success: true, backupPath }
  } catch (error) {
    console.error('Erro ao criar backup:', error)
    return { success: false, error: String(error) }
  }
}

export const listBackups = (dataPath: string): BackupListItem[] => {
  try {
    const backupDir = getBackupDir(dataPath)
    if (!fs.existsSync(backupDir)) {
      return []
    }

    const candidateDirs = [backupDir]
    for (const categoryDir of Object.values(CATEGORY_DIRS)) {
      const fullPath = path.join(backupDir, categoryDir)
      if (fs.existsSync(fullPath) && !candidateDirs.includes(fullPath)) candidateDirs.push(fullPath)
    }
    const backups = candidateDirs.flatMap(dir => fs.readdirSync(dir, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && (entry.name.startsWith('store-backup-') || entry.name.startsWith('backup-')))
      .map(entry => {
        const backupPath = path.join(dir, entry.name)
        const stats = fs.statSync(backupPath)
        const manifest = readJsonFile(path.join(backupPath, 'backup.json')) as Partial<BackupManifest> | null
        const validation = validateBackup(backupPath)
        return {
          name: entry.name,
          path: backupPath,
          date: stats.mtime.toISOString(),
          size: getPathSizeRecursive(backupPath),
          category: manifest?.category ?? 'legacy',
          valid: validation.valid,
          notes: validation.store?.notes.length ?? 0,
        }
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return backups
  } catch (error) {
    console.error('Erro ao listar backups:', error)
    return []
  }
}

export const restoreBackup = (backupPath: string, dataPath: string): { success: boolean; error?: string } => {
  try {
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: 'Backup nao encontrado' }
    }

    const isDirBackup = fs.statSync(backupPath).isDirectory()
    const hasBackupManifest = isDirBackup && fs.existsSync(path.join(backupPath, 'backup.json'))
    const validation = isDirBackup ? validateBackup(backupPath) : null
    if (validation && !validation.valid) return { success: false, error: validation.error }
    const recovered = isDirBackup
      ? validation?.store ?? null
      : (() => {
        const parsed = readJsonFile(backupPath)
        if (!parsed || typeof parsed !== 'object') return null
        return normalizeStore(parsed as Partial<Store>)
      })()

    if (!recovered) {
      return { success: false, error: 'Backup invalido (JSON corrompido)' }
    }

    if (fs.existsSync(getStorePath(dataPath)) || fs.existsSync(path.join(dataPath, 'store'))) {
      const safety = createBackup(dataPath, 'emergency')
      if (!safety.success) return { success: false, error: `Restauracao cancelada: ${safety.error}` }
    }

    saveStoreToPath(recovered, dataPath)
    if (isDirBackup) {
      const backupNotesDir = path.join(backupPath, 'notes')
      const backupMeetingsDir = path.join(backupPath, 'meetings')
      const currentNotesDir = getNotesDir(dataPath)
      const currentMeetingsDir = getMeetingsDir(dataPath)

      if (fs.existsSync(backupNotesDir)) {
        copyDirReplace(backupNotesDir, currentNotesDir)
      } else if (hasBackupManifest) {
        deletePathIfExists(currentNotesDir)
      }

      if (fs.existsSync(backupMeetingsDir)) {
        copyDirReplace(backupMeetingsDir, currentMeetingsDir)
      } else if (hasBackupManifest) {
        deletePathIfExists(currentMeetingsDir)
      }
    }
    return { success: true }
  } catch (error) {
    console.error('Erro ao restaurar backup:', error)
    return { success: false, error: String(error) }
  }
}

let backupTimer: NodeJS.Timeout | null = null

const hasBackupForPeriod = (dataPath: string, category: BackupCategory, periodKey: string): boolean => {
  const dir = getCategoryDir(dataPath, category)
  if (!fs.existsSync(dir)) return false
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith(`backup-${category}-`))
    .some(entry => {
      const manifest = readJsonFile(path.join(dir, entry.name, 'backup.json')) as Partial<BackupManifest> | null
      if (!manifest?.createdAt || !manifest.complete) return false
      const date = new Date(manifest.createdAt)
      if (category === 'daily') return date.toISOString().slice(0, 10) === periodKey
      if (category === 'monthly') return date.toISOString().slice(0, 7) === periodKey
      const start = new Date(date)
      const day = (start.getUTCDay() + 6) % 7
      start.setUTCDate(start.getUTCDate() - day)
      return start.toISOString().slice(0, 10) === periodKey
    })
}

export const runBackupSchedule = (dataPath: string): void => {
  const now = new Date()
  const dailyKey = now.toISOString().slice(0, 10)
  const monthlyKey = now.toISOString().slice(0, 7)
  const weekStart = new Date(now)
  const weekDay = (weekStart.getUTCDay() + 6) % 7
  weekStart.setUTCDate(weekStart.getUTCDate() - weekDay)
  const weeklyKey = weekStart.toISOString().slice(0, 10)

  const schedules: Array<{ category: BackupCategory; key: string }> = [
    { category: 'daily', key: dailyKey },
    { category: 'weekly', key: weeklyKey },
    { category: 'monthly', key: monthlyKey },
  ]
  for (const schedule of schedules) {
    if (hasBackupForPeriod(dataPath, schedule.category, schedule.key)) continue
    const result = createBackup(dataPath, schedule.category)
    if (!result.success) console.error(`Erro no backup ${schedule.category}:`, result.error)
  }
}

export const startBackupTimer = (intervalMinutes: number): void => {
  if (backupTimer) {
    clearInterval(backupTimer)
  }

  if (intervalMinutes <= 0) {
    return
  }

  runBackupSchedule(getDataPath())
  const intervalMs = Math.max(intervalMinutes, 15) * 60 * 1000
  backupTimer = setInterval(() => {
    runBackupSchedule(getDataPath())
  }, intervalMs)
}

export const stopBackupTimer = (): void => {
  if (backupTimer) {
    clearInterval(backupTimer)
    backupTimer = null
  }
}
