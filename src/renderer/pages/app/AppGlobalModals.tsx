import React from 'react'
import type { Settings, Note, NoteFolder, Card, ClipboardCategory, ClipboardItem } from '@types'
import type { AppView } from '../shared/InternalNav'
import { LocalSyncModal } from '../shared/modals/LocalSyncModal'
import { VoiceDictationModal } from '../shared/modals/VoiceDictationModal'
import { ViewsNavigatorModal } from '../shared/modals/ViewsNavigatorModal'
import { ClipboardQuickModal } from '../ClipboardPage/clipboard/ClipboardQuickModal'
import { SyncProgressModal } from '../shared/modals/SyncProgressModal'
import { UpdateModal } from '../../components/UpdateModal'
import { Chatbot } from '../NotesPage/notes/Chatbot'
import { APP_VIEW_LABELS } from './app.constants'
import { isElectron } from '@utils'

interface AppGlobalModalsProps {
  settings: Settings
  notes: Note[]
  noteFolders: NoteFolder[]
  cards: Card[]
  clipboardCategories: ClipboardCategory[]
  clipboardItems: ClipboardItem[]
  activeView: AppView
  isChatOpen: boolean
  setIsChatOpen: (open: boolean) => void
  showLocalSyncModal: boolean
  setShowLocalSyncModal: (show: boolean) => void
  showVoiceModal: boolean
  setShowVoiceModal: (show: boolean) => void
  showViewsNavigator: boolean
  setShowViewsNavigator: (show: boolean) => void
  showClipboardModal: boolean
  setShowClipboardModal: (show: boolean) => void
  showUpdateModal: boolean
  setShowUpdateModal: (show: boolean) => void
  showLoginSync: boolean
  onAddCard: (title: string) => void
  onAddNote: (title: string, folderId?: string | null) => any
  onUpdateNote: (noteId: string, updates: any) => void
  onAddNoteFolder: (name: string, parentId?: string | null) => any
  onUpdateNoteFolder: (folderId: string, updates: any) => void
  onSetActiveView: (view: AppView) => void
  onSetPendingNoteId: (id: string | null) => void
  onIncrementCopyCount: (id: string) => void
}

export const AppGlobalModals: React.FC<AppGlobalModalsProps> = ({
  settings,
  notes,
  noteFolders,
  cards,
  clipboardCategories,
  clipboardItems,
  activeView,
  isChatOpen,
  setIsChatOpen,
  showLocalSyncModal,
  setShowLocalSyncModal,
  showVoiceModal,
  setShowVoiceModal,
  showViewsNavigator,
  setShowViewsNavigator,
  showClipboardModal,
  setShowClipboardModal,
  showUpdateModal,
  setShowUpdateModal,
  showLoginSync,
  onAddCard,
  onAddNote,
  onUpdateNote,
  onAddNoteFolder,
  onUpdateNoteFolder,
  onSetActiveView,
  onSetPendingNoteId,
  onIncrementCopyCount,
}) => {
  return (
    <>
      <LocalSyncModal
        isOpen={showLocalSyncModal}
        onClose={() => setShowLocalSyncModal(false)}
      />

      <VoiceDictationModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onCreateCard={(title) => onAddCard(title)}
        onCreateNote={(title) => onAddNote(title)}
      />

      {showViewsNavigator && (
        <ViewsNavigatorModal
          notes={notes}
          onNavigate={(view: AppView) => {
            onSetActiveView(view)
            setShowViewsNavigator(false)
          }}
          onSelectNote={(noteId) => {
            onSetActiveView('notes')
            onSetPendingNoteId(noteId)
            setShowViewsNavigator(false)
          }}
          onAddNote={(title) => {
            onAddNote(title)
            onSetActiveView('notes')
            setShowViewsNavigator(false)
          }}
          onAddCard={(title) => {
            onAddCard(title)
            onSetActiveView('planner')
            setShowViewsNavigator(false)
          }}
          onOpenChat={() => {
            setIsChatOpen(true)
            setShowViewsNavigator(false)
          }}
          onOpenSync={() => {
            setShowLocalSyncModal(true)
            setShowViewsNavigator(false)
          }}
          onClose={() => setShowViewsNavigator(false)}
        />
      )}

      {showClipboardModal && (
        <ClipboardQuickModal
          categories={clipboardCategories}
          items={clipboardItems}
          onClose={() => setShowClipboardModal(false)}
          onNavigateClipboard={() => {
            onSetActiveView('clipboard')
            setShowClipboardModal(false)
          }}
          onIncrementCopyCount={onIncrementCopyCount}
        />
      )}

      {showLoginSync && isElectron() && (
        <SyncProgressModal settings={settings} />
      )}

      <Chatbot
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        hideFloatingTrigger={true}
        notes={notes.map((n) => ({
          id: n.id,
          title: n.title,
          content: n.content || '',
          folderId: n.folderId,
        }))}
        folders={noteFolders.map((f) => ({
          id: f.id,
          name: f.name,
          parentId: f.parentId,
          isHome: f.isHome,
        }))}
        cards={cards.map((c) => ({ id: c.id, title: c.title, status: c.status }))}
        screenContext={{
          screen: activeView,
          title: APP_VIEW_LABELS[activeView] || activeView,
          items: notes.map((n) => ({ id: n.id, title: n.title, type: 'note' })),
        }}
        onNavigateToNote={(noteId) => {
          onSetPendingNoteId(noteId)
          onSetActiveView('notes')
        }}
        onApplyNote={(noteId, content) => {
          if (noteId) {
            onUpdateNote(noteId, { content } as any)
          } else {
            const activeNoteId = notes[0]?.id
            if (activeNoteId) onUpdateNote(activeNoteId, { content } as any)
          }
        }}
        onCreateNote={(title, content, folderId) => {
          const created: any = onAddNote(title, folderId)
          if (created?.id) {
            if (content) onUpdateNote(created.id, { content } as any)
            onSetPendingNoteId(created.id)
            onSetActiveView('notes')
          }
        }}
        onAddFolder={(name, parentId) => onAddNoteFolder(name, parentId)}
        onUpdateFolder={(folderId, updates) => onUpdateNoteFolder(folderId, updates)}
        onUpdateNote={(noteId, updates) => onUpdateNote(noteId, updates)}
        conversationsDir={settings.dataDir || undefined}
      />

      {showUpdateModal && (
        <UpdateModal onClose={() => setShowUpdateModal(false)} />
      )}
    </>
  )
}
