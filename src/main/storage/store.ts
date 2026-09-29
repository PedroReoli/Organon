import * as fs from 'fs'
import * as path from 'path'

import {
  ensureBackupDir,
  ensureDataDir,
  getBackupDir,
  getDataPath,
  getIntegrityDir,
  getIntegritySnapshotsDir,
  getStoreDir,
  getStorePath,
  readJsonFile,
  writeTextFileAtomic,
  copyDirReplace,
  deletePathIfExists,
} from './filesystem'
import { getDefaultStore, normalizeStore } from './storeModel'
import { commitStoreGeneration, loadCommittedGeneration, STORE_SECTIONS } from './generationStore'
import type { GenerationCommitMetrics, GenerationCommitOptions } from './generationStore'
import type { Store } from '../types'

export { DEFAULT_STUDY_STATE, getDefaultStore, normalizeStore, normalizeStudyState } from './storeModel'
export { STORE_SECTIONS } from './generationStore'

const hasSectionFilesInDir = (dirPath: string): boolean => {
  if (!fs.existsSync(dirPath)) return false
  return STORE_SECTIONS.some(section => fs.existsSync(path.join(dirPath, section.fileName)))
}

let lastStorageCommitMetrics: GenerationCommitMetrics | null = null

export const getLastStorageCommitMetrics = (): GenerationCommitMetrics | null => lastStorageCommitMetrics

