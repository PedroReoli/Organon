import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

import {
  CURRENT_STORAGE_LAYOUT_VERSION,
  ensureDataDir,
  getConfig,
  getDataPath,
  getDedicatedDefaultDataPath,
  getMeetingsDir,
  getNotesDir,
  getStorageMarkerPath,
  isDedicatedStorageRoot,
  readJsonFile,
  setConfig,
  writeTextFileAtomic,
} from './filesystem'
import { loadStoreFromPath, saveStoreToPath } from './store'
import { createBackup } from './backup'
import type { NoteFolder, Store, ThemeName } from './types'

export interface StorageSummary {
  notes: number
  noteFolders: number
  cards: number
  habits: number
  calendarEvents: number
  projects: number
  meetings: number
  playbooks: number
}

export interface InstallerStatus {
  completed: boolean
  needsMigration: boolean
  currentPath: string
  suggestedPath: string
  layoutVersion: number
  migrationState: string
  summary: StorageSummary
}

export interface StorageMigrationResult {
  success: boolean
  dataRoot?: string
  summary?: StorageSummary
  markdownFiles?: number
  recoveredFiles?: number
  warnings?: string[]
  error?: string
}

const summarizeStore = (store: Store): StorageSummary => ({
  notes: store.notes.length,
  noteFolders: store.noteFolders.length,
  cards: store.cards.length,
  habits: store.habits.length,
  calendarEvents: store.calendarEvents.length,
  projects: store.projects.length,
  meetings: store.meetings.length,
  playbooks: store.playbooks.length,
})

const sanitizeSegment = (value: string, fallback: string): string => {
  const cleaned = value
    .normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/[. ]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i
  if (!cleaned || reserved.test(cleaned)) return fallback
  return cleaned.slice(0, 80)
}

const buildFolderSegments = (folders: NoteFolder[]): Map<string, string[]> => {
  const byId = new Map(folders.map(folder => [folder.id, folder]))
  const cache = new Map<string, string[]>()

  const resolve = (folderId: string, visiting = new Set<string>()): string[] => {
    const cached = cache.get(folderId)
    if (cached) return cached
    const folder = byId.get(folderId)
    if (!folder || visiting.has(folderId)) return []
    visiting.add(folderId)
    const parent = folder.parentId ? resolve(folder.parentId, visiting) : []
    const segments = [...parent, sanitizeSegment(folder.name, `Pasta-${folder.id.slice(0, 8)}`)]
    cache.set(folderId, segments)
    return segments
  }

  for (const folder of folders) resolve(folder.id)
  return cache
}

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

const resolveLegacyNoteFile = (sourceNotesDir: string, mdPath: string | undefined, noteId: string): string | null => {
  const candidates = [
    mdPath ? path.join(sourceNotesDir, mdPath.replace(/^[\\/]+/, '')) : '',
    path.join(sourceNotesDir, `${noteId}.md`),
    path.join(sourceNotesDir, 'notes', `${noteId}.md`),
  ].filter(Boolean)
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
  }
  return listFilesRecursive(sourceNotesDir).find(file => path.basename(file, path.extname(file)) === noteId) ?? null
}

const createStorageTree = (root: string): void => {
  const directories = [
    path.join(root, 'Dados', 'Notas'),
    path.join(root, 'Dados', 'Planejamento'),
    path.join(root, 'Dados', 'Calendario'),
    path.join(root, 'Dados', 'Habitos'),
    path.join(root, 'Dados', 'Financeiro'),
    path.join(root, 'Dados', 'Projetos'),
    path.join(root, 'Dados', 'CRM'),
    path.join(root, 'Dados', 'Reunioes'),
    path.join(root, 'Anexos', 'Imagens'),
    path.join(root, 'Anexos', 'Audios'),
    path.join(root, 'Anexos', 'Arquivos'),
    path.join(root, 'Backups', 'Diarios'),
    path.join(root, 'Backups', 'Semanais'),
    path.join(root, 'Backups', 'Mensais'),
    path.join(root, 'Backups', 'Manuais'),
    path.join(root, 'Backups', 'Emergencia'),
    path.join(root, 'Backups', 'Pre-atualizacao'),
    path.join(root, 'Exportacoes'),
    path.join(root, 'Logs'),
    path.join(root, '_sistema', 'indices'),
    path.join(root, '_sistema', 'integridade'),
    path.join(root, '_sistema', 'migracoes'),
  ]
  for (const directory of directories) ensureDataDir(directory)
}

const writeStorageMarker = (root: string, state: 'copying' | 'validating' | 'completed', sourcePath: string): void => {
  const marker = {
    version: CURRENT_STORAGE_LAYOUT_VERSION,
    state,
    sourcePath,
    appVersion: app.getVersion(),
    updatedAt: new Date().toISOString(),
  }
  if (!writeTextFileAtomic(getStorageMarkerPath(root), JSON.stringify(marker, null, 2))) {
    throw new Error('Nao foi possivel gravar o marcador do armazenamento dedicado.')
  }
}

