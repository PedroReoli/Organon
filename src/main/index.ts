import { app, BrowserWindow, clipboard, dialog, ipcMain, shell } from 'electron'
import type { OpenDialogOptions } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { pathToFileURL } from 'url'
if (!app.isPackaged) {
  try { require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') }) } catch {}
}

// Tipos para o store
interface CardLocation {
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | null
  period: 'morning' | 'afternoon' | 'night' | null
}

interface Card {
  id: string
  title: string
  descriptionHtml: string
  location: CardLocation
  order: number
  date: string | null
  hasDate: boolean
  createdAt: string
  updatedAt: string
}

type ShortcutKind = 'url'
type LegacyShortcutKind = 'url' | 'path' | 'clipboard'

interface ShortcutFolder {
  id: string
  name: string
  parentId: string | null
  order: number
}

interface ShortcutItem {
  id: string
  folderId: string | null
  title: string
  kind: ShortcutKind
  value: string
  order: number
}

interface PathItem {
  id: string
  title: string
  path: string
  order: number
}

type ShortcutItemInput = Omit<ShortcutItem, 'kind'> & { kind?: LegacyShortcutKind }

type ThemeName = 'dark-default' | 'dark-vscode' | 'light-1' | 'light-2'

interface CalendarEvent {
  id: string
  title: string
  date: string
  description: string
  color: string
  createdAt: string
  updatedAt: string
}

interface NoteFolder {
  id: string
  name: string
  parentId: string | null
  order: number
}

interface Note {
  id: string
  title: string
  mdPath: string
  folderId: string | null
  createdAt: string
  updatedAt: string
  order: number
}

interface ColorPalette {
  id: string
  name: string
  colors: string[]
  createdAt: string
  updatedAt: string
  order: number
}

interface ClipboardItem {
  id: string
  title: string
  content: string
  isPinned: boolean
  createdAt: string
  updatedAt: string
  order: number
}

interface FileItem {
  id: string
  name: string
  path: string
  type: 'image' | 'pdf' | 'docx' | 'other'
  size: number
  createdAt: string
}

interface AppItem {
  id: string
  name: string
  exePath: string
  iconPath: string | null
  order: number
}

interface AppMacro {
  id: string
  name: string
  appIds: string[]
  mode: 'sequential' | 'simultaneous'
  order: number
}

interface Settings {
  themeName: ThemeName
  dataDir: string | null
  installerCompleted: boolean
  weekStart: string | null
  keyboardShortcuts?: Array<{
    id: string
    action: string
    description: string
    keys: {
      ctrl?: boolean
      shift?: boolean
      alt?: boolean
      meta?: boolean
      key: string
    }
  }>
  backupEnabled?: boolean
  backupIntervalMinutes?: number
}

interface Habit {
  id: string
  name: string
  type: 'boolean' | 'count' | 'time' | 'quantity'
  target: number
  frequency: 'daily' | 'weekly'
  weeklyTarget: number
  weekDays: number[]
  trigger: string
  reason: string
  minimumTarget: number
  color: string
  order: number
  createdAt: string
}

interface HabitEntry {
  id: string
  habitId: string
  date: string
  value: number
  skipped: boolean
  skipReason: string
}

interface Bill {
  id: string
  name: string
  amount: number
  dueDay: number
  category: string
  recurrence: 'monthly' | 'yearly'
  isPaid: boolean
  paidDate: string | null
  createdAt: string
}

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
  installments: number
  currentInstallment: number
  parentId: string | null
  note: string
  createdAt: string
}

interface BudgetCategory {
  category: string
  limit: number
}

interface IncomeEntry {
  id: string
  source: string
  amount: number
  date: string
  kind: 'fixed' | 'extra'
  recurrenceMonths: number
  recurrenceIndex: number
  recurrenceGroupId: string | null
  note: string
  createdAt: string
}

interface FinancialConfig {
  monthlyIncome: number
  monthlySpendingLimit: number
}

interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string | null
  createdAt: string
}

interface Project {
  id: string
  name: string
  path: string
  description: string
  color: string
  links: Array<{ id: string; label: string; url: string }>
  preferredIdeId: string | null
  createdAt: string
  updatedAt: string
  order: number
}

interface RegisteredIDE {
  id: string
  name: string
  exePath: string
  iconDataUrl: string | null
  args: string
  order: number
}

interface ClipboardCategory {
  id: string
  name: string
  order: number
}

interface QuickAccessItem {
  id: string
  view: string
  label: string
  order: number
}

interface Meeting {
  id: string
  title: string
  transcription: string
  audioPath: string | null
  duration: number
  createdAt: string
  updatedAt: string
}

interface StudyChecklistItem {
  id: string
  text: string
  done: boolean
}

interface StudyGoal {
  id: string
  title: string
  description: string
  priority: 'P1' | 'P2' | 'P3' | 'P4' | null
  status: 'todo' | 'in_progress' | 'blocked' | 'done'
  checklist: StudyChecklistItem[]
  linkedPlanningCardId: string | null
  createdAt: string
  updatedAt: string
}

interface StudyMediaItem {
  id: string
  title: string
  url: string
  kind: 'youtube' | 'audio'
  youtubeVideoId: string | null
  volume: number
  loop: boolean
  showDock: boolean
}

interface StudySessionLog {
  id: string
  completedAt: string
  focusSeconds: number
}

interface StudyState {
  wallpaperUrl: string
  focusMinutes: number
  breakMinutes: number
  muteSound: boolean
  mediaItems: StudyMediaItem[]
  goals: StudyGoal[]
  sessions: StudySessionLog[]
}

interface Store {
  version: number
  cards: Card[]
  shortcutFolders: ShortcutFolder[]
  shortcuts: ShortcutItem[]
  paths: PathItem[]
  projects: Project[]
  registeredIDEs: RegisteredIDE[]
  calendarEvents: CalendarEvent[]
  noteFolders: NoteFolder[]
  notes: Note[]
  colorPalettes: ColorPalette[]
  clipboardCategories: ClipboardCategory[]
  clipboardItems: ClipboardItem[]
  files: FileItem[]
  apps: AppItem[]
  macros: AppMacro[]
  habits: Habit[]
  habitEntries: HabitEntry[]
  bills: Bill[]
  expenses: Expense[]
  budgetCategories: BudgetCategory[]
  incomes: IncomeEntry[]
  financialConfig: FinancialConfig
  savingsGoals: SavingsGoal[]
  quickAccess: QuickAccessItem[]
  meetings: Meeting[]
  study: StudyState
  settings: Settings
}

interface AppConfig {
  version: number
  dataDir: string | null
  installerCompleted: boolean
}

// Caminhos e configuracoes
const getDefaultDataPath = (): string => {
  const isDev = !app.isPackaged
  if (isDev) {
    return path.join(__dirname, '..', '..', 'data')
  }
  return path.join(app.getPath('userData'), 'data')
}

const getConfigPath = (): string => {
  return path.join(app.getPath('userData'), 'config.json')
}

