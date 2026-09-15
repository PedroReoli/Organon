import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

import type { AppConfig } from './types'

export const CURRENT_STORAGE_LAYOUT_VERSION = 2
const STORAGE_MARKER_RELATIVE_PATH = path.join('_sistema', 'storage-layout.json')

export const getDedicatedDefaultDataPath = (): string => {
  if (!app.isPackaged) {
    return path.join(__dirname, '..', '..', 'data-v2')
  }
  return path.join(app.getPath('documents'), 'Organon')
}

export const getDefaultDataPath = (): string => {
  if (!app.isPackaged) {
    return path.join(__dirname, '..', '..', 'data')
  }
  return app.getPath('userData')
}

export const getConfigPath = (): string => {
  return path.join(app.getPath('userData'), 'config.json')
}

export const getDefaultConfig = (): AppConfig => ({
  version: 2,
  dataDir: null,
  installerCompleted: false,
  storageLayoutVersion: 0,
  dedicatedStorageCompleted: false,
  migrationState: 'pending',
  migrationSourceDir: null,
  migrationError: null,
})

const loadConfig = (): AppConfig => {
  const configPath = getConfigPath()
  const candidates = [configPath, `${configPath}.bak`]
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const raw = fs.readFileSync(candidate, 'utf-8')
        const parsed = JSON.parse(raw) as AppConfig
        if (typeof parsed.version === 'number') {
          return {
            ...getDefaultConfig(),
            ...parsed,
          }
        }
      }
    } catch (error) {
      console.error(`Erro ao ler config em ${candidate}:`, error)
    }
  }
  return getDefaultConfig()
}

const saveConfig = (config: AppConfig): boolean => {
  const configPath = getConfigPath()
  const tempPath = `${configPath}.tmp`
  const backupPath = `${configPath}.bak`
  try {
    fs.writeFileSync(tempPath, JSON.stringify(config, null, 2), 'utf-8')
    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath)
    if (fs.existsSync(configPath)) fs.renameSync(configPath, backupPath)
    try {
      fs.renameSync(tempPath, configPath)
    } catch (error) {
      if (!fs.existsSync(configPath) && fs.existsSync(backupPath)) fs.renameSync(backupPath, configPath)
      throw error
    }
    if (fs.existsSync(backupPath)) fs.unlinkSync(backupPath)
    return true
  } catch (error) {
    console.error('Erro ao salvar config:', error)
    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath) } catch { /* ignora limpeza */ }
    return false
  }
}

let cachedConfig: AppConfig | null = null

export const getConfig = (): AppConfig => {
  if (!cachedConfig) {
    cachedConfig = loadConfig()
  }
  return cachedConfig
}

export const setConfig = (nextConfig: AppConfig): boolean => {
  if (!saveConfig(nextConfig)) return false
  cachedConfig = nextConfig
  return true
}

export const getDataPath = (): string => {
  const config = getConfig()
  if (config.dataDir) return config.dataDir
  return config.storageLayoutVersion === CURRENT_STORAGE_LAYOUT_VERSION
    ? getDedicatedDefaultDataPath()
    : getDefaultDataPath()
}

export const getStorageMarkerPath = (dataPath: string): string => path.join(dataPath, STORAGE_MARKER_RELATIVE_PATH)

export const isDedicatedStorageRoot = (dataPath: string): boolean => {
  const marker = readJsonFile(getStorageMarkerPath(dataPath))
  return Boolean(marker && typeof marker === 'object' && (marker as { version?: number }).version === CURRENT_STORAGE_LAYOUT_VERSION)
}

export const getStorePath = (dataPath: string): string => {
  return isDedicatedStorageRoot(dataPath)
    ? path.join(dataPath, '_sistema', 'indices', 'store.json')
    : path.join(dataPath, 'store.json')
}

export const getStoreDir = (dataPath: string): string => {
  return isDedicatedStorageRoot(dataPath)
    ? path.join(dataPath, '_sistema', 'indices')
    : path.join(dataPath, 'store')
}

export const getBackupDir = (dataPath: string): string => {
  return isDedicatedStorageRoot(dataPath)
    ? path.join(dataPath, 'Backups')
    : path.join(dataPath, 'backups')
}

export const getNotesDir = (dataPath: string): string => {
  return isDedicatedStorageRoot(dataPath)
    ? path.join(dataPath, 'Dados', 'Notas')
    : path.join(dataPath, 'notes')
}

export const getMeetingsDir = (dataPath: string): string => {
  return isDedicatedStorageRoot(dataPath)
    ? path.join(dataPath, 'Dados', 'Reunioes')
    : path.join(dataPath, 'meetings')
}

export const getIntegrityDir = (dataPath: string): string => {
  return isDedicatedStorageRoot(dataPath)
    ? path.join(dataPath, '_sistema', 'integridade')
    : dataPath
}

