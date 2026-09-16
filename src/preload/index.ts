import { contextBridge, ipcRenderer, webFrame } from 'electron'

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

interface Canvas {
  id: string
  name: string
  snapshot: Record<string, unknown>
  thumbnail: string | null
  createdAt: string
  updatedAt: string
}

interface Store {
  version: number
  cards: Card[]
  shortcutFolders: ShortcutFolder[]
  shortcuts: ShortcutItem[]
  calendarEvents: CalendarEvent[]
  noteFolders: NoteFolder[]
  notes: Note[]
  colorPalettes: ColorPalette[]
  clipboardItems: ClipboardItem[]
  apps: AppItem[]
  macros: AppMacro[]
  settings: Settings
}

// API exposta ao renderer de forma segura
const electronAPI = {
  loadStore: (): Promise<Store> => ipcRenderer.invoke('store:load'),
  saveStore: (store: Store): Promise<boolean> => ipcRenderer.invoke('store:save', store),

  openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke('external:open', url),
  openPath: (targetPath: string): Promise<boolean> => ipcRenderer.invoke('path:open', targetPath),
  selectPath: (): Promise<string | null> => ipcRenderer.invoke('path:select'),
  readDir: (dirPath: string): Promise<{ name: string; isDirectory: boolean; isFile: boolean }[]> =>
    ipcRenderer.invoke('path:readdir', dirPath),
  renamePath: (oldPath: string, newPath: string): Promise<boolean> =>
    ipcRenderer.invoke('path:rename', oldPath, newPath),
  getAbsoluteFileUrl: (absolutePath: string): Promise<string> =>
    ipcRenderer.invoke('path:getFileUrl', absolutePath),
  copyToClipboard: (text: string): Promise<boolean> => ipcRenderer.invoke('clipboard:write', text),

  getDataDir: (): Promise<{ current: string; custom: string | null }> => ipcRenderer.invoke('data:getDir'),
  setDataDir: (nextDir: string | null): Promise<boolean> => ipcRenderer.invoke('data:setDir', nextDir),
  selectDataDir: (): Promise<string | null> => ipcRenderer.invoke('data:selectDir'),

  // Window Controls
  minimizeWindow: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: (): Promise<void> => ipcRenderer.invoke('window:maximize'),
  closeWindow: (): Promise<void> => ipcRenderer.invoke('window:close'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),

  // App & Installer
  isPackaged: (): Promise<boolean> => ipcRenderer.invoke('app:isPackaged'),
  isInstallerCompleted: (): Promise<boolean> => ipcRenderer.invoke('app:isInstallerCompleted'),
  getInstallerStatus: () => ipcRenderer.invoke('app:getInstallerStatus'),
  completeInstaller: (dataDir: string | null, themeName: ThemeName) =>
    ipcRenderer.invoke('app:completeInstaller', dataDir, themeName),

  // Notes
  readNote: (mdPath: string): Promise<string> => ipcRenderer.invoke('notes:read', mdPath),
  writeNote: (mdPath: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke('notes:write', mdPath, content),
  deleteNote: (mdPath: string): Promise<boolean> => ipcRenderer.invoke('notes:delete', mdPath),
  analyzeTranscriptSelection: (request: { text: string; mode?: 'meeting' | 'interview' | 'prompt' }) =>
    ipcRenderer.invoke('transcript:analyzeSelection', request),
  generateTranscriptNote: (request: {
    title?: string
    transcript: string
    mode?: 'meeting' | 'interview' | 'prompt'
    selectedSnippets?: string[]
    customInstructions?: string
  }) => ipcRenderer.invoke('transcript:generateNote', request),

  // Project Graph
  listProjectGraphs: () => ipcRenderer.invoke('projectGraph:list'),
  addProjectGraph: (rootPath: string) => ipcRenderer.invoke('projectGraph:add', rootPath),
  runProjectGraph: (projectId: string) => ipcRenderer.invoke('projectGraph:run', projectId),
  getProjectGraph: (projectId: string) => ipcRenderer.invoke('projectGraph:get', projectId),
  removeProjectGraph: (projectId: string) => ipcRenderer.invoke('projectGraph:remove', projectId),
  getProjectGraphPrompt: (projectId: string) => ipcRenderer.invoke('projectGraph:prompt', projectId),

  // Apps & Macros
  selectExe: () => ipcRenderer.invoke('apps:selectExe'),
  launchExe: (exePath: string) => ipcRenderer.invoke('apps:launch', exePath),
  launchExeWithArgs: (exePath: string, args: string[]) => ipcRenderer.invoke('apps:launchWithArgs', exePath, args),
  launchMany: (exePaths: string[], mode: 'sequential' | 'simultaneous') =>
    ipcRenderer.invoke('apps:launchMany', exePaths, mode),
  checkRunningApps: (exePaths: string[]) => ipcRenderer.invoke('apps:checkRunning', exePaths),
  getAppsMemory: (exePaths: string[]) => ipcRenderer.invoke('apps:getMemory', exePaths),
  scanInstalledApps: () => ipcRenderer.invoke('apps:scanInstalled'),
  scanRunningApps: () => ipcRenderer.invoke('apps:scanRunning'),
  detectInstalledApps: () => ipcRenderer.invoke('apps:detectInstalled'),
  extractExeIcon: (exePath: string) => ipcRenderer.invoke('apps:extractIcon', exePath),

  // Backup
  createBackup: () => ipcRenderer.invoke('backup:create'),
  listBackups: () => ipcRenderer.invoke('backup:list'),
  openBackupsFolder: () => ipcRenderer.invoke('backup:openDir'),
  restoreBackup: (backupPath: string) => ipcRenderer.invoke('backup:restore', backupPath),
  mergeDataFromOldPath: (oldDataPath: string) => ipcRenderer.invoke('backup:mergeFromPath', oldDataPath),
  selectOldDataPath: () => ipcRenderer.invoke('backup:selectOldPath'),
  importMarkdowns: (sourceDir: string) => ipcRenderer.invoke('backup:importMarkdowns', sourceDir),
  selectJsonFile: () => ipcRenderer.invoke('backup:selectJsonFile'),
  importPlanningData: (storeJsonPath: string) => ipcRenderer.invoke('backup:importPlanningData', storeJsonPath),

  // Meetings
  saveMeetingAudio: (meetingId: string, audioBase64: string) =>
    ipcRenderer.invoke('meetings:saveAudio', meetingId, audioBase64),
  deleteMeetingAudio: (audioPath: string) => ipcRenderer.invoke('meetings:deleteAudio', audioPath),
  transcribeAudio: (
    audioPath: string,
    modelId?: string,
    options?: {
      initialPrompt?: string
      mode?: 'meeting' | 'interview' | 'prompt'
      hotwords?: string[]
      projectName?: string
    }
  ) => ipcRenderer.invoke('meetings:transcribe', audioPath, modelId, options),
  downloadWhisperModel: (modelId: string) => ipcRenderer.invoke('whisper:downloadModel', modelId),
  whisperDownloadProgress: () => ipcRenderer.invoke('whisper:downloadProgress'),
  meetingAgentStatus: () => ipcRenderer.invoke('meeting-agent:status'),
  meetingAgentRun: (request: unknown) => ipcRenderer.invoke('meeting-agent:run', request),
  meetingAgentCancel: (id: string) => ipcRenderer.invoke('meeting-agent:cancel', id),
  meetingAgentWatch: (root?: string) => ipcRenderer.invoke('meeting-agent:watch', root),
  onMeetingAgentProgress: (callback: (data: any) => void) => {
    const listener = (_event: unknown, data: any) => callback(data)
    ipcRenderer.on('meeting-agent:progress', listener)
    return () => ipcRenderer.removeListener('meeting-agent:progress', listener)
  },
  onMeetingFilesChanged: (callback: (data: any) => void) => {
    const listener = (_event: unknown, data: any) => callback(data)
    ipcRenderer.on('meeting-agent:files-changed', listener)
    return () => ipcRenderer.removeListener('meeting-agent:files-changed', listener)
  },
  listWhisperModels: () => ipcRenderer.invoke('whisper:listLocalModels'),
  onClipboardContent: (cb: (event: unknown, text: string) => void) => ipcRenderer.on('clipboard:new-content', cb),
  offClipboardContent: (cb: (event: unknown, text: string) => void) => ipcRenderer.off('clipboard:new-content', cb),

  // Project Workspace (Read-Only)
  projectSelectFolder: () => ipcRenderer.invoke('project:selectFolder'),
  projectListFiles: (projectPath: string) => ipcRenderer.invoke('project:listFiles', projectPath),
  projectReadFile: (projectPath: string, relativePath: string) => ipcRenderer.invoke('project:readFile', projectPath, relativePath),
  projectSearchText: (projectPath: string, query: string) => ipcRenderer.invoke('project:searchText', projectPath, query),
  webSearch: (query: string) => ipcRenderer.invoke('web:search', query),

  // Canvas
  canvasList: () => ipcRenderer.invoke('canvas:list'),
  canvasGet: (id: string) => ipcRenderer.invoke('canvas:get', id),
  canvasCreate: (name?: string) => ipcRenderer.invoke('canvas:create', name),
  canvasSave: (id: string, payload: any) => ipcRenderer.invoke('canvas:save', id, payload),
  canvasDelete: (id: string) => ipcRenderer.invoke('canvas:delete', id),

  // Zoom
  setNativeZoom: (factor: number) => webFrame.setZoomFactor(factor),
  getNativeZoom: () => webFrame.getZoomFactor(),

  // Reports
  readTextFile: (filePath: string) => ipcRenderer.invoke('reports:readFile', filePath),
  watchReportsDir: (dirPath: string) => ipcRenderer.invoke('reports:watch', dirPath),
  unwatchReportsDir: (dirPath: string) => ipcRenderer.invoke('reports:unwatch', dirPath),
  onReportsChanged: (cb: () => void) => ipcRenderer.on('reports:changed', cb),
  offReportsChanged: (cb: () => void) => ipcRenderer.off('reports:changed', cb),
  runReportScript: (scriptPath: string) => ipcRenderer.invoke('reports:run', scriptPath),
  getReportsLastRun: (lastRunPath: string) => ipcRenderer.invoke('reports:lastRun', lastRunPath),
  readReportsConfig: (configPath: string) => ipcRenderer.invoke('reports:readConfig', configPath),
  writeReportsConfig: (configPath: string, config: any) => ipcRenderer.invoke('reports:writeConfig', configPath, config),
  scanRepos: (rootPaths: string[]) => ipcRenderer.invoke('reports:scanRepos', rootPaths),
  gitExec: (repoPath: string, args: string[]) => ipcRenderer.invoke('git:exec', repoPath, args),
  startGitWatcher: (baseDir: string) => ipcRenderer.invoke('reports:startGitWatcher', baseDir),
  stopGitWatcher: () => ipcRenderer.invoke('reports:stopGitWatcher'),
  onGitChanged: (cb: () => void) => ipcRenderer.on('reports:gitChanged', cb),
  offGitChanged: (cb: () => void) => ipcRenderer.removeListener('reports:gitChanged', cb),

  // Conversations
  saveConversation: (id: string, messages: any[]) => ipcRenderer.invoke('conversations:save', id, messages),
  listConversations: () => ipcRenderer.invoke('conversations:list'),
  loadConversation: (filename: string) => ipcRenderer.invoke('conversations:load', filename),
  deleteConversation: (filename: string) => ipcRenderer.invoke('conversations:delete', filename),
  getConversationsDir: () => ipcRenderer.invoke('conversations:getDir'),

  // Super Whisper
  onSuperWhisperToggleRecording: (cb: () => void) => {
    const listener = () => cb()
    ipcRenderer.on('super-whisper:toggle-recording', listener)
    return () => ipcRenderer.removeListener('super-whisper:toggle-recording', listener)
  },
  superWhisperShow: () => ipcRenderer.invoke('super-whisper:show'),
  superWhisperHide: () => ipcRenderer.invoke('super-whisper:hide'),
  superWhisperToggle: () => ipcRenderer.invoke('super-whisper:toggle'),
  superWhisperIsOpen: () => ipcRenderer.invoke('super-whisper:is-open'),
  onSuperWhisperTranscript: (cb: (text: string) => void) =>
    ipcRenderer.on('super-whisper:transcription', (_event, text) => cb(text)),
  offSuperWhisperTranscript: () => ipcRenderer.removeAllListeners('super-whisper:transcription'),
  superWhisperSend: (text: string) => ipcRenderer.invoke('super-whisper:send', text),
  superWhisperGetTheme: () => ipcRenderer.invoke('super-whisper:get-theme'),

  // Sincronização Local via QR Code
  startLocalSyncServer: (port?: number) => ipcRenderer.invoke('local-sync:start', port),
  stopLocalSyncServer: () => ipcRenderer.invoke('local-sync:stop'),
  getLocalSyncStatus: () => ipcRenderer.invoke('local-sync:status'),
  onLocalSyncLog: (cb: (entry: { timestamp: string; message: string; type: string }) => void) => {
    const listener = (_event: any, data: any) => cb(data)
    ipcRenderer.on('local-sync:log', listener)
    return listener
  },
  offLocalSyncLog: (listener: any) => ipcRenderer.removeListener('local-sync:log', listener),
  onLocalSyncProgress: (cb: (progress: number) => void) => {
    const listener = (_event: any, progress: any) => cb(progress)
    ipcRenderer.on('local-sync:progress', listener)
    return listener
  },
  offLocalSyncProgress: (listener: any) => ipcRenderer.removeListener('local-sync:progress', listener),
  onLocalSyncConnected: (cb: (device: string | null) => void) => {
    const listener = (_event: any, device: any) => cb(device)
    ipcRenderer.on('local-sync:connected', listener)
    return listener
  },
  offLocalSyncConnected: (listener: any) => ipcRenderer.removeListener('local-sync:connected', listener),

  // Auto-Updater
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdateDownloadProgress: (cb: (progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => {
    const listener = (_event: any, data: any) => cb(data)
    ipcRenderer.on('updater:download-progress', listener)
    return listener
  },
  offUpdateDownloadProgress: (listener: any) => ipcRenderer.removeListener('updater:download-progress', listener),
  onUpdateDownloaded: (cb: (info: any) => void) => {
    const listener = (_event: any, info: any) => cb(info)
    ipcRenderer.on('updater:downloaded', listener)
    return listener
  },
  offUpdateDownloaded: (listener: any) => ipcRenderer.removeListener('updater:downloaded', listener),

  // Wake Word / Hotword
  getWakeWordConfig: () => ipcRenderer.invoke('wakeword:getConfig'),
  setWakeWordConfig: (config: any) => ipcRenderer.invoke('wakeword:setConfig', config),
  triggerWakeWord: () => ipcRenderer.invoke('wakeword:trigger'),

  // Screen Share Stealth Protection
  setContentProtection: (enabled: boolean) => ipcRenderer.invoke('window:setContentProtection', enabled),

  // Planning CLI Sync
  onPlanningSync: (cb: () => void) => {
    const listener = () => cb()
    ipcRenderer.on('planning:sync-cli', listener)
    return () => ipcRenderer.removeListener('planning:sync-cli', listener)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
