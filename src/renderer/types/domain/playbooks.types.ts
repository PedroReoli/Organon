import type {
  Playbook,
  PlaybookDialog,
  PlaybookFolder,
  PlaybookVariable,
} from './system.types'

export interface PlaybookViewProps {
  playbooks: Playbook[]
  playbookFolders?: PlaybookFolder[]
  onAddPlaybook: (input: { title: string; sector?: string; category?: string; summary?: string; content?: string }) => string | undefined
  onUpdatePlaybook: (playbookId: string, updates: Partial<Pick<Playbook, 'title' | 'sector' | 'category' | 'summary' | 'content'>>) => void
  onRemovePlaybook: (playbookId: string) => void
  onAddDialog: (playbookId: string, input: { title: string; text: string }) => string
  onUpdateDialog: (playbookId: string, dialogId: string, updates: Partial<Pick<PlaybookDialog, 'title' | 'text' | 'tags'>>) => void
  onRemoveDialog: (playbookId: string, dialogId: string) => void
  onAddPlaybookFromTemplate?: (input: {
    title: string
    sector?: string
    category?: string
    summary?: string
    content?: string
    dialogs: Array<{ title: string; text: string; variables?: PlaybookVariable[] }>
  }) => string | undefined
  onSnapshotPlaybookVersion?: (playbookId: string) => void
  onRestorePlaybookVersion?: (playbookId: string, versionId: string) => void
  onTogglePlaybookFavorite?: (playbookId: string) => void
  onTogglePlaybookArchived?: (playbookId: string) => void
  onMovePlaybookToFolder?: (playbookId: string, folderId: string | null) => void
  onIncrementPlaybookViewCount?: (playbookId: string) => void
  onIncrementDialogCopyCount?: (playbookId: string, dialogId: string) => void
  onUpdateDialogVariables?: (playbookId: string, dialogId: string, variables: PlaybookVariable[]) => void
  onReorderDialogs?: (playbookId: string, orderedIds: string[]) => void
  onDuplicateDialog?: (playbookId: string, dialogId: string) => string
  onAddPlaybookFolder?: (name: string) => string
  onRenamePlaybookFolder?: (folderId: string, name: string) => void
  onRemovePlaybookFolder?: (folderId: string) => void
}

export interface PlaybookForm {
  title: string
  sector: string
  category: string
  summary: string
  content: string
}

export interface DialogForm {
  title: string
  text: string
  variables: PlaybookVariable[]
  tags: string[]
}

export interface ContextMenuState {
  x: number
  y: number
  playbookId: string
}

export interface PlaybookTemplateDialog {
  title: string
  text: string
  variables?: PlaybookVariable[]
}

export interface PlaybookTemplate {
  id: string
  name: string
  description: string
  icon: string
  sector: string
  category: string
  summary: string
  content: string
  dialogs: PlaybookTemplateDialog[]
}
