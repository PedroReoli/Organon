import * as fs from 'fs'
import * as path from 'path'

import { copyDirMerge } from './filesystem'
import { DEFAULT_STUDY_STATE, loadStoreFromPath, saveStoreToPath } from './store'
import type { BudgetCategory, Store, StudyState } from './types'

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

      const mergedStore: Store = {
        ...currentStore,
        cards: mergeArraysById(currentStore.cards, oldStore.cards),
        shortcutFolders: mergeArraysById(currentStore.shortcutFolders, oldStore.shortcutFolders),
        shortcuts: mergeArraysById(currentStore.shortcuts, oldStore.shortcuts),
        projects: mergeArraysById(currentStore.projects, oldStore.projects),
        registeredIDEs: mergeArraysById(currentStore.registeredIDEs, oldStore.registeredIDEs),
        calendarEvents: mergeArraysById(currentStore.calendarEvents, oldStore.calendarEvents),
        noteFolders: mergeArraysById(currentStore.noteFolders, oldStore.noteFolders),
        notes: mergeArraysById(currentStore.notes, oldStore.notes),
        colorPalettes: mergeArraysById(currentStore.colorPalettes, oldStore.colorPalettes),
        clipboardCategories: mergeArraysById(currentStore.clipboardCategories, oldStore.clipboardCategories),
        clipboardItems: mergeArraysById(currentStore.clipboardItems, oldStore.clipboardItems),
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
        study: hasStudyContent(currentStore.study) ? currentStore.study : oldStore.study,
        settings: currentStore.settings,
      }

      merged = mergedStore.cards.length - currentStore.cards.length +
        mergedStore.notes.length - currentStore.notes.length +
        mergedStore.colorPalettes.length - currentStore.colorPalettes.length +
        mergedStore.calendarEvents.length - currentStore.calendarEvents.length +
        mergedStore.habits.length - currentStore.habits.length +
        mergedStore.bills.length - currentStore.bills.length +
        mergedStore.expenses.length - currentStore.expenses.length +
        mergedStore.incomes.length - currentStore.incomes.length +
        mergedStore.meetings.length - currentStore.meetings.length

      saveStoreToPath(mergedStore, currentDataPath)
    }

    const directoriesToCopy = ['store', 'notes', 'meetings', 'backups']
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
      const rootEntries = fs.readdirSync(oldDataPath, { withFileTypes: true })
      for (const entry of rootEntries) {
        if (entry.isDirectory() && directoriesToCopy.includes(entry.name)) continue
        if (entry.isFile() && entry.name === 'store.json') continue

        const srcPath = path.join(oldDataPath, entry.name)
        const dstPath = path.join(currentDataPath, entry.name)

        if (entry.isDirectory()) {
          console.log(`Copiando pasta adicional: ${entry.name}`)
          const result = copyDirMerge(srcPath, dstPath, false)
          totalFilesCopied += result.copied
          totalFilesSkipped += result.skipped
          continue
        }
        if (!entry.isFile()) continue

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
