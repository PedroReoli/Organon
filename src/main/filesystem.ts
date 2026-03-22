import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

import type { AppConfig, FileItem } from './types'

export const getDefaultDataPath = (): string => {
  if (!app.isPackaged) {
    return path.join(__dirname, '..', '..', 'data')
  }
  return path.join(app.getPath('userData'), 'data')
}

export const getConfigPath = (): string => {
  return path.join(app.getPath('userData'), 'config.json')
}

export const getDefaultConfig = (): AppConfig => ({
  version: 1,
  dataDir: null,
  installerCompleted: false,
})

const loadConfig = (): AppConfig => {
  const configPath = getConfigPath()
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8')
      const parsed = JSON.parse(raw) as AppConfig
      if (typeof parsed.version === 'number') {
        return {
          ...getDefaultConfig(),
          ...parsed,
        }
      }
    }
  } catch (error) {
    console.error('Erro ao ler config:', error)
  }
  return getDefaultConfig()
}

const saveConfig = (config: AppConfig): void => {
  const configPath = getConfigPath()
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
  } catch (error) {
    console.error('Erro ao salvar config:', error)
  }
}

let cachedConfig: AppConfig | null = null

export const getConfig = (): AppConfig => {
  if (!cachedConfig) {
    cachedConfig = loadConfig()
  }
  return cachedConfig
}

export const setConfig = (nextConfig: AppConfig): void => {
  cachedConfig = nextConfig
  saveConfig(nextConfig)
}

export const getDataPath = (): string => {
  const config = getConfig()
  return config.dataDir ? config.dataDir : getDefaultDataPath()
}

export const getStorePath = (dataPath: string): string => {
  return path.join(dataPath, 'store.json')
}

export const getStoreDir = (dataPath: string): string => {
  return path.join(dataPath, 'store')
}

export const getBackupDir = (dataPath: string): string => {
  return path.join(dataPath, 'backups')
}

export const getNotesDir = (dataPath: string): string => {
  return path.join(dataPath, 'notes')
}

export const getMeetingsDir = (dataPath: string): string => {
  return path.join(dataPath, 'meetings')
}

export const getFilesDir = (dataPath: string): string => {
  return path.join(dataPath, 'files')
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

export const ensureFilesDir = (dataPath: string): void => {
  const filesDir = getFilesDir(dataPath)
  ensureDataDir(filesDir)
  ensureDataDir(path.join(filesDir, 'images'))
  ensureDataDir(path.join(filesDir, 'pdf'))
  ensureDataDir(path.join(filesDir, 'docx'))
  ensureDataDir(path.join(filesDir, 'other'))
}

export const safeResolveNotePath = (mdPath: string, dataPath: string): string => {
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

export const safeResolveFilePath = (relativePath: string, dataPath: string): string => {
  ensureFilesDir(dataPath)
  const baseDir = path.resolve(getFilesDir(dataPath))
  const sanitized = relativePath.replace(/^[\\/]+/, '')
  const resolved = path.resolve(baseDir, sanitized)
  const prefix = baseDir.endsWith(path.sep) ? baseDir : baseDir + path.sep

  if (!sanitized || (!resolved.startsWith(prefix) && resolved !== baseDir)) {
    throw new Error('Caminho de arquivo invalido')
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

export const getFileTypeFromPath = (filePath: string): FileItem['type'] => {
  const ext = path.extname(filePath).toLowerCase()
  const imageExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'])
  if (imageExts.has(ext)) return 'image'
  if (ext === '.pdf') return 'pdf'
  if (ext === '.docx') return 'docx'
  return 'other'
}

export const getFilesSubdirForType = (type: FileItem['type']): string => {
  if (type === 'image') return 'images'
  return type
}
