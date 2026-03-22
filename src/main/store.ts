import * as fs from 'fs'
import * as path from 'path'

import {
  ensureBackupDir,
  ensureDataDir,
  getBackupDir,
  getDataPath,
  getStoreDir,
  getStorePath,
  readJsonFile,
  writeTextFileAtomic,
  copyDirReplace,
  deletePathIfExists,
} from './filesystem'
import { getDefaultStore, normalizeStore } from './storeModel'
import type { Store } from './types'

export { DEFAULT_STUDY_STATE, getDefaultStore, normalizeStore, normalizeStudyState } from './storeModel'

export const STORE_SECTIONS: Array<{ fileName: string; keys: Array<keyof Store> }> = [
  { fileName: 'meta.json', keys: ['version'] },
  { fileName: 'planning.json', keys: ['cards'] },
  { fileName: 'calendar.json', keys: ['calendarEvents'] },
  { fileName: 'shortcuts.json', keys: ['shortcutFolders', 'shortcuts'] },
  { fileName: 'paths.json', keys: ['paths'] },
  { fileName: 'projects.json', keys: ['projects', 'registeredIDEs'] },
  { fileName: 'notes.json', keys: ['noteFolders', 'notes'] },
  { fileName: 'colors.json', keys: ['colorPalettes'] },
  { fileName: 'clipboard.json', keys: ['clipboardCategories', 'clipboardItems'] },
  { fileName: 'files.json', keys: ['files'] },
  { fileName: 'apps.json', keys: ['apps', 'macros'] },
  { fileName: 'habits.json', keys: ['habits', 'habitEntries'] },
  { fileName: 'financial.json', keys: ['bills', 'expenses', 'budgetCategories', 'incomes', 'financialConfig', 'savingsGoals'] },
  { fileName: 'today.json', keys: ['quickAccess'] },
  { fileName: 'meetings.json', keys: ['meetings'] },
  { fileName: 'study.json', keys: ['study'] },
  { fileName: 'settings.json', keys: ['settings'] },
]

const hasSectionFilesInDir = (dirPath: string): boolean => {
  if (!fs.existsSync(dirPath)) return false
  return STORE_SECTIONS.some(section => fs.existsSync(path.join(dirPath, section.fileName)))
}

const readSectionedStoreFromDir = (dirPath: string): Partial<Store> | null => {
  if (!hasSectionFilesInDir(dirPath)) return null

  const merged: Partial<Store> = {}
  for (const section of STORE_SECTIONS) {
    const sectionPath = path.join(dirPath, section.fileName)
    const parsed = readJsonFile(sectionPath)
    if (!parsed || typeof parsed !== 'object') continue
    for (const key of section.keys) {
      const value = (parsed as Record<string, unknown>)[key as string]
      if (value !== undefined) {
        ;(merged as Record<string, unknown>)[key as string] = value
      }
    }
  }

  if ((merged as Partial<Store>).colorPalettes === undefined) {
    const legacyNotesPath = path.join(dirPath, 'notes.json')
    const legacyNotes = readJsonFile(legacyNotesPath)
    const legacyColorPalettes = legacyNotes && typeof legacyNotes === 'object'
      ? (legacyNotes as Record<string, unknown>).colorPalettes
      : undefined
    if (legacyColorPalettes !== undefined) {
      ;(merged as Record<string, unknown>).colorPalettes = legacyColorPalettes
    }
  }

  return merged
}

export const loadSectionedStoreFromRoot = (rootPath: string): Store | null => {
  const candidates = [path.join(rootPath, 'store'), rootPath]
  for (const candidate of candidates) {
    const partial = readSectionedStoreFromDir(candidate)
    if (partial) {
      return normalizeStore(partial)
    }
  }
  return null
}

export const writeSectionedStoreToDir = (store: Store, dirPath: string): boolean => {
  ensureDataDir(dirPath)
  for (const section of STORE_SECTIONS) {
    const payload: Record<string, unknown> = {}
    for (const key of section.keys) {
      payload[key as string] = (store as unknown as Record<string, unknown>)[key as string]
    }
    const ok = writeTextFileAtomic(path.join(dirPath, section.fileName), JSON.stringify(payload, null, 2))
    if (!ok) return false
  }
  return true
}

export const getSectionJsonRelativePaths = (storeRoot: string): string[] => {
  const root = storeRoot.replace(/\\/g, '/').replace(/\/+$/g, '')
  const prefix = root.length > 0 ? `${root}/` : ''
  const sectionFiles = STORE_SECTIONS.map(section => `${prefix}${section.fileName}`)
  return [...sectionFiles, `${prefix}store.json`]
}

