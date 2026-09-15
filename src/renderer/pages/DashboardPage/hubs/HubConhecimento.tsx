import type { ComponentProps } from 'react'
import { NotesView } from '@Notes/NotesPage'
import { PlaybookView } from '@Playbook/PlaybookPage'
import type { AppView } from '@shared/InternalNav'

type HubConhecimentoProps = { activeView: AppView }
  & ComponentProps<typeof NotesView>
  & ComponentProps<typeof PlaybookView>

export const HubConhecimento = ({
  activeView,
  // notes
  notes, folders, onAddNote, onUpdateNote,
  onToggleFavorite, onTogglePinned, onToggleLock,
  onReorderNotes, onReorderFolders, onRemoveNote,
  onAddFolder, onUpdateFolder, onRemoveFolder,
  reduceModeSignal, initialNoteId, onInitialNoteConsumed, keyboardShortcuts,
  onSoftDeleteNote, onSoftDeleteFolder, onRestoreNote, onRestoreFolder,
  onPurgeNote, onPurgeFolder, onEmptyTrash,
  noteTemplates, onSetNoteBookmarks,
  // playbook
  playbooks, playbookFolders,
  onAddPlaybook, onUpdatePlaybook, onRemovePlaybook,
  onAddDialog, onUpdateDialog, onRemoveDialog,
  onAddPlaybookFromTemplate,
  onSnapshotPlaybookVersion, onRestorePlaybookVersion,
  onTogglePlaybookFavorite, onTogglePlaybookArchived, onMovePlaybookToFolder,
  onIncrementPlaybookViewCount, onIncrementDialogCopyCount,
  onUpdateDialogVariables,
  onAddPlaybookFolder, onRenamePlaybookFolder, onRemovePlaybookFolder,
}: HubConhecimentoProps) => {
  if (activeView === 'notes') {
    return (
      <NotesView
        notes={notes}
        folders={folders}
        onAddNote={onAddNote}
        onUpdateNote={onUpdateNote}
        onToggleFavorite={onToggleFavorite}
        onTogglePinned={onTogglePinned}
        onToggleLock={onToggleLock}
        onReorderNotes={onReorderNotes}
        onReorderFolders={onReorderFolders}
        onRemoveNote={onRemoveNote}
        onAddFolder={onAddFolder}
        onUpdateFolder={onUpdateFolder}
        onRemoveFolder={onRemoveFolder}
        reduceModeSignal={reduceModeSignal}
        initialNoteId={initialNoteId}
        onInitialNoteConsumed={onInitialNoteConsumed}
        keyboardShortcuts={keyboardShortcuts}
        onSoftDeleteNote={onSoftDeleteNote}
        onSoftDeleteFolder={onSoftDeleteFolder}
        onRestoreNote={onRestoreNote}
        onRestoreFolder={onRestoreFolder}
        onPurgeNote={onPurgeNote}
        onPurgeFolder={onPurgeFolder}
        onEmptyTrash={onEmptyTrash}
        noteTemplates={noteTemplates}
        onSetNoteBookmarks={onSetNoteBookmarks}
      />
    )
  }

  if (activeView === 'playbook') {
    return (
      <PlaybookView
        playbooks={playbooks}
        playbookFolders={playbookFolders}
        onAddPlaybook={onAddPlaybook}
        onUpdatePlaybook={onUpdatePlaybook}
        onRemovePlaybook={onRemovePlaybook}
        onAddDialog={onAddDialog}
        onUpdateDialog={onUpdateDialog}
        onRemoveDialog={onRemoveDialog}
        onAddPlaybookFromTemplate={onAddPlaybookFromTemplate}
        onSnapshotPlaybookVersion={onSnapshotPlaybookVersion}
        onRestorePlaybookVersion={onRestorePlaybookVersion}
        onTogglePlaybookFavorite={onTogglePlaybookFavorite}
        onTogglePlaybookArchived={onTogglePlaybookArchived}
        onMovePlaybookToFolder={onMovePlaybookToFolder}
        onIncrementPlaybookViewCount={onIncrementPlaybookViewCount}
        onIncrementDialogCopyCount={onIncrementDialogCopyCount}
        onUpdateDialogVariables={onUpdateDialogVariables}
        onAddPlaybookFolder={onAddPlaybookFolder}
        onRenamePlaybookFolder={onRenamePlaybookFolder}
        onRemovePlaybookFolder={onRemovePlaybookFolder}
      />
    )
  }

  return null
}