export const getIntegritySnapshotsDir = (dataPath: string): string => {
  return isDedicatedStorageRoot(dataPath)
    ? path.join(getIntegrityDir(dataPath), 'snapshots')
    : getBackupDir(dataPath)
}

export const ensureDataDir = (dataPath: string): void => {
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true })
  }
}

export const ensureBackupDir = (dataPath: string): void => {
  const backupDir = getBackupDir(dataPath)
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
}

export const ensureNotesDir = (dataPath: string): void => {
  const notesDir = getNotesDir(dataPath)
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true })
  }
}

export const ensureMeetingsDir = (dataPath: string): void => {
  const meetingsDir = getMeetingsDir(dataPath)
  if (!fs.existsSync(meetingsDir)) {
    fs.mkdirSync(meetingsDir, { recursive: true })
  }
}

export const safeResolveNotePath = (mdPath: string, dataPath: string): string => {
  if (!mdPath) {
    throw new Error('Caminho de nota invalido')
  }
  ensureNotesDir(dataPath)
  const baseDir = path.resolve(getNotesDir(dataPath))
  const sanitized = mdPath.replace(/^[\\/]+/, '')
  const resolved = path.resolve(baseDir, sanitized)
  const prefix = baseDir.endsWith(path.sep) ? baseDir : baseDir + path.sep

  if (!sanitized || (!resolved.startsWith(prefix) && resolved !== baseDir)) {
    throw new Error('Caminho de nota invalido')
  }

  return resolved
}

export const safeResolveMeetingPath = (audioName: string, dataPath: string): string => {
  ensureMeetingsDir(dataPath)
  const baseDir = path.resolve(getMeetingsDir(dataPath))
  const sanitized = audioName.replace(/^[\\/]+/, '')
  const resolved = path.resolve(baseDir, sanitized)
  const prefix = baseDir.endsWith(path.sep) ? baseDir : baseDir + path.sep

  if (!sanitized || (!resolved.startsWith(prefix) && resolved !== baseDir)) {
    throw new Error('Caminho de audio invalido')
  }

  return resolved
}

export const copyDirMerge = (sourceDir: string, destDir: string, overwrite: boolean = false): { copied: number; skipped: number } => {
  let copied = 0
  let skipped = 0

  try {
    if (!fs.existsSync(sourceDir)) {
      return { copied: 0, skipped: 0 }
    }

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }

    const entries = fs.readdirSync(sourceDir, { withFileTypes: true })
    for (const entry of entries) {
      const srcPath = path.join(sourceDir, entry.name)
      const dstPath = path.join(destDir, entry.name)

      if (entry.isDirectory()) {
        const result = copyDirMerge(srcPath, dstPath, overwrite)
        copied += result.copied
        skipped += result.skipped
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      if (overwrite || !fs.existsSync(dstPath)) {
        fs.copyFileSync(srcPath, dstPath)
        copied++
        continue
      }

      const ext = path.extname(entry.name)
      const baseName = path.basename(entry.name, ext)
      let counter = 1
      let newDstPath = dstPath
      while (fs.existsSync(newDstPath)) {
        newDstPath = path.join(destDir, `${baseName}-copy${counter}${ext}`)
        counter++
      }
      fs.copyFileSync(srcPath, newDstPath)
      copied++
    }

    return { copied, skipped }
  } catch (error) {
    console.error('Erro ao copiar diretorio:', error)
    return { copied, skipped }
  }
}

export const copyDirReplace = (sourceDir: string, destDir: string): void => {
  if (!fs.existsSync(sourceDir)) return
  deletePathIfExists(destDir)
  ensureDataDir(destDir)
  copyDirMerge(sourceDir, destDir, true)
}

export const writeTextFileAtomic = (filePath: string, content: string): boolean => {
  const tempPath = filePath + '.tmp'
  try {
    ensureDataDir(path.dirname(filePath))
    fs.writeFileSync(tempPath, content, 'utf-8')
    fs.renameSync(tempPath, filePath)
    return true
  } catch (error) {
    console.error('Erro ao salvar arquivo:', error)
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath)
      }
    } catch {
      // Ignora erro ao limpar.
    }
    return false
  }
}

export const deletePathIfExists = (targetPath: string): void => {
  if (!fs.existsSync(targetPath)) return
  const stat = fs.statSync(targetPath)
  if (stat.isDirectory()) {
    fs.rmSync(targetPath, { recursive: true, force: true })
  } else {
    fs.unlinkSync(targetPath)
  }
}

export const readJsonFile = (filePath: string): unknown | null => {
  try {
    if (!fs.existsSync(filePath)) return null
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

export const getPathSizeRecursive = (targetPath: string): number => {
  if (!fs.existsSync(targetPath)) return 0
  const stat = fs.statSync(targetPath)
  if (stat.isFile()) return stat.size

  let total = 0
  const entries = fs.readdirSync(targetPath, { withFileTypes: true })
  for (const entry of entries) {
    total += getPathSizeRecursive(path.join(targetPath, entry.name))
  }
  return total
}
