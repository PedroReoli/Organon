import * as fs from 'fs'
import * as path from 'path'

import { readJsonFile } from './filesystem'
import type { Store } from './types'

export const importMarkdownsFromDir = (sourceDir: string): {
  success: boolean
  error?: string
  imported: number
  files: Array<{ path: string; name: string; content: string }>
} => {
  try {
    if (!fs.existsSync(sourceDir)) {
      return { success: false, error: 'Pasta nao encontrada', imported: 0, files: [] }
    }

    const markdownFiles: Array<{ path: string; name: string; content: string }> = []
    const findMarkdowns = (dir: string): void => {
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
              // Ignora erros ao ler arquivo.
            }
          }
        }
      } catch {
        // Ignora erros ao ler diretorio.
      }
    }

    findMarkdowns(sourceDir)
    return { success: true, imported: markdownFiles.length, files: markdownFiles }
  } catch (error) {
    console.error('Erro ao importar markdowns:', error)
    return { success: false, error: String(error), imported: 0, files: [] }
  }
}

export const importPlanningDataFromFile = (storeJsonPath: string): {
  success: boolean
  error?: string
  cards: number
  events: number
  cardsData: any[]
  eventsData: any[]
} => {
  try {
    if (!fs.existsSync(storeJsonPath)) {
      return { success: false, error: 'Arquivo JSON nao encontrado', cards: 0, events: 0, cardsData: [], eventsData: [] }
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
}