const readSectionedStoreFromDir = (dirPath: string, requireComplete = false): Partial<Store> | null => {
  if (!hasSectionFilesInDir(dirPath)) return null

  const merged: Partial<Store> = {}
  for (const section of STORE_SECTIONS) {
    const sectionPath = path.join(dirPath, section.fileName)
    const parsed = readJsonFile(sectionPath)
    if (!parsed || typeof parsed !== 'object') {
      if (requireComplete) return null
      continue
    }
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

export const loadSectionedStoreFromRoot = (rootPath: string, requireComplete = false): Store | null => {
  const candidates = [...new Set([getStoreDir(rootPath), path.join(rootPath, 'store'), rootPath])]
  for (const candidate of candidates) {
    const partial = readSectionedStoreFromDir(candidate, requireComplete)
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
  // O carregamento precisa ser estritamente read-only. Inicializacao,
  // recuperacao persistente e manutencao pertencem a comandos explicitos.
  if (!fs.existsSync(dataPath)) {
    return getDefaultStore()
  }

  const committed = loadCommittedGeneration(dataPath)
  if (committed) return committed.store

  const storePath = getStorePath(dataPath)
  const tryReadStoreFile = (filePath: string): Store | null => {
    const parsed = readJsonFile(filePath)
    if (!parsed || typeof parsed !== 'object') return null
    return normalizeStore(parsed as Partial<Store>)
  }

  const canonical = tryReadStoreFile(storePath)
  if (canonical) {
    return canonical
  }

  const sectioned = loadSectionedStoreFromRoot(dataPath, true)
  if (sectioned) return sectioned

  console.error('Falha ao ler store principal. Tentando recuperar de copias de seguranca...')

  const candidateRoots: string[] = []
  const candidateFiles: string[] = []
  const integrityDir = getIntegrityDir(dataPath)
  const lastKnownGoodPath = path.join(integrityDir, 'ultimo-indice-integro.json')
  const lastKnownGoodDir = path.join(integrityDir, 'ultimo-indice-integro')
  candidateRoots.push(lastKnownGoodDir)
  candidateFiles.push(lastKnownGoodPath)
  candidateRoots.push(path.join(dataPath, 'store-last-known-good'))
  candidateFiles.push(path.join(dataPath, 'store-last-known-good.json'))

  const snapshotsDir = getIntegritySnapshotsDir(dataPath)
  if (fs.existsSync(snapshotsDir)) {
    const snapshotCandidates = fs.readdirSync(snapshotsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && entry.name.startsWith('store-safety-'))
      .map(entry => ({
        path: path.join(snapshotsDir, entry.name),
        time: fs.statSync(path.join(snapshotsDir, entry.name)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time)
    candidateRoots.push(...snapshotCandidates.map(candidate => candidate.path))
  }

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
    return recovered
  }

  for (const candidate of candidateFiles) {
    const recovered = tryReadStoreFile(candidate)
    if (!recovered) continue
    console.log(`Store recuperado com sucesso a partir de: ${candidate}`)
    return recovered
  }

  console.error('Nao foi possivel recuperar dados. Retornando store padrao.')
  return getDefaultStore()
}

export const saveStoreToPath = (store: Store, dataPath: string, options: GenerationCommitOptions = {}): boolean => {
  ensureDataDir(dataPath)
  ensureDataDir(getStoreDir(dataPath))
  ensureBackupDir(dataPath)
  const storePath = getStorePath(dataPath)
  const storeDir = getStoreDir(dataPath)
  const integrityDir = getIntegrityDir(dataPath)
  const snapshotsDir = getIntegritySnapshotsDir(dataPath)
  const lastKnownGoodPath = path.join(integrityDir, 'ultimo-indice-integro.json')
  const lastKnownGoodDir = path.join(integrityDir, 'ultimo-indice-integro')
  const safetySnapshotMarkerPath = path.join(integrityDir, '.ultimo-snapshot-em')
  let generationCommitted = false

  try {
    const normalized = normalizeStore(store)
    ensureDataDir(integrityDir)
    ensureDataDir(snapshotsDir)

    // Proteção contra sobrescrita acidental de notas vazias
    const currentGeneration = loadCommittedGeneration(dataPath)?.store
    const currentCanonical = readJsonFile(storePath) as Partial<Store> | null
    const currentSectioned = readSectionedStoreFromDir(storeDir)
    const existingNotes = (currentGeneration?.notes && currentGeneration.notes.length > 0)
      ? currentGeneration.notes
      : (currentCanonical?.notes && currentCanonical.notes.length > 0)
      ? currentCanonical.notes
      : (currentSectioned?.notes && currentSectioned.notes.length > 0)
        ? currentSectioned.notes
        : []

    if (normalized.notes.length === 0 && existingNotes.length > 0) {
      normalized.notes = existingNotes
      normalized.noteFolders = (currentGeneration?.noteFolders && currentGeneration.noteFolders.length > 0)
        ? currentGeneration.noteFolders
        : (currentCanonical?.noteFolders && currentCanonical.noteFolders.length > 0)
        ? currentCanonical.noteFolders
        : (currentSectioned?.noteFolders && currentSectioned.noteFolders.length > 0)
          ? currentSectioned.noteFolders
          : normalized.noteFolders
    }

    if (currentCanonical && typeof currentCanonical === 'object') {
      fs.copyFileSync(storePath, lastKnownGoodPath)
    }
    if (readSectionedStoreFromDir(storeDir, true)) {
      copyDirReplace(storeDir, lastKnownGoodDir)
    }

    const commit = commitStoreGeneration(normalized, dataPath, {
      source: options.source ?? 'desktop',
      expectedRevision: options.expectedRevision,
    })
    if (!commit.success) {
      console.error('Commit transacional rejeitado:', commit.error)
      return false
    }
    lastStorageCommitMetrics = commit.metrics ?? null
    generationCommitted = true

    // Espelhos de compatibilidade para consumidores ainda nao migrados. A geracao
    // apontada por CURRENT ja e o estado canonico e nunca depende destes writes.
    const sectionMirrorSaved = writeSectionedStoreToDir(normalized, storeDir)
    const canonicalMirrorSaved = writeTextFileAtomic(storePath, JSON.stringify(normalized, null, 2))
    if (!sectionMirrorSaved || !canonicalMirrorSaved) {
      console.warn('Commit concluido, mas um espelho legado nao foi atualizado.')
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
      const safetyBackupPath = path.join(snapshotsDir, `store-safety-${timestamp}`)
      ensureDataDir(safetyBackupPath)
      writeSectionedStoreToDir(normalized, safetyBackupPath)
      writeTextFileAtomic(path.join(safetyBackupPath, 'store.json'), JSON.stringify(normalized, null, 2))
      fs.writeFileSync(safetySnapshotMarkerPath, String(now), 'utf-8')

      const safetyBackups = fs.readdirSync(snapshotsDir)
        .filter(fileName => fileName.startsWith('store-safety-'))
        .map(fileName => ({
          path: path.join(snapshotsDir, fileName),
          time: fs.statSync(path.join(snapshotsDir, fileName)).mtimeMs,
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
    console.error(generationCommitted ? 'Erro de manutencao apos commit do store:' : 'Erro ao salvar store:', error)
    return generationCommitted
  }
}

export const loadStore = (): Store => {
  return loadStoreFromPath(getDataPath())
}

export const saveStore = (store: Store, options: GenerationCommitOptions = {}): boolean => {
  return saveStoreToPath(store, getDataPath(), options)
}