const getDefaultConfig = (): AppConfig => ({
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

const getConfig = (): AppConfig => {
  if (!cachedConfig) {
    cachedConfig = loadConfig()
  }
  return cachedConfig
}

const setConfig = (nextConfig: AppConfig): void => {
  cachedConfig = nextConfig
  saveConfig(nextConfig)
}

const getDataPath = (): string => {
  const config = getConfig()
  return config.dataDir ? config.dataDir : getDefaultDataPath()
}

const getStorePath = (dataPath: string): string => {
  return path.join(dataPath, 'store.json')
}

const getStoreDir = (dataPath: string): string => {
  return path.join(dataPath, 'store')
}

const STORE_SECTIONS: Array<{ fileName: string; keys: Array<keyof Store> }> = [
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

const ensureDataDir = (dataPath: string): void => {
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true })
  }
}

const copyDirMerge = (sourceDir: string, destDir: string, overwrite: boolean = false): { copied: number; skipped: number } => {
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
        // Recursivamente copiar subdiretórios
        const result = copyDirMerge(srcPath, dstPath, overwrite)
        copied += result.copied
        skipped += result.skipped
        continue
      }

      if (entry.isFile()) {
        // Se overwrite é true ou arquivo não existe, copia
        if (overwrite || !fs.existsSync(dstPath)) {
          fs.copyFileSync(srcPath, dstPath)
          copied++
        } else {
          // Se arquivo existe e não deve sobrescrever, cria cópia com sufixo
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
      }
    }

    return { copied, skipped }
  } catch (error) {
    console.error('Erro ao copiar diretorio:', error)
    return { copied, skipped }
  }
}

const getNotesDir = (dataPath: string): string => {
  return path.join(dataPath, 'notes')
}

const ensureNotesDir = (dataPath: string): void => {
  const notesDir = getNotesDir(dataPath)
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true })
  }
}

const safeResolveNotePath = (mdPath: string, dataPath: string): string => {
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

// Meetings helpers
const getMeetingsDir = (dataPath: string): string => {
  return path.join(dataPath, 'meetings')
}

const ensureMeetingsDir = (dataPath: string): void => {
  const meetingsDir = getMeetingsDir(dataPath)
  if (!fs.existsSync(meetingsDir)) {
    fs.mkdirSync(meetingsDir, { recursive: true })
  }
}

const safeResolveMeetingPath = (audioName: string, dataPath: string): string => {
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

const writeTextFileAtomic = (filePath: string, content: string): boolean => {
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
      // Ignora erro ao limpar
    }
    return false
  }
}

const deletePathIfExists = (targetPath: string): void => {
  if (!fs.existsSync(targetPath)) return
  const stat = fs.statSync(targetPath)
  if (stat.isDirectory()) {
    fs.rmSync(targetPath, { recursive: true, force: true })
  } else {
    fs.unlinkSync(targetPath)
  }
}

