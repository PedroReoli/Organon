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
  getPathSizeRecursive,
  getStorePath,
  readJsonFile,
  writeTextFileAtomic,
} from './filesystem'
import {
  DEFAULT_STUDY_STATE,
  getSectionJsonRelativePaths,
  loadSectionedStoreFromRoot,
  loadStoreFromPath,
  normalizeStore,
  saveStoreToPath,
  writeSectionedStoreToDir,
} from './store'
import type { BackupListItem, BackupManifest, BudgetCategory, Store, StudyState } from './types'

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

export const createBackup = (dataPath: string): { success: boolean; backupPath?: string; error?: string } => {
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

    const backupDir = getBackupDir(dataPath)
    const backups = fs.readdirSync(backupDir, { withFileTypes: true })
      .filter(entry => entry.name.startsWith('store-backup-'))
      .map(entry => ({
        name: entry.name,
        path: path.join(backupDir, entry.name),
        time: fs.statSync(path.join(backupDir, entry.name)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time)

    if (backups.length > 50) {
      for (const oldBackup of backups.slice(50)) {
        try {
          deletePathIfExists(oldBackup.path)
        } catch {
          // Ignora erros ao deletar backups antigos.
        }
      }
    }

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

    const backups = fs.readdirSync(backupDir, { withFileTypes: true })
      .filter(entry => entry.name.startsWith('store-backup-'))
      .map(entry => {
        const backupPath = path.join(backupDir, entry.name)
        const stats = fs.statSync(backupPath)
        return {
          name: entry.name,
          path: backupPath,
          date: stats.mtime.toISOString(),
          size: entry.isDirectory() ? getPathSizeRecursive(backupPath) : stats.size,
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    if (backups.length > 0) {
      const now = Date.now()
      const twoDaysMs = 2 * 24 * 60 * 60 * 1000
      const newestAge = now - new Date(backups[0].date).getTime()

      if (newestAge < twoDaysMs) {
        const toDelete = backups.filter(backup => now - new Date(backup.date).getTime() > twoDaysMs)
        for (const backup of toDelete) {
          try {
            const stat = fs.statSync(backup.path)
            if (stat.isDirectory()) {
              fs.rmSync(backup.path, { recursive: true, force: true })
            } else {
              fs.unlinkSync(backup.path)
            }
          } catch (error) {
            console.error('Erro ao deletar backup antigo:', error)
          }
        }
        return backups.filter(backup => now - new Date(backup.date).getTime() <= twoDaysMs)
      }
    }

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

    if (fs.existsSync(getStorePath(dataPath)) || fs.existsSync(path.join(dataPath, 'store'))) {
      createBackup(dataPath)
    }

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

export const mergeDataFromOldPath = (oldDataPath: string, currentDataPath: string): { success: boolean; merged: number; error?: string } => {
  try {
    if (!fs.existsSync(oldDataPath)) {
      return { success: false, error: 'Pasta antiga nao encontrada', merged: 0 }
    }

    let merged = 0
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

    if (oldStore) {
      const mergeArraysById = <T extends { id: string }>(current: T[], old: T[]): T[] => {
        const currentIds = new Set(current.map(item => item.id))
        return [...current, ...old.filter(item => !currentIds.has(item.id))]
      }

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

      const mergedStudy = hasStudyContent(currentStore.study) ? currentStore.study : oldStore.study

      const mergedStore: Store = {
        ...currentStore,
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

    const directoriesToCopy = ['store', 'notes', 'files', 'meetings', 'backups']
    let totalFilesCopied = 0
    let totalFilesSkipped = 0

    for (const dirName of directoriesToCopy) {
      const oldDir = path.join(oldDataPath, dirName)
      const currentDir = path.join(currentDataPath, dirName)

      if (fs.existsSync(oldDir) && fs.statSync(oldDir).isDirectory()) {
        try {
          console.log(`Copiando pasta ${dirName}...`)
          const result = copyDirMerge(oldDir, currentDir, false)
          totalFilesCopied += result.copied
          totalFilesSkipped += result.skipped
          console.log(`Pasta ${dirName}: ${result.copied} arquivos copiados, ${result.skipped} pulados`)
        } catch (error) {
          console.error(`Erro ao copiar pasta ${dirName}:`, error)
        }
      } else {
        console.log(`Pasta ${dirName} nao encontrada ou nao e diretorio`)
      }
    }

    try {
      if (fs.existsSync(oldDataPath)) {
        const rootEntries = fs.readdirSync(oldDataPath, { withFileTypes: true })
        for (const entry of rootEntries) {
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
            continue
          }

          if (!entry.isFile()) {
            continue
          }

          if (!fs.existsSync(dstPath)) {
            fs.copyFileSync(srcPath, dstPath)
            totalFilesCopied++
            continue
          }

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
    } catch (error) {
      console.error('Erro ao copiar arquivos da raiz:', error)
    }

    console.log(`Total: ${totalFilesCopied} arquivos copiados, ${totalFilesSkipped} pulados`)

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

let backupTimer: NodeJS.Timeout | null = null

export const startBackupTimer = (intervalMinutes: number): void => {
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
      console.log('Backup automatico criado:', result.backupPath)
    } else {
      console.error('Erro no backup automatico:', result.error)
    }
  }, intervalMs)
}

export const stopBackupTimer = (): void => {
  if (backupTimer) {
    clearInterval(backupTimer)
    backupTimer = null
  }
}
