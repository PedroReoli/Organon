import type { CalendarEvent, RegisteredIDE, Settings } from '@types'

export interface StoreSummary {
  lastSyncAt?: string
  counts:      { label: string; n: number }[]
  recentNotes: { id: string; title: string; updatedAt: string }[]
}

export interface NotesConfigSettings {
  trashRetentionDays: number
  dailyNotesEnabled: boolean
  dailyNotesFolder: string
  dailyNotesTitleFormat: string
}

export interface StudyConfigSettings {
  defaultPresetName: string
  muteSound: boolean
}

export interface SettingsViewProps {
  settings:             Settings
  onUpdateSettings:     (updates: Partial<Settings>) => void
  registeredIDEs:       RegisteredIDE[]
  onAddRegisteredIDE:   (input: { name: string; exePath: string; iconDataUrl?: string | null; args?: string }) => void
  onUpdateRegisteredIDE: (ideId: string, updates: Partial<Pick<RegisteredIDE, 'name' | 'exePath' | 'iconDataUrl' | 'args'>>) => void
  onRemoveRegisteredIDE: (ideId: string) => void
  onResetStore:         () => Promise<void>
  onOpenHistory?:       () => void
  onAddNote?:           (title: string, folderId?: string | null) => any
  onAddCard?:           (title: string, date?: string | null) => any
  onAddCalendarEvent?:  (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => any
  isSyncing?:           boolean
  syncStatus?:          'idle' | 'pending' | 'syncing' | 'synced' | 'error'
  syncError?:           string | null
  onSync?:              () => void
  isConfigured?:        boolean
  userLoggedIn?:        boolean
  onLogin?:             (email: string, password: string) => Promise<boolean>
  onRegister?:          (email: string, password: string, name?: string) => Promise<boolean>
  onLogout?:            () => Promise<void>
  authError?:           string | null
  onClearAuthError?:    () => void
  authUser?:            { email: string; name: string | null } | null
  authLoading?:         boolean
  onUpdateProfile?:     (updates: { name?: string }) => Promise<boolean>
  profilePhotoDataUrl?: string
  onUpdateProfilePhoto?: (dataUrl: string | null) => void
  storeSummary?:        StoreSummary
  // Modulos
  notesConfig?:           NotesConfigSettings
  onUpdateNotesConfig?:   (data: NotesConfigSettings) => void
  studyConfig?:           StudyConfigSettings
  onUpdateStudyConfig?:   (data: StudyConfigSettings) => void
}