export const getInstallerStatus = (): InstallerStatus => {
  const config = getConfig()
  const currentPath = getDataPath()
  let summary: StorageSummary = {
    notes: 0, noteFolders: 0, cards: 0, habits: 0,
    calendarEvents: 0, projects: 0, meetings: 0, playbooks: 0,
  }
  try {
    summary = summarizeStore(loadStoreFromPath(currentPath))
  } catch {
    // O wizard mostrara a base vazia e a migracao fara a validacao completa.
  }
  const completed = config.installerCompleted
    && config.dedicatedStorageCompleted === true
    && config.storageLayoutVersion === CURRENT_STORAGE_LAYOUT_VERSION
    && isDedicatedStorageRoot(currentPath)

  return {
    completed,
    needsMigration: config.installerCompleted && !completed,
    currentPath,
    suggestedPath: getDedicatedDefaultDataPath(),
    layoutVersion: config.storageLayoutVersion ?? 0,
    migrationState: config.migrationState ?? 'pending',
    summary,
  }
}

export const migrateToDedicatedStorage = (requestedRoot: string | null, themeName: ThemeName): StorageMigrationResult => {
  const sourceRoot = getDataPath()
  const targetRoot = path.resolve(requestedRoot?.trim() || getDedicatedDefaultDataPath())
  const stagingRoot = `${targetRoot}.migracao-${Date.now()}`
  const config = getConfig()
  const warnings: string[] = []

  try {
    if (path.resolve(sourceRoot).toLowerCase() === targetRoot.toLowerCase() && isDedicatedStorageRoot(sourceRoot)) {
      const store = loadStoreFromPath(sourceRoot)
      store.settings.themeName = themeName
      store.settings.dataDir = sourceRoot
      store.settings.installerCompleted = true
      if (!saveStoreToPath(store, sourceRoot)) throw new Error('Falha ao atualizar as configuracoes.')
      if (!setConfig({
        ...config,
        version: 2,
        dataDir: sourceRoot,
        installerCompleted: true,
        storageLayoutVersion: CURRENT_STORAGE_LAYOUT_VERSION,
        dedicatedStorageCompleted: true,
        dedicatedStorageCompletedAt: config.dedicatedStorageCompletedAt ?? new Date().toISOString(),
        migrationState: 'completed',
        migrationSourceDir: config.migrationSourceDir ?? null,
        migrationError: null,
      })) throw new Error('Falha ao persistir a configuracao do armazenamento dedicado.')
      return { success: true, dataRoot: sourceRoot, summary: summarizeStore(store), warnings }
    }

    if (fs.existsSync(targetRoot) && isDedicatedStorageRoot(targetRoot)) {
      const marker = readJsonFile(getStorageMarkerPath(targetRoot)) as { state?: string; sourcePath?: string } | null
      const sourceStore = loadStoreFromPath(sourceRoot)
      const targetStore = loadStoreFromPath(targetRoot)
      const sourceSummary = summarizeStore(sourceStore)
      const targetSummary = summarizeStore(targetStore)
      const countsMatch = (Object.keys(sourceSummary) as Array<keyof StorageSummary>)
        .every(key => sourceSummary[key] === targetSummary[key])
      const notesComplete = targetStore.notes.every(note => fs.existsSync(path.join(getNotesDir(targetRoot), note.mdPath)))
      const sourceMatches = marker?.sourcePath && path.resolve(marker.sourcePath).toLowerCase() === path.resolve(sourceRoot).toLowerCase()

      if (marker?.state === 'completed' && sourceMatches && countsMatch && notesComplete) {
        if (!setConfig({
          ...config,
          version: 2,
          dataDir: targetRoot,
          installerCompleted: true,
          storageLayoutVersion: CURRENT_STORAGE_LAYOUT_VERSION,
          dedicatedStorageCompleted: true,
          dedicatedStorageCompletedAt: config.dedicatedStorageCompletedAt ?? new Date().toISOString(),
          migrationState: 'completed',
          migrationSourceDir: sourceRoot,
          migrationError: null,
        })) throw new Error('A migracao foi validada, mas o novo caminho nao pôde ser ativado.')
        return { success: true, dataRoot: targetRoot, summary: targetSummary, markdownFiles: targetStore.notes.length, recoveredFiles: 0, warnings }
      }
    }

    if (fs.existsSync(targetRoot) && fs.readdirSync(targetRoot).length > 0) {
      throw new Error('A pasta escolhida ja contem arquivos. Escolha uma pasta vazia ou a pasta Organon sugerida.')
    }

    if (!setConfig({ ...config, migrationState: 'analyzing', migrationSourceDir: sourceRoot, migrationError: null })) {
      throw new Error('Nao foi possivel iniciar a migracao com seguranca.')
    }
    const sourceStore = loadStoreFromPath(sourceRoot)
    const sourceSummary = summarizeStore(sourceStore)
    const preUpdateBackup = createBackup(sourceRoot, 'pre-update')
    if (!preUpdateBackup.success) {
      throw new Error(`A migracao foi cancelada porque o backup preventivo falhou: ${preUpdateBackup.error}`)
    }

    if (!setConfig({ ...getConfig(), migrationState: 'copying' })) throw new Error('Falha ao registrar a etapa de copia.')
    createStorageTree(stagingRoot)
    writeStorageMarker(stagingRoot, 'copying', sourceRoot)

    const sourceNotesDir = getNotesDir(sourceRoot)
    const targetNotesDir = getNotesDir(stagingRoot)
    const folderSegments = buildFolderSegments(sourceStore.noteFolders)
    const copiedSources = new Set<string>()
    let markdownFiles = 0

    const migratedStore: Store = {
      ...sourceStore,
      notes: sourceStore.notes.map(note => {
        const folderPath = note.folderId ? (folderSegments.get(note.folderId) ?? []) : ['Sem pasta']
        const fileName = `${sanitizeSegment(note.title, 'Sem titulo')}--${note.id.slice(0, 8)}.md`
        const relativePath = path.join(...folderPath, fileName)
        const destination = path.join(targetNotesDir, relativePath)
        ensureDataDir(path.dirname(destination))

        const source = resolveLegacyNoteFile(sourceNotesDir, note.mdPath, note.id)
        if (source) {
          fs.copyFileSync(source, destination)
          copiedSources.add(path.resolve(source).toLowerCase())
        } else {
          fs.writeFileSync(destination, '', 'utf-8')
          warnings.push(`Conteudo ausente para a nota: ${note.title}`)
        }
        markdownFiles++
        return { ...note, mdPath: relativePath }
      }),
      settings: {
        ...sourceStore.settings,
        themeName,
        dataDir: targetRoot,
        installerCompleted: true,
      },
    }

    const recoveredDir = path.join(targetNotesDir, '_Recuperados')
    let recoveredFiles = 0
    for (const file of listFilesRecursive(sourceNotesDir).filter(item => /\.md$/i.test(item))) {
      if (copiedSources.has(path.resolve(file).toLowerCase())) continue
      ensureDataDir(recoveredDir)
      const destination = path.join(recoveredDir, path.basename(file))
      fs.copyFileSync(file, destination)
      recoveredFiles++
    }

    const sourceMeetingsDir = getMeetingsDir(sourceRoot)
    if (fs.existsSync(sourceMeetingsDir)) {
      for (const file of listFilesRecursive(sourceMeetingsDir)) {
        const relative = path.relative(sourceMeetingsDir, file)
        const destination = path.join(getMeetingsDir(stagingRoot), relative)
        ensureDataDir(path.dirname(destination))
        fs.copyFileSync(file, destination)
      }
    }

    if (!saveStoreToPath(migratedStore, stagingRoot)) {
      throw new Error('Falha ao gravar os indices no novo armazenamento.')
    }

    if (!setConfig({ ...getConfig(), migrationState: 'validating' })) throw new Error('Falha ao registrar a etapa de validacao.')
    writeStorageMarker(stagingRoot, 'validating', sourceRoot)
    const validatedStore = loadStoreFromPath(stagingRoot)
    const validatedSummary = summarizeStore(validatedStore)
    for (const key of Object.keys(sourceSummary) as Array<keyof StorageSummary>) {
      if (sourceSummary[key] !== validatedSummary[key]) {
        throw new Error(`Validacao falhou em ${key}: esperado ${sourceSummary[key]}, encontrado ${validatedSummary[key]}.`)
      }
    }
    const missingNotes = validatedStore.notes.filter(note => !fs.existsSync(path.join(getNotesDir(stagingRoot), note.mdPath)))
    if (missingNotes.length > 0) {
      throw new Error(`${missingNotes.length} nota(s) ficaram sem arquivo durante a migracao.`)
    }

    writeStorageMarker(stagingRoot, 'completed', sourceRoot)
    if (fs.existsSync(targetRoot)) fs.rmdirSync(targetRoot)
    fs.renameSync(stagingRoot, targetRoot)

    if (!setConfig({
      ...getConfig(),
      version: 2,
      dataDir: targetRoot,
      installerCompleted: true,
      storageLayoutVersion: CURRENT_STORAGE_LAYOUT_VERSION,
      dedicatedStorageCompleted: true,
      dedicatedStorageCompletedAt: new Date().toISOString(),
      migrationState: 'completed',
      migrationSourceDir: sourceRoot,
      migrationError: null,
    })) throw new Error('Os dados foram migrados, mas o novo caminho nao pôde ser ativado com seguranca.')

    return {
      success: true,
      dataRoot: targetRoot,
      summary: validatedSummary,
      markdownFiles,
      recoveredFiles,
      warnings,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    setConfig({ ...getConfig(), migrationState: 'failed', migrationSourceDir: sourceRoot, migrationError: message })
    return { success: false, error: message, warnings }
  }
}
