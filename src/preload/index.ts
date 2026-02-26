import { contextBridge, ipcRenderer } from 'electron'

// Tipos para o store (duplicados aqui para o preload)
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

type ThemeName = 'dark-default' | 'dark-vscode' | 'light-1' | 'light-2'

interface Settings {
  themeName: ThemeName
  dataDir: string | null
  installerCompleted: boolean
  weekStart: string | null
}

interface Store {
  version: number
  cards: Card[]
  shortcutFolders: ShortcutFolder[]
  shortcuts: ShortcutItem[]
  paths: PathItem[]
  calendarEvents: CalendarEvent[]
  noteFolders: NoteFolder[]
  notes: Note[]
  colorPalettes: ColorPalette[]
  clipboardItems: ClipboardItem[]
  files: FileItem[]
  apps: AppItem[]
  macros: AppMacro[]
  settings: Settings
}

// API exposta ao renderer de forma segura
const electronAPI = {
  loadStore: (): Promise<Store> => {
    return ipcRenderer.invoke('store:load')
  },

  saveStore: (store: Store): Promise<boolean> => {
    return ipcRenderer.invoke('store:save', store)
  },

  openExternal: (url: string): Promise<boolean> => {
    return ipcRenderer.invoke('external:open', url)
  },

  openPath: (targetPath: string): Promise<boolean> => {
    return ipcRenderer.invoke('path:open', targetPath)
  },

  selectPath: (): Promise<string | null> => {
    return ipcRenderer.invoke('path:select')
  },

  readDir: (dirPath: string): Promise<{ name: string; isDirectory: boolean; isFile: boolean }[]> => {
    return ipcRenderer.invoke('path:readdir', dirPath)
  },

  renamePath: (oldPath: string, newPath: string): Promise<boolean> => {
    return ipcRenderer.invoke('path:rename', oldPath, newPath)
  },

  getAbsoluteFileUrl: (absolutePath: string): Promise<string> => {
    return ipcRenderer.invoke('path:getFileUrl', absolutePath)
  },

  copyToClipboard: (text: string): Promise<boolean> => {
    return ipcRenderer.invoke('clipboard:write', text)
  },

  getDataDir: (): Promise<{ current: string; custom: string | null }> => {
    return ipcRenderer.invoke('data:getDir')
  },

  setDataDir: (nextDir: string | null): Promise<boolean> => {
    return ipcRenderer.invoke('data:setDir', nextDir)
  },

  selectDataDir: (): Promise<string | null> => {
    return ipcRenderer.invoke('data:selectDir')
  },

  // Controles da janela
  minimizeWindow: (): Promise<void> => {
    return ipcRenderer.invoke('window:minimize')
  },

  maximizeWindow: (): Promise<void> => {
    return ipcRenderer.invoke('window:maximize')
  },

  closeWindow: (): Promise<void> => {
    return ipcRenderer.invoke('window:close')
  },

  isMaximized: (): Promise<boolean> => {
    return ipcRenderer.invoke('window:isMaximized')
  },

  // APIs do instalador
  isPackaged: (): Promise<boolean> => {
    return ipcRenderer.invoke('app:isPackaged')
  },

  isInstallerCompleted: (): Promise<boolean> => {
    return ipcRenderer.invoke('app:isInstallerCompleted')
  },

  completeInstaller: (dataDir: string | null, themeName: ThemeName): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('app:completeInstaller', dataDir, themeName)
  },

  // Notes (conteudo em .md)
  readNote: (mdPath: string): Promise<string> => {
    return ipcRenderer.invoke('notes:read', mdPath)
  },

  writeNote: (mdPath: string, content: string): Promise<boolean> => {
    return ipcRenderer.invoke('notes:write', mdPath, content)
  },

  deleteNote: (mdPath: string): Promise<boolean> => {
    return ipcRenderer.invoke('notes:delete', mdPath)
  },

  // Files (organizador)
  selectFilesToImport: (): Promise<string[]> => {
    return ipcRenderer.invoke('files:select')
  },

  importFile: (sourcePath: string): Promise<{ success: boolean; item?: FileItem; error?: string }> => {
    return ipcRenderer.invoke('files:import', sourcePath)
  },

  openFile: (relativePath: string): Promise<boolean> => {
    return ipcRenderer.invoke('files:open', relativePath)
  },

  deleteFile: (relativePath: string): Promise<boolean> => {
    return ipcRenderer.invoke('files:delete', relativePath)
  },

  getFileUrl: (relativePath: string): Promise<string> => {
    return ipcRenderer.invoke('files:getUrl', relativePath)
  },

  // Apps & Macros
  selectExe: (): Promise<{ exePath: string; name: string; iconDataUrl: string | null } | null> => {
    return ipcRenderer.invoke('apps:selectExe')
  },

  launchExe: (exePath: string): Promise<boolean> => {
    return ipcRenderer.invoke('apps:launch', exePath)
  },

  launchExeWithArgs: (exePath: string, args: string[]): Promise<boolean> => {
    return ipcRenderer.invoke('apps:launchWithArgs', exePath, args)
  },

  launchMany: (exePaths: string[], mode: 'sequential' | 'simultaneous'): Promise<boolean> => {
    return ipcRenderer.invoke('apps:launchMany', exePaths, mode)
  },

  // Backup
  createBackup: (): Promise<{ success: boolean; backupPath?: string; error?: string }> => {
    return ipcRenderer.invoke('backup:create')
  },

  listBackups: (): Promise<Array<{ name: string; path: string; date: string; size: number }>> => {
    return ipcRenderer.invoke('backup:list')
  },

  restoreBackup: (backupPath: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('backup:restore', backupPath)
  },

  mergeDataFromOldPath: (oldDataPath: string): Promise<{ success: boolean; merged: number; error?: string }> => {
    return ipcRenderer.invoke('backup:mergeFromPath', oldDataPath)
  },

  selectOldDataPath: (): Promise<string | null> => {
    return ipcRenderer.invoke('backup:selectOldPath')
  },

  importMarkdowns: (sourceDir: string): Promise<{ success: boolean; imported: number; files: Array<{ path: string; name: string; content: string }>; error?: string }> => {
    return ipcRenderer.invoke('backup:importMarkdowns', sourceDir)
  },

  selectJsonFile: (): Promise<string | null> => {
    return ipcRenderer.invoke('backup:selectJsonFile')
  },

  importPlanningData: (storeJsonPath: string): Promise<{ success: boolean; cards: number; events: number; cardsData: any[]; eventsData: any[]; error?: string }> => {
    return ipcRenderer.invoke('backup:importPlanningData', storeJsonPath)
  },

  // Meetings (gravação e transcrição)
  saveMeetingAudio: (meetingId: string, audioBase64: string): Promise<string | null> => {
    return ipcRenderer.invoke('meetings:saveAudio', meetingId, audioBase64)
  },

  deleteMeetingAudio: (audioPath: string): Promise<boolean> => {
    return ipcRenderer.invoke('meetings:deleteAudio', audioPath)
  },

  transcribeAudio: (audioPath: string): Promise<string> => {
    return ipcRenderer.invoke('meetings:transcribe', audioPath)
  },

  // ─── Auto-Update ───────────────────────────────────────────────────────────
  /** Verifica se há atualização disponível. */
  checkForUpdates: (): Promise<{ ok?: boolean; version?: string | null; error?: string }> => {
    return ipcRenderer.invoke('updater:check')
  },

  /** Inicia o download da atualização já encontrada. */
  downloadUpdate: (): Promise<{ ok?: boolean; error?: string }> => {
    return ipcRenderer.invoke('updater:download')
  },

  /** Fecha o app e instala a atualização baixada. */
  installUpdate: (): void => {
    ipcRenderer.invoke('updater:install')
  },

  /** Assina eventos do auto-updater.
   *  Retorna função de cleanup para remover o listener.
   */
  onUpdaterEvent: (
    callback: (event: string, payload?: unknown) => void
  ): (() => void) => {
    const channels = [
      'updater:checking',
      'updater:available',
      'updater:not-available',
      'updater:progress',
      'updater:downloaded',
      'updater:error',
    ] as const

    const listeners = channels.map(channel => {
      const handler = (_: Electron.IpcRendererEvent, payload?: unknown) => callback(channel, payload)
      ipcRenderer.on(channel, handler)
      return { channel, handler }
    })

    return () => {
      for (const { channel, handler } of listeners) {
        ipcRenderer.removeListener(channel, handler)
      }
    }
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