export const loadStoreFromPath = (dataPath: string): Store => {
  ensureDataDir(dataPath)
  ensureDataDir(getStoreDir(dataPath))
  const storePath = getStorePath(dataPath)
  const tryReadStoreFile = (filePath: string): Store | null => {
    const parsed = readJsonFile(filePath)
    if (!parsed || typeof parsed !== 'object') return null
    return normalizeStore(parsed as Partial<Store>)
  }

  const sectioned = loadSectionedStoreFromRoot(dataPath)
  if (sectioned) return sectioned

  const loadedLegacy = tryReadStoreFile(storePath)
  if (loadedLegacy) {
    saveStoreToPath(loadedLegacy, dataPath)
    return loadedLegacy
  }

  console.error('Falha ao ler store principal. Tentando recuperar de copias de seguranca...')

  const candidateRoots: string[] = []
  const candidateFiles: string[] = []
  const lastKnownGoodPath = path.join(dataPath, 'store-last-known-good.json')
  const lastKnownGoodDir = path.join(dataPath, 'store-last-known-good')
  candidateRoots.push(lastKnownGoodDir)
  candidateFiles.push(lastKnownGoodPath)

  const backupDir = getBackupDir(dataPath)
  if (fs.existsSync(backupDir)) {
    const backupCandidates = fs.readdirSync(backupDir, { withFileTypes: true })
      .filter(entry => entry.name.startsWith('store-backup-') || entry.name.startsWith('store-safety-'))
      .map(entry => ({
        path: path.join(backupDir, entry.name),
        time: fs.statSync(path.join(backupDir, entry.name)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time)

    for (const candidate of backupCandidates) {
      const stat = fs.statSync(candidate.path)
      if (stat.isDirectory()) {
        candidateRoots.push(candidate.path)
      } else if (candidate.path.endsWith('.json')) {
        candidateFiles.push(candidate.path)
      }
    }
  }

  for (const candidate of candidateRoots) {
    const recovered = loadSectionedStoreFromRoot(candidate)
    if (!recovered) continue
    console.log(`Store recuperado com sucesso a partir de: ${candidate}`)
    saveStoreToPath(recovered, dataPath)
    return recovered
  }

  for (const candidate of candidateFiles) {
    const recovered = tryReadStoreFile(candidate)
    if (!recovered) continue
    console.log(`Store recuperado com sucesso a partir de: ${candidate}`)
    saveStoreToPath(recovered, dataPath)
    return recovered
  }

  console.error('Nao foi possivel recuperar dados. Retornando store padrao.')
  return getDefaultStore()
}

export const saveStoreToPath = (store: Store, dataPath: string): boolean => {
  ensureDataDir(dataPath)
  ensureDataDir(getStoreDir(dataPath))
  ensureBackupDir(dataPath)
  const storePath = getStorePath(dataPath)
  const storeDir = getStoreDir(dataPath)
  const lastKnownGoodPath = path.join(dataPath, 'store-last-known-good.json')
  const lastKnownGoodDir = path.join(dataPath, 'store-last-known-good')
  const safetySnapshotMarkerPath = path.join(dataPath, '.last-safety-backup-at')

  try {
    const normalized = normalizeStore(store)

    if (fs.existsSync(storePath)) {
      fs.copyFileSync(storePath, lastKnownGoodPath)
    }
    if (fs.existsSync(storeDir)) {
      copyDirReplace(storeDir, lastKnownGoodDir)
    }

    if (!writeSectionedStoreToDir(normalized, storeDir)) {
      return false
    }

    if (!writeTextFileAtomic(storePath, JSON.stringify(normalized, null, 2))) {
      return false
    }

    const now = Date.now()
    let shouldCreateSafetySnapshot = true
    if (fs.existsSync(safetySnapshotMarkerPath)) {
      const raw = fs.readFileSync(safetySnapshotMarkerPath, 'utf-8').trim()
      const last = Number(raw)
      if (!Number.isNaN(last) && now - last < 2 * 60 * 1000) {
        shouldCreateSafetySnapshot = false
      }
    }

    if (shouldCreateSafetySnapshot) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const safetyBackupPath = path.join(getBackupDir(dataPath), `store-safety-${timestamp}`)
      ensureDataDir(safetyBackupPath)
      writeSectionedStoreToDir(normalized, safetyBackupPath)
      writeTextFileAtomic(path.join(safetyBackupPath, 'store.json'), JSON.stringify(normalized, null, 2))
      fs.writeFileSync(safetySnapshotMarkerPath, String(now), 'utf-8')

      const safetyBackups = fs.readdirSync(getBackupDir(dataPath))
        .filter(fileName => fileName.startsWith('store-safety-'))
        .map(fileName => ({
          path: path.join(getBackupDir(dataPath), fileName),
          time: fs.statSync(path.join(getBackupDir(dataPath), fileName)).mtimeMs,
        }))
        .sort((a, b) => b.time - a.time)

      if (safetyBackups.length > 200) {
        for (const oldBackup of safetyBackups.slice(200)) {
          try {
            deletePathIfExists(oldBackup.path)
          } catch {
            // Ignora erros ao limpar snapshots antigos.
          }
        }
      }
    }

    return true
  } catch (error) {
    console.error('Erro ao salvar store:', error)
    return false
  }
}

export const loadStore = (): Store => {
  return loadStoreFromPath(getDataPath())
}

export const saveStore = (store: Store): boolean => {
  return saveStoreToPath(store, getDataPath())
}
