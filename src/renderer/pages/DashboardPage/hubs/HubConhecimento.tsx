import type { ComponentProps } from 'react'
import { NotesView } from '@Notes/NotesPage'
import type { AppView } from '@shared/InternalNav'

type HubConhecimentoProps = { activeView?: AppView }
  & ComponentProps<typeof NotesView>

export const HubConhecimento = ({
  notes, folders, onAddNote, onUpdateNote,
  onToggleFavorite, onTogglePinned, onToggleLock,
  onReorderNotes, onReorderFolders, onRemoveNote,
  onAddFolder, onUpdateFolder, onRemoveFolder,
  reduceModeSignal, initialNoteId, onInitialNoteConsumed, keyboardShortcuts,
  onSoftDeleteNote, onSoftDeleteFolder, onRestoreNote, onRestoreFolder,
  onPurgeNote, onPurgeFolder, onEmptyTrash,
  noteTemplates, onSetNoteBookmarks,
}: HubConhecimentoProps) => {
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