const readJsonFile = (filePath: string): unknown | null => {
  try {
    if (!fs.existsSync(filePath)) return null
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

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

  // Compat: versoes antigas salvaram colorPalettes dentro de notes.json.
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

const loadSectionedStoreFromRoot = (rootPath: string): Store | null => {
  const candidates = [path.join(rootPath, 'store'), rootPath]
  for (const candidate of candidates) {
    const partial = readSectionedStoreFromDir(candidate)
    if (partial) {
      return normalizeStore(partial)
    }
  }
  return null
}

const writeSectionedStoreToDir = (store: Store, dirPath: string): boolean => {
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

interface BackupManifest {
  formatVersion: number
  createdAt: string
  storeRoot: string
  jsonFiles: string[]
  sourceJsonFiles: string[]
  notesRoot: string
  filesRoot: string
  meetingsRoot: string
  notesLinkedBy: string
}

const getSectionJsonRelativePaths = (storeRoot: string): string[] => {
  const root = storeRoot.replace(/\\/g, '/').replace(/\/+$/g, '')
  const prefix = root.length > 0 ? `${root}/` : ''
  const sectionFiles = STORE_SECTIONS.map(section => `${prefix}${section.fileName}`)
  return [...sectionFiles, `${prefix}store.json`]
}

const createBackupManifest = (_backupPath: string, dataPath: string): BackupManifest => ({
  formatVersion: 1,
  createdAt: new Date().toISOString(),
  storeRoot: '',
  jsonFiles: getSectionJsonRelativePaths(''),
  sourceJsonFiles: getSectionJsonRelativePaths(path.join(dataPath, 'store').replace(/\\/g, '/')),
  notesRoot: 'notes',
  filesRoot: 'files',
  meetingsRoot: 'meetings',
  notesLinkedBy: 'notes.json -> notes[].mdPath',
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

const copyDirReplace = (sourceDir: string, destDir: string): void => {
  if (!fs.existsSync(sourceDir)) return
  deletePathIfExists(destDir)
  ensureDataDir(destDir)
  copyDirMerge(sourceDir, destDir, true)
}

const getPathSizeRecursive = (targetPath: string): number => {
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

const getFilesDir = (dataPath: string): string => {
  return path.join(dataPath, 'files')
}

const ensureFilesDir = (dataPath: string): void => {
  const filesDir = getFilesDir(dataPath)
  ensureDataDir(filesDir)
  ensureDataDir(path.join(filesDir, 'images'))
  ensureDataDir(path.join(filesDir, 'pdf'))
  ensureDataDir(path.join(filesDir, 'docx'))
  ensureDataDir(path.join(filesDir, 'other'))
}

const safeResolveFilePath = (relativePath: string, dataPath: string): string => {
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

const getFileTypeFromPath = (filePath: string): FileItem['type'] => {
  const ext = path.extname(filePath).toLowerCase()
  const imageExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'])
  if (imageExts.has(ext)) return 'image'
  if (ext === '.pdf') return 'pdf'
  if (ext === '.docx') return 'docx'
  return 'other'
}

const getFilesSubdirForType = (type: FileItem['type']): string => {
  if (type === 'image') return 'images'
  return type
}

const DEFAULT_STUDY_STATE: StudyState = {
  wallpaperUrl: '',
  focusMinutes: 25,
  breakMinutes: 5,
  muteSound: false,
  mediaItems: [],
  goals: [],
  sessions: [],
}

const clampStudyMinutes = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback
  return Math.min(180, Math.max(1, Math.round(value)))
}

const clampStudyVolume = (value: number): number => {
  if (!Number.isFinite(value)) return 0.6
  return Math.min(1, Math.max(0, value))
}

const normalizeStudyState = (input: Partial<StudyState> | null | undefined): StudyState => {
  const base = DEFAULT_STUDY_STATE
  const raw = input ?? {}

  const mediaItems: StudyMediaItem[] = Array.isArray(raw.mediaItems)
    ? raw.mediaItems
      .filter(item => item && typeof item.url === 'string')
      .map(item => ({
        id: item.id ?? randomUUID(),
        title: item.title ?? 'Midia',
        url: item.url ?? '',
        kind: item.kind === 'youtube' ? 'youtube' : 'audio',
        youtubeVideoId: item.youtubeVideoId ?? null,
        volume: clampStudyVolume(Number(item.volume)),
        loop: item.loop !== false,
        showDock: item.showDock !== false,
      }))
    : base.mediaItems

  const goals: StudyGoal[] = Array.isArray(raw.goals)
    ? raw.goals
      .filter(goal => goal && typeof goal.title === 'string' && goal.title.trim().length > 0)
      .map(goal => ({
        id: goal.id ?? randomUUID(),
        title: goal.title.trim(),
        description: goal.description ?? '',
        priority: goal.priority && ['P1', 'P2', 'P3', 'P4'].includes(goal.priority) ? goal.priority : null,
        status: goal.status && ['todo', 'in_progress', 'blocked', 'done'].includes(goal.status) ? goal.status : 'todo',
        checklist: Array.isArray(goal.checklist)
          ? goal.checklist
            .map(item => ({
              id: item.id ?? randomUUID(),
              text: item.text ?? '',
              done: Boolean(item.done),
            }))
            .filter(item => item.text.trim().length > 0)
          : [],
        linkedPlanningCardId: goal.linkedPlanningCardId ?? null,
        createdAt: goal.createdAt ?? new Date().toISOString(),
        updatedAt: goal.updatedAt ?? new Date().toISOString(),
      }))
    : base.goals

  const sessions: StudySessionLog[] = Array.isArray(raw.sessions)
    ? raw.sessions
      .filter(session => session && typeof session.completedAt === 'string')
      .map(session => ({
        id: session.id ?? randomUUID(),
        completedAt: session.completedAt,
        focusSeconds: Math.max(0, Number(session.focusSeconds) || 0),
      }))
    : base.sessions

  return {
    wallpaperUrl: typeof raw.wallpaperUrl === 'string' ? raw.wallpaperUrl : base.wallpaperUrl,
    focusMinutes: clampStudyMinutes(Number(raw.focusMinutes), base.focusMinutes),
    breakMinutes: clampStudyMinutes(Number(raw.breakMinutes), base.breakMinutes),
    muteSound: Boolean(raw.muteSound),
    mediaItems,
    goals,
    sessions,
  }
}

const getDefaultStore = (): Store => ({
  version: 10,
  cards: [],
  shortcutFolders: [],
  shortcuts: [],
  paths: [],
  projects: [],
  registeredIDEs: [],
  calendarEvents: [],
  noteFolders: [],
  notes: [],
  colorPalettes: [],
  clipboardCategories: [],
  clipboardItems: [],
  files: [],
  apps: [],
  macros: [],
  habits: [],
  habitEntries: [],
  bills: [],
  expenses: [],
  budgetCategories: [],
  incomes: [],
  financialConfig: {
    monthlyIncome: 0,
    monthlySpendingLimit: 0,
  },
  savingsGoals: [],
  quickAccess: [],
  meetings: [],
  study: { ...DEFAULT_STUDY_STATE },
  settings: {
    themeName: 'dark-default',
    dataDir: null,
    installerCompleted: false,
    weekStart: null,
    backupEnabled: true,
    backupIntervalMinutes: 15,
  },
})

const normalizeStore = (input: Partial<Store> | null): Store => {
  const base = getDefaultStore()
  if (!input || typeof input !== 'object') return base
  const settings = input.settings ?? base.settings
  const rawShortcuts = Array.isArray(input.shortcuts)
    ? (input.shortcuts as ShortcutItemInput[])
    : (base.shortcuts as ShortcutItemInput[])
  const rawPaths = Array.isArray((input as Partial<Store> & { paths?: PathItem[] }).paths)
    ? (input as Partial<Store> & { paths?: PathItem[] }).paths as PathItem[]
    : base.paths

  const migratedPaths: PathItem[] = []
  const normalizedShortcuts = rawShortcuts.reduce<ShortcutItem[]>((acc, shortcut) => {
    const kind: LegacyShortcutKind = shortcut.kind ?? 'url'
    if (kind === 'path') {
      migratedPaths.push({
        id: shortcut.id,
        title: shortcut.title,
        path: shortcut.value,
        order: shortcut.order,
      })
      return acc
    }
    if (kind === 'url') {
      acc.push({ ...shortcut, kind: 'url' })
    }
    return acc
  }, [])

  const normalizedPaths = [...rawPaths, ...migratedPaths].filter(item => item && item.path)
  const normalizedFolders = Array.isArray(input.shortcutFolders)
    ? input.shortcutFolders.map(folder => ({
      ...folder,
      parentId: (folder as ShortcutFolder & { parentId?: string | null }).parentId ?? null,
    }))
    : base.shortcutFolders

  // Migrar do formato antigo (theme objeto) para novo (themeName)
  type OldSettings = {
    theme?: { primary?: string }
    themeName?: ThemeName
    dataDir?: string | null
    installerCompleted?: boolean
    weekStart?: string | null
    keyboardShortcuts?: Array<{
      id: string
      action: string
      description: string
      keys: {
        ctrl?: boolean
        shift?: boolean
        alt?: boolean
        meta?: boolean
        key: string
      }
    }>
    backupEnabled?: boolean
    backupIntervalMinutes?: number
  }
  const oldSettings = settings as OldSettings
  let themeName: ThemeName = base.settings.themeName
  if (oldSettings?.themeName) {
    themeName = oldSettings.themeName
  }

  return {
    ...base,
    ...input,
    version: 10,
    cards: Array.isArray(input.cards) ? input.cards : base.cards,
    shortcutFolders: normalizedFolders,
    shortcuts: normalizedShortcuts,
    paths: normalizedPaths,
    projects: Array.isArray(input.projects) ? input.projects : base.projects,
    registeredIDEs: Array.isArray(input.registeredIDEs) ? input.registeredIDEs : base.registeredIDEs,
    calendarEvents: Array.isArray(input.calendarEvents) ? input.calendarEvents : base.calendarEvents,
    noteFolders: Array.isArray(input.noteFolders) ? input.noteFolders : base.noteFolders,
    notes: Array.isArray(input.notes) ? input.notes : base.notes,
    colorPalettes: Array.isArray((input as Partial<Store> & { colorPalettes?: ColorPalette[] }).colorPalettes)
      ? (input as Partial<Store> & { colorPalettes?: ColorPalette[] }).colorPalettes as ColorPalette[]
      : base.colorPalettes,
    clipboardCategories: Array.isArray(input.clipboardCategories) ? input.clipboardCategories : base.clipboardCategories,
    clipboardItems: Array.isArray(input.clipboardItems) ? input.clipboardItems : base.clipboardItems,
    files: Array.isArray(input.files) ? input.files : base.files,
    apps: Array.isArray(input.apps) ? input.apps : base.apps,
    macros: Array.isArray(input.macros) ? input.macros : base.macros,
    habits: Array.isArray(input.habits) ? input.habits : base.habits,
    habitEntries: Array.isArray(input.habitEntries) ? input.habitEntries : base.habitEntries,
    bills: Array.isArray(input.bills) ? input.bills : base.bills,
    expenses: Array.isArray(input.expenses) ? input.expenses : base.expenses,
    budgetCategories: Array.isArray(input.budgetCategories) ? input.budgetCategories : base.budgetCategories,
    incomes: Array.isArray((input as Partial<Store> & { incomes?: IncomeEntry[] }).incomes)
      ? (input as Partial<Store> & { incomes?: IncomeEntry[] }).incomes as IncomeEntry[]
      : base.incomes,
    financialConfig: {
      monthlyIncome: (input as Partial<Store> & { financialConfig?: FinancialConfig }).financialConfig?.monthlyIncome ?? base.financialConfig.monthlyIncome,
      monthlySpendingLimit: (input as Partial<Store> & { financialConfig?: FinancialConfig }).financialConfig?.monthlySpendingLimit ?? base.financialConfig.monthlySpendingLimit,
    },
    savingsGoals: Array.isArray(input.savingsGoals) ? input.savingsGoals : base.savingsGoals,
    quickAccess: Array.isArray(input.quickAccess) ? input.quickAccess : base.quickAccess,
    meetings: Array.isArray(input.meetings) ? input.meetings : base.meetings,
    study: normalizeStudyState((input as Partial<Store> & { study?: Partial<StudyState> }).study),
    settings: {
      themeName,
      dataDir: oldSettings?.dataDir ?? base.settings.dataDir,
      installerCompleted: oldSettings?.installerCompleted ?? base.settings.installerCompleted,
      weekStart: oldSettings?.weekStart ?? base.settings.weekStart,
      keyboardShortcuts: oldSettings?.keyboardShortcuts ?? base.settings.keyboardShortcuts,
      backupEnabled: oldSettings?.backupEnabled ?? true,
      backupIntervalMinutes: oldSettings?.backupIntervalMinutes ?? base.settings.backupIntervalMinutes,
    },
  }
}

const loadStoreFromPath = (dataPath: string): Store => {
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
      .filter(entry => (entry.name.startsWith('store-backup-') || entry.name.startsWith('store-safety-')))
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

const saveStoreToPath = (store: Store, dataPath: string): boolean => {
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

    // Mantem uma copia do ultimo store valido antes de sobrescrever o principal.
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

    // Snapshot de seguranca com baixa frequencia para evitar excesso de arquivos.
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
        .filter(f => f.startsWith('store-safety-'))
        .map(f => ({
          path: path.join(getBackupDir(dataPath), f),
          time: fs.statSync(path.join(getBackupDir(dataPath), f)).mtimeMs,
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

const loadStore = (): Store => {
  return loadStoreFromPath(getDataPath())
}

const saveStore = (store: Store): boolean => {
  return saveStoreToPath(store, getDataPath())
}

// Backup helpers
const getBackupDir = (dataPath: string): string => {
  return path.join(dataPath, 'backups')
}

const ensureBackupDir = (dataPath: string): void => {
  const backupDir = getBackupDir(dataPath)
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
}

const createBackup = (dataPath: string): { success: boolean; backupPath?: string; error?: string } => {
  try {
    ensureBackupDir(dataPath)
    const store = loadStoreFromPath(dataPath)

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const backupFileName = `store-backup-${timestamp}`
    const backupPath = path.join(getBackupDir(dataPath), backupFileName)
    ensureDataDir(backupPath)

    writeSectionedStoreToDir(store, backupPath)
    writeTextFileAtomic(path.join(backupPath, 'store.json'), JSON.stringify(store, null, 2))
    const manifest = createBackupManifest(backupPath, dataPath)
    writeTextFileAtomic(path.join(backupPath, 'backup.json'), JSON.stringify(manifest, null, 2))
    copyDirMerge(path.join(dataPath, 'notes'), path.join(backupPath, 'notes'), true)
    copyDirMerge(path.join(dataPath, 'files'), path.join(backupPath, 'files'), true)
    copyDirMerge(path.join(dataPath, 'meetings'), path.join(backupPath, 'meetings'), true)
    
    // Limpar backups antigos (manter apenas os 50 mais recentes)
    const backupDir = getBackupDir(dataPath)
    const backups = fs.readdirSync(backupDir, { withFileTypes: true })
      .filter(entry => entry.name.startsWith('store-backup-'))
      .map(entry => ({
        name: entry.name,
        path: path.join(backupDir, entry.name),
        time: fs.statSync(path.join(backupDir, entry.name)).mtimeMs
      }))
      .sort((a, b) => b.time - a.time)

    // Remover backups além dos 50 mais recentes
    if (backups.length > 50) {
      for (const oldBackup of backups.slice(50)) {
        try {
          deletePathIfExists(oldBackup.path)
        } catch {
          // Ignora erros ao deletar backups antigos
        }
      }
    }

    return { success: true, backupPath }
  } catch (error) {
    console.error('Erro ao criar backup:', error)
    return { success: false, error: String(error) }
  }
}

const listBackups = (dataPath: string): Array<{ name: string; path: string; date: string; size: number }> => {
  try {
    const backupDir = getBackupDir(dataPath)
    if (!fs.existsSync(backupDir)) {
      return []
    }

    const backups = fs.readdirSync(backupDir, { withFileTypes: true })
      .filter(entry => entry.name.startsWith('store-backup-'))
      .map(entry => {
        const backupPath = path.join(backupDir, entry.name)
        const stats = fs.statSync(backupPath)
        return {
          name: entry.name,
          path: backupPath,
          date: stats.mtime.toISOString(),
          size: entry.isDirectory() ? getPathSizeRecursive(backupPath) : stats.size
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Auto-delete: if the newest backup is within 2 days, delete all backups older than 2 days
    if (backups.length > 0) {
      const now = Date.now()
      const twoDaysMs = 2 * 24 * 60 * 60 * 1000
      const newestAge = now - new Date(backups[0].date).getTime()

      if (newestAge < twoDaysMs) {
        const toDelete = backups.filter(b => now - new Date(b.date).getTime() > twoDaysMs)
        for (const backup of toDelete) {
          try {
            const stat = fs.statSync(backup.path)
            if (stat.isDirectory()) {
              fs.rmSync(backup.path, { recursive: true, force: true })
            } else {
              fs.unlinkSync(backup.path)
            }
          } catch (e) {
            console.error('Erro ao deletar backup antigo:', e)
          }
        }
        return backups.filter(b => now - new Date(b.date).getTime() <= twoDaysMs)
      }
    }

    return backups
  } catch (error) {
    console.error('Erro ao listar backups:', error)
    return []
  }
}

const restoreBackup = (backupPath: string, dataPath: string): { success: boolean; error?: string } => {
  try {
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: 'Backup nao encontrado' }
    }

    const isDirBackup = fs.statSync(backupPath).isDirectory()
    const hasBackupManifest = isDirBackup && fs.existsSync(path.join(backupPath, 'backup.json'))
    const recovered = isDirBackup
      ? (loadStoreFromBackupManifest(backupPath) ?? loadSectionedStoreFromRoot(backupPath))
      : (() => {
        const parsed = readJsonFile(backupPath)
        if (!parsed || typeof parsed !== 'object') return null
        return normalizeStore(parsed as Partial<Store>)
      })()

    if (!recovered) {
      return { success: false, error: 'Backup invalido (JSON corrompido)' }
    }

    // Criar backup do store atual antes de restaurar
    if (fs.existsSync(getStorePath(dataPath)) || fs.existsSync(getStoreDir(dataPath))) {
      createBackup(dataPath)
    }

    // Restaurar backup
    saveStoreToPath(recovered, dataPath)
    if (isDirBackup) {
      const backupNotesDir = path.join(backupPath, 'notes')
      const backupFilesDir = path.join(backupPath, 'files')
      const backupMeetingsDir = path.join(backupPath, 'meetings')
      const currentNotesDir = path.join(dataPath, 'notes')
      const currentFilesDir = path.join(dataPath, 'files')
      const currentMeetingsDir = path.join(dataPath, 'meetings')

      if (fs.existsSync(backupNotesDir)) {
        copyDirReplace(backupNotesDir, currentNotesDir)
      } else if (hasBackupManifest) {
        deletePathIfExists(currentNotesDir)
      }

      if (fs.existsSync(backupFilesDir)) {
        copyDirReplace(backupFilesDir, currentFilesDir)
      } else if (hasBackupManifest) {
        deletePathIfExists(currentFilesDir)
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

const mergeDataFromOldPath = (oldDataPath: string, currentDataPath: string): { success: boolean; merged: number; error?: string } => {
  try {
    if (!fs.existsSync(oldDataPath)) {
      return { success: false, error: 'Pasta antiga não encontrada', merged: 0 }
    }

    let merged = 0

    // Carregar store antigo
    const oldStorePath = path.join(oldDataPath, 'store.json')
    const currentStore = loadStoreFromPath(currentDataPath)
    let oldStore: Store | null = null

    if (fs.existsSync(oldStorePath)) {
      try {
        oldStore = loadStoreFromPath(oldDataPath)
      } catch (error) {
        console.error('Erro ao carregar store antigo:', error)
      }
    }

    // Mesclar dados do store (se existir)
    if (oldStore) {
      // Função auxiliar para mesclar arrays com id
      const mergeArraysById = <T extends { id: string }>(current: T[], old: T[]): T[] => {
        const currentIds = new Set(current.map(item => item.id))
        return [...current, ...old.filter(item => !currentIds.has(item.id))]
      }

      // Função específica para BudgetCategory (usa category como chave única)
      const mergeBudgetCategories = (current: BudgetCategory[], old: BudgetCategory[]): BudgetCategory[] => {
        const currentCategories = new Set(current.map(item => item.category))
        return [...current, ...old.filter(item => !currentCategories.has(item.category))]
      }

      const hasStudyContent = (value: StudyState): boolean => (
        value.wallpaperUrl.trim().length > 0 ||
        value.mediaItems.length > 0 ||
        value.goals.length > 0 ||
        value.sessions.length > 0 ||
        value.focusMinutes !== DEFAULT_STUDY_STATE.focusMinutes ||
        value.breakMinutes !== DEFAULT_STUDY_STATE.breakMinutes ||
        value.muteSound !== DEFAULT_STUDY_STATE.muteSound
      )

      const mergedStudy = hasStudyContent(currentStore.study)
        ? currentStore.study
        : oldStore.study

      const mergedStore: Store = {
        ...currentStore,
        // Mesclar todos os arrays
        cards: mergeArraysById(currentStore.cards, oldStore.cards),
        shortcutFolders: mergeArraysById(currentStore.shortcutFolders, oldStore.shortcutFolders),
        shortcuts: mergeArraysById(currentStore.shortcuts, oldStore.shortcuts),
        paths: mergeArraysById(currentStore.paths, oldStore.paths),
        projects: mergeArraysById(currentStore.projects, oldStore.projects),
        registeredIDEs: mergeArraysById(currentStore.registeredIDEs, oldStore.registeredIDEs),
        calendarEvents: mergeArraysById(currentStore.calendarEvents, oldStore.calendarEvents),
        noteFolders: mergeArraysById(currentStore.noteFolders, oldStore.noteFolders),
        notes: mergeArraysById(currentStore.notes, oldStore.notes),
        colorPalettes: mergeArraysById(currentStore.colorPalettes, oldStore.colorPalettes),
        clipboardCategories: mergeArraysById(currentStore.clipboardCategories, oldStore.clipboardCategories),
        clipboardItems: mergeArraysById(currentStore.clipboardItems, oldStore.clipboardItems),
        files: mergeArraysById(currentStore.files, oldStore.files),
        apps: mergeArraysById(currentStore.apps, oldStore.apps),
        macros: mergeArraysById(currentStore.macros, oldStore.macros),
        habits: mergeArraysById(currentStore.habits, oldStore.habits),
        habitEntries: mergeArraysById(currentStore.habitEntries, oldStore.habitEntries),
        bills: mergeArraysById(currentStore.bills, oldStore.bills),
        expenses: mergeArraysById(currentStore.expenses, oldStore.expenses),
        budgetCategories: mergeBudgetCategories(currentStore.budgetCategories, oldStore.budgetCategories),
        incomes: mergeArraysById(currentStore.incomes, oldStore.incomes),
        financialConfig: {
          monthlyIncome: currentStore.financialConfig.monthlyIncome > 0
            ? currentStore.financialConfig.monthlyIncome
            : oldStore.financialConfig.monthlyIncome,
          monthlySpendingLimit: currentStore.financialConfig.monthlySpendingLimit > 0
            ? currentStore.financialConfig.monthlySpendingLimit
            : oldStore.financialConfig.monthlySpendingLimit,
        },
        savingsGoals: mergeArraysById(currentStore.savingsGoals, oldStore.savingsGoals),
        quickAccess: mergeArraysById(currentStore.quickAccess, oldStore.quickAccess),
        meetings: mergeArraysById(currentStore.meetings, oldStore.meetings),
        study: mergedStudy,
        // Manter configurações do store atual
        settings: currentStore.settings,
      }

      merged = mergedStore.cards.length - currentStore.cards.length +
               mergedStore.notes.length - currentStore.notes.length +
               mergedStore.colorPalettes.length - currentStore.colorPalettes.length +
               mergedStore.calendarEvents.length - currentStore.calendarEvents.length +
               mergedStore.files.length - currentStore.files.length +
               mergedStore.habits.length - currentStore.habits.length +
               mergedStore.bills.length - currentStore.bills.length +
               mergedStore.expenses.length - currentStore.expenses.length +
               mergedStore.incomes.length - currentStore.incomes.length +
               mergedStore.meetings.length - currentStore.meetings.length

      saveStoreToPath(mergedStore, currentDataPath)
    }

    // Copiar TODOS os arquivos físicos recursivamente de todas as pastas padrão
    // Navega pelas pastas padrão do sistema e copia tudo recursivamente
    const directoriesToCopy = [
      'store',      // Nova pasta com JSONs por tela
      'notes',      // Pasta de notas (.md)
      'files',      // Pasta de arquivos (images, pdf, docx, other)
      'meetings',   // Pasta de reuniões/áudios
      'backups',    // Pasta de backups
    ]

    let totalFilesCopied = 0
    let totalFilesSkipped = 0

    for (const dirName of directoriesToCopy) {
      const oldDir = path.join(oldDataPath, dirName)
      const currentDir = path.join(currentDataPath, dirName)
      
      if (fs.existsSync(oldDir) && fs.statSync(oldDir).isDirectory()) {
        try {
          console.log(`Copiando pasta ${dirName}...`)
          // Copia tudo recursivamente, criando cópias com sufixo se arquivo já existir
          const result = copyDirMerge(oldDir, currentDir, false)
          totalFilesCopied += result.copied
          totalFilesSkipped += result.skipped
          console.log(`Pasta ${dirName}: ${result.copied} arquivos copiados, ${result.skipped} pulados`)
        } catch (error) {
          console.error(`Erro ao copiar pasta ${dirName}:`, error)
        }
      } else {
        console.log(`Pasta ${dirName} não encontrada ou não é diretório`)
      }
    }

    // Também copiar qualquer outro arquivo ou pasta na raiz da pasta de dados
    // (exceto as pastas já processadas e store.json)
    try {
      if (fs.existsSync(oldDataPath)) {
        const rootEntries = fs.readdirSync(oldDataPath, { withFileTypes: true })
        for (const entry of rootEntries) {
          // Pular pastas já processadas e store.json (já processado)
          if (entry.isDirectory() && directoriesToCopy.includes(entry.name)) {
            continue
          }
          if (entry.isFile() && entry.name === 'store.json') {
            continue
          }

          const srcPath = path.join(oldDataPath, entry.name)
          const dstPath = path.join(currentDataPath, entry.name)

          if (entry.isDirectory()) {
            console.log(`Copiando pasta adicional: ${entry.name}`)
            const result = copyDirMerge(srcPath, dstPath, false)
            totalFilesCopied += result.copied
            totalFilesSkipped += result.skipped
          } else if (entry.isFile()) {
            if (!fs.existsSync(dstPath)) {
              fs.copyFileSync(srcPath, dstPath)
              totalFilesCopied++
            } else {
              // Criar cópia com sufixo
              const ext = path.extname(entry.name)
              const baseName = path.basename(entry.name, ext)
              let counter = 1
              let newDstPath = dstPath
              while (fs.existsSync(newDstPath)) {
                newDstPath = path.join(currentDataPath, `${baseName}-copy${counter}${ext}`)
                counter++
              }
              fs.copyFileSync(srcPath, newDstPath)
              totalFilesCopied++
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao copiar arquivos da raiz:', error)
    }

    console.log(`Total: ${totalFilesCopied} arquivos copiados, ${totalFilesSkipped} pulados`)

    // Copiar store.json também (como backup adicional)
    if (fs.existsSync(oldStorePath)) {
      const backupStorePath = path.join(currentDataPath, 'store-old-backup.json')
      try {
        fs.copyFileSync(oldStorePath, backupStorePath)
      } catch (error) {
        console.error('Erro ao copiar store antigo como backup:', error)
      }
    }

    return { success: true, merged }
  } catch (error) {
    console.error('Erro ao mesclar dados:', error)
    return { success: false, error: String(error), merged: 0 }
  }
}

// Timer de backup automático
let backupTimer: NodeJS.Timeout | null = null

const startBackupTimer = (intervalMinutes: number): void => {
  if (backupTimer) {
    clearInterval(backupTimer)
  }

  if (intervalMinutes <= 0) {
    return
  }

  const intervalMs = intervalMinutes * 60 * 1000
  backupTimer = setInterval(() => {
    const result = createBackup(getDataPath())
    if (result.success) {
      console.log('Backup automático criado:', result.backupPath)
    } else {
      console.error('Erro no backup automático:', result.error)
    }
  }, intervalMs)
}

const stopBackupTimer = (): void => {
  if (backupTimer) {
    clearInterval(backupTimer)
    backupTimer = null
  }
}

// Configuracao da janela principal
let mainWindow: BrowserWindow | null = null

const createWindow = (): void => {
  // Caminho do ícone - em dev usa src, em produção usa dist
  let iconPath: string | undefined
  if (app.isPackaged) {
    iconPath = path.join(process.resourcesPath, 'app', 'dist', 'renderer', 'images', 'logo.png')
  } else {
    // Em desenvolvimento, tenta vários caminhos possíveis
    const devPaths = [
      path.join(__dirname, '..', 'renderer', 'images', 'logo.png'),
      path.join(process.cwd(), 'src', 'renderer', 'images', 'logo.png'),
      path.join(__dirname, '..', '..', 'src', 'renderer', 'images', 'logo.png'),
    ]
    for (const devPath of devPaths) {
      if (fs.existsSync(devPath)) {
        iconPath = devPath
        break
      }
    }
    // Em desenvolvimento no Windows, o ícone pode não aparecer na barra de tarefas
    // Isso é normal e esperado - o ícone só aparece corretamente quando o app é empacotado
    if (!iconPath) {
      console.warn('Ícone não encontrado em desenvolvimento. Isso é normal - o ícone aparecerá quando o app for empacotado.')
    }
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    frame: false, // Remove frame nativo para titlebar customizada
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Organon',
    backgroundColor: '#0f172a',
    show: false, // Mostra apenas quando pronto
  })

  // Mostra janela quando pronta para evitar flash branco
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Em desenvolvimento, carrega do servidor Vite
  // Em producao, carrega do arquivo HTML buildado
  const isDev = !app.isPackaged
  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    mainWindow.loadURL(devServerUrl)
    if (process.env.ELECTRON_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools()
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

const openDirectoryPicker = async (): Promise<string | null> => {
  const options: OpenDialogOptions = {
    title: 'Selecionar pasta de dados',
    properties: ['openDirectory', 'createDirectory'],
  }

  const focused = BrowserWindow.getFocusedWindow() ?? mainWindow
  const result = focused
    ? await dialog.showOpenDialog(focused, options)
    : await dialog.showOpenDialog(options)

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
}

const openFolderPicker = async (): Promise<string | null> => {
  const options: OpenDialogOptions = {
    title: 'Selecionar pasta',
    properties: ['openDirectory'],
  }

  const focused = BrowserWindow.getFocusedWindow() ?? mainWindow
  const result = focused
    ? await dialog.showOpenDialog(focused, options)
    : await dialog.showOpenDialog(options)

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
}

// Registra os handlers IPC
const registerIpcHandlers = (): void => {
  ipcMain.handle('store:load', () => {
    return loadStore()
  })

  ipcMain.handle('external:open', (_event, url: string) => {
    return shell.openExternal(url).then(() => true).catch(() => false)
  })

  ipcMain.handle('path:open', (_event, targetPath: string) => {
    return shell.openPath(targetPath).then((result) => result === '')
  })

  ipcMain.handle('path:select', async () => {
    return openFolderPicker()
  })

  ipcMain.handle('path:readdir', (_event, dirPath: string) => {
    try {
      if (!dirPath || !fs.existsSync(dirPath)) return []
      const stat = fs.statSync(dirPath)
      if (!stat.isDirectory()) return []
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      return entries
        .map(entry => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
        }))
        .sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
          return a.name.localeCompare(b.name)
        })
    } catch {
      return []
    }
  })

  ipcMain.handle('path:rename', (_event, oldPath: string, newPath: string) => {
    try {
      if (!oldPath || !newPath || !fs.existsSync(oldPath)) return false
      fs.renameSync(oldPath, newPath)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('path:getFileUrl', (_event, absolutePath: string) => {
    if (!absolutePath) return ''
    const normalized = absolutePath.replace(/\\/g, '/')
    return `file:///${normalized}`
  })

  ipcMain.handle('clipboard:write', (_event, text: string) => {
    clipboard.writeText(text)
    return true
  })

  // Notes (conteudo em .md)
  ipcMain.handle('notes:read', (_event, mdPath: string) => {
    try {
      const absPath = safeResolveNotePath(mdPath, getDataPath())
      if (!fs.existsSync(absPath)) return ''
      return fs.readFileSync(absPath, 'utf-8')
    } catch (error) {
      console.error('Erro ao ler nota:', error)
      return ''
    }
  })

  ipcMain.handle('notes:write', (_event, mdPath: string, content: string) => {
    try {
      const absPath = safeResolveNotePath(mdPath, getDataPath())
      return writeTextFileAtomic(absPath, content ?? '')
    } catch (error) {
      console.error('Erro ao salvar nota:', error)
      return false
    }
  })

  ipcMain.handle('notes:delete', (_event, mdPath: string) => {
    try {
      const absPath = safeResolveNotePath(mdPath, getDataPath())
      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath)
      }
      return true
    } catch (error) {
      console.error('Erro ao remover nota:', error)
      return false
    }
  })

  // Meetings (gravação e transcrição)
  ipcMain.handle('meetings:saveAudio', (_event, meetingId: string, audioBase64: string) => {
    try {
      const dataPath = getDataPath()
      const audioName = `${meetingId}.webm`
      const absPath = safeResolveMeetingPath(audioName, dataPath)
      const buffer = Buffer.from(audioBase64, 'base64')
      fs.writeFileSync(absPath, buffer)
      return audioName
    } catch (error) {
      console.error('Erro ao salvar audio:', error)
      return null
    }
  })

  ipcMain.handle('meetings:deleteAudio', (_event, audioPath: string) => {
    try {
      const absPath = safeResolveMeetingPath(audioPath, getDataPath())
      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath)
      }
      return true
    } catch (error) {
      console.error('Erro ao remover audio:', error)
      return false
    }
  })

  ipcMain.handle('meetings:transcribe', async (_event, audioPath: string) => {
    try {
      const absPath = safeResolveMeetingPath(audioPath, getDataPath())
      if (!fs.existsSync(absPath)) {
        return '[Erro: arquivo de audio nao encontrado]'
      }

      const FormData = (await import('form-data')).default
      const http = await import('http')

      return await new Promise<string>((resolve) => {
        const form = new FormData()
        form.append('file', fs.createReadStream(absPath))
        form.append('response_format', 'text')

        const req = http.request(
          {
            hostname: '127.0.0.1',
            port: 8080,
            path: '/inference',
            method: 'POST',
            headers: form.getHeaders(),
          },
          (res) => {
            let data = ''
            res.on('data', (chunk: Buffer) => { data += chunk.toString() })
            res.on('end', () => {
              resolve(data.trim() || '[Transcricao vazia]')
            })
          },
        )

        req.on('error', () => {
          resolve('[Erro: whisper-server nao disponivel em localhost:8080. Inicie o servidor e tente novamente.]')
        })

        form.pipe(req)
      })
    } catch (error) {
      console.error('Erro na transcricao:', error)
      return '[Erro ao transcrever audio]'
    }
  })

  // Files (organizador local)
  ipcMain.handle('files:select', async () => {
    const focused = BrowserWindow.getFocusedWindow() ?? mainWindow
    const result = focused
      ? await dialog.showOpenDialog(focused, {
        title: 'Selecionar arquivos para importar',
        properties: ['openFile', 'multiSelections'],
      })
      : await dialog.showOpenDialog({
        title: 'Selecionar arquivos para importar',
        properties: ['openFile', 'multiSelections'],
      })

    if (result.canceled || result.filePaths.length === 0) {
      return []
    }

    return result.filePaths
  })

  ipcMain.handle('files:import', (_event, sourcePath: string) => {
    try {
      const dataPath = getDataPath()
      ensureFilesDir(dataPath)

      const type = getFileTypeFromPath(sourcePath)
      const subdir = getFilesSubdirForType(type)
      const id = randomUUID()
      const baseName = path.basename(sourcePath)
      const safeName = baseName.replace(/[<>:\"/\\\\|?*]+/g, '_')
      const relPath = `${subdir}/${id}-${safeName}`
      const absPath = safeResolveFilePath(relPath, dataPath)

      fs.copyFileSync(sourcePath, absPath)
      const stat = fs.statSync(absPath)

      const item: FileItem = {
        id,
        name: baseName,
        path: relPath,
        type,
        size: stat.size,
        createdAt: new Date().toISOString(),
      }

      return { success: true, item }
    } catch (error) {
      console.error('Erro ao importar arquivo:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('files:open', (_event, relativePath: string) => {
    try {
      const absPath = safeResolveFilePath(relativePath, getDataPath())
      return shell.openPath(absPath).then((result) => result === '')
    } catch (error) {
      console.error('Erro ao abrir arquivo:', error)
      return false
    }
  })

  ipcMain.handle('files:delete', (_event, relativePath: string) => {
    try {
      const absPath = safeResolveFilePath(relativePath, getDataPath())
      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath)
      }
      return true
    } catch (error) {
      console.error('Erro ao remover arquivo:', error)
      return false
    }
  })

  ipcMain.handle('files:getUrl', (_event, relativePath: string) => {
    try {
      const absPath = safeResolveFilePath(relativePath, getDataPath())
      return pathToFileURL(absPath).toString()
    } catch {
      return ''
    }
  })

  // Apps & Macros
  ipcMain.handle('apps:selectExe', async () => {
    const focused = BrowserWindow.getFocusedWindow() ?? mainWindow
    const result = focused
      ? await dialog.showOpenDialog(focused, {
        title: 'Selecionar executavel (.exe)',
        properties: ['openFile'],
        filters: [{ name: 'Executavel', extensions: ['exe'] }],
      })
      : await dialog.showOpenDialog({
        title: 'Selecionar executavel (.exe)',
        properties: ['openFile'],
        filters: [{ name: 'Executavel', extensions: ['exe'] }],
      })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const exePath = result.filePaths[0]
    const name = path.basename(exePath).replace(/\.exe$/i, '')
    let iconDataUrl: string | null = null

    try {
      const icon = await app.getFileIcon(exePath, { size: 'large' })
      iconDataUrl = icon.toDataURL()
    } catch {
      iconDataUrl = null
    }

    return { exePath, name, iconDataUrl }
  })

  const launchExe = (exePath: string): boolean => {
    try {
      const child = spawn(exePath, [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      })
      child.unref()
      return true
    } catch (error) {
      console.error('Erro ao abrir executavel:', error)
      return false
    }
  }

  ipcMain.handle('apps:launch', (_event, exePath: string) => {
    return launchExe(exePath)
  })

  ipcMain.handle('apps:launchWithArgs', (_event, exePath: string, args: string[]) => {
    try {
      const child = spawn(exePath, args || [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      })
      child.unref()
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('apps:launchMany', async (_event, exePaths: string[], mode: 'sequential' | 'simultaneous') => {
    try {
      const unique = Array.isArray(exePaths) ? exePaths.filter(Boolean) : []
      if (mode === 'sequential') {
        for (const exePath of unique) {
          launchExe(exePath)
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } else {
        for (const exePath of unique) {
          launchExe(exePath)
        }
      }
      return true
    } catch (error) {
      console.error('Erro ao executar macro:', error)
      return false
    }
  })

  ipcMain.handle('data:getDir', () => {
    const config = getConfig()
    return {
      current: getDataPath(),
      custom: config.dataDir,
    }
  })

  ipcMain.handle('data:setDir', (_event, nextDir: string | null) => {
    const currentConfig = getConfig()
    const currentPath = getDataPath()
    const currentStore = loadStoreFromPath(currentPath)

    const normalized = nextDir && nextDir.trim().length > 0 ? nextDir.trim() : null
    const nextPath = normalized ? normalized : getDefaultDataPath()

    if (currentPath === nextPath) {
      setConfig({ ...currentConfig, dataDir: normalized })
      return true
    }

    // Migra store.json + pastas dependentes (notes/ e files/) antes de trocar a config
    ensureDataDir(nextPath)
    const storeOk = saveStoreToPath(currentStore, nextPath)
    if (!storeOk) return false

    const notesResult = copyDirMerge(path.join(currentPath, 'notes'), path.join(nextPath, 'notes'))
    if (notesResult.copied === 0 && notesResult.skipped === 0) {
      // Pasta não existe ou vazia, não é erro
    }

    const filesResult = copyDirMerge(path.join(currentPath, 'files'), path.join(nextPath, 'files'))
    if (filesResult.copied === 0 && filesResult.skipped === 0) {
      // Pasta não existe ou vazia, não é erro
    }

    setConfig({ ...currentConfig, dataDir: normalized })
    return true
  })

  ipcMain.handle('data:selectDir', async () => {
    return openDirectoryPicker()
  })

  // Handlers para controle da janela
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })

  ipcMain.handle('window:close', () => {
    mainWindow?.close()
  })

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow?.isMaximized() ?? false
  })

  // Handlers do instalador
  ipcMain.handle('app:isPackaged', () => {
    return app.isPackaged
  })

  ipcMain.handle('app:isInstallerCompleted', () => {
    const config = getConfig()
    return config.installerCompleted
  })

  ipcMain.handle('app:completeInstaller', (_event, dataDir: string | null, themeName: ThemeName) => {
    try {
      // Atualizar config
      const config = getConfig()
      config.dataDir = dataDir
      config.installerCompleted = true
      setConfig(config)

      // Criar estrutura de diretórios
      const basePath = dataDir ?? getDefaultDataPath()
      const directories = [
        basePath,
        path.join(basePath, 'notes'),
        path.join(basePath, 'files'),
        path.join(basePath, 'files', 'images'),
        path.join(basePath, 'files', 'pdf'),
        path.join(basePath, 'files', 'docx'),
        path.join(basePath, 'files', 'other'),
      ]

      for (const dir of directories) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
      }

      // Criar store inicial com o tema selecionado
      const store = getDefaultStore()
      store.settings.themeName = themeName
      store.settings.dataDir = dataDir
      store.settings.installerCompleted = true
      saveStoreToPath(store, basePath)

      return { success: true }
    } catch (error) {
      console.error('Erro no instalador:', error)
      return { success: false, error: String(error) }
    }
  })

  // Backup handlers
  ipcMain.handle('backup:create', () => {
    return createBackup(getDataPath())
  })

  ipcMain.handle('backup:list', () => {
    return listBackups(getDataPath())
  })

  ipcMain.handle('backup:restore', (_event, backupPath: string) => {
    return restoreBackup(backupPath, getDataPath())
  })

  ipcMain.handle('backup:mergeFromPath', async (_event, oldDataPath: string) => {
    return mergeDataFromOldPath(oldDataPath, getDataPath())
  })

  ipcMain.handle('backup:selectOldPath', async () => {
    const focused = BrowserWindow.getFocusedWindow() ?? mainWindow
    const result = focused
      ? await dialog.showOpenDialog(focused, {
        title: 'Selecionar pasta antiga com dados',
        properties: ['openDirectory'],
      })
      : await dialog.showOpenDialog({
        title: 'Selecionar pasta antiga com dados',
        properties: ['openDirectory'],
      })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  // Importar markdowns como notas
  ipcMain.handle('backup:importMarkdowns', async (_event, sourceDir: string) => {
    try {
      if (!fs.existsSync(sourceDir)) {
        return { success: false, error: 'Pasta não encontrada', imported: 0 }
      }

      const markdownFiles: Array<{ path: string; name: string; content: string }> = []
      
      // Função recursiva para encontrar todos os .md
      const findMarkdowns = (dir: string) => {
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true })
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name)
            if (entry.isDirectory()) {
              findMarkdowns(fullPath)
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
              try {
                const content = fs.readFileSync(fullPath, 'utf-8')
                markdownFiles.push({
                  path: fullPath,
                  name: entry.name,
                  content,
                })
              } catch {
                // Ignora erros ao ler arquivo
              }
            }
          }
        } catch {
          // Ignora erros ao ler diretório
        }
      }

      findMarkdowns(sourceDir)

      return { success: true, imported: markdownFiles.length, files: markdownFiles }
    } catch (error) {
      console.error('Erro ao importar markdowns:', error)
      return { success: false, error: String(error), imported: 0, files: [] }
    }
  })

  // Selecionar arquivo JSON
  ipcMain.handle('backup:selectJsonFile', async () => {
    const focused = BrowserWindow.getFocusedWindow() ?? mainWindow
    const result = focused
      ? await dialog.showOpenDialog(focused, {
        title: 'Selecionar JSON de dados (store/planning/calendar)',
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })
      : await dialog.showOpenDialog({
        title: 'Selecionar JSON de dados (store/planning/calendar)',
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  // Importar dados de planejamento (cards e eventos) de store.json ou arquivos de seção.
  ipcMain.handle('backup:importPlanningData', async (_event, storeJsonPath: string) => {
    try {
      if (!fs.existsSync(storeJsonPath)) {
        return { success: false, error: 'Arquivo JSON nao encontrado', cards: 0, events: 0 }
      }

      const selectedName = path.basename(storeJsonPath).toLowerCase()
      const selectedDir = path.dirname(storeJsonPath)

      let cards: unknown[] = []
      let calendarEvents: unknown[] = []

      if (selectedName === 'planning.json' || selectedName === 'calendar.json') {
        const planningParsed = readJsonFile(path.join(selectedDir, 'planning.json'))
        const calendarParsed = readJsonFile(path.join(selectedDir, 'calendar.json'))
        cards = planningParsed && typeof planningParsed === 'object' && Array.isArray((planningParsed as Partial<Store>).cards)
          ? (planningParsed as Partial<Store>).cards as unknown[]
          : []
        calendarEvents = calendarParsed && typeof calendarParsed === 'object' && Array.isArray((calendarParsed as Partial<Store>).calendarEvents)
          ? (calendarParsed as Partial<Store>).calendarEvents as unknown[]
          : []
      } else {
        const storeParsed = readJsonFile(storeJsonPath)
        if (storeParsed && typeof storeParsed === 'object') {
          const oldStore = storeParsed as Partial<Store>
          cards = Array.isArray(oldStore.cards) ? oldStore.cards : []
          calendarEvents = Array.isArray(oldStore.calendarEvents) ? oldStore.calendarEvents : []
        }
      }

      return {
        success: true,
        cards: cards.length,
        events: calendarEvents.length,
        cardsData: cards as any[],
        eventsData: calendarEvents as any[],
      }
    } catch (error) {
      console.error('Erro ao importar dados de planejamento:', error)
      return { success: false, error: String(error), cards: 0, events: 0, cardsData: [], eventsData: [] }
    }
  })

  // Atualizar timer de backup quando store for salvo
  ipcMain.handle('store:save', (_event, store: Store) => {
    const saved = saveStore(normalizeStore(store))
    
    // Atualizar timer de backup baseado nas configurações
    const settings = normalizeStore(store).settings
    const backupEnabled = settings.backupEnabled ?? false
    const backupInterval = settings.backupIntervalMinutes ?? 15

    if (backupEnabled && backupInterval > 0) {
      startBackupTimer(backupInterval)
    } else {
      stopBackupTimer()
    }

    return saved
  })
}

// Inicializacao do app
app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()

  // Iniciar timer de backup se configurado
  try {
    const store = loadStore()
    const backupEnabled = store.settings.backupEnabled ?? false
    const backupInterval = store.settings.backupIntervalMinutes ?? 15
    if (backupEnabled && backupInterval > 0) {
      startBackupTimer(backupInterval)
    }
  } catch {
    // Ignora erros ao carregar configurações
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
