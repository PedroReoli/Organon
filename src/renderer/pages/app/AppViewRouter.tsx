import React, { lazy, Suspense } from 'react'
import type {
  Card,
  CalendarEvent,
  Note,
  NoteFolder,
  ColorPalette,
  ClipboardCategory,
  ClipboardItem,
  AppItem,
  StudyState,
  Settings,
  DashboardWidget,
  Project,
  Meeting,
  NoteTemplate,
  NoteBookmark,
  CanvasFolder,
  CanvasVersionEntry,
} from '@types'
import { DEFAULT_DASHBOARD_WIDGETS } from '@types'
import type { AppView } from '../shared/InternalNav'
import { DashboardPage, type DashboardHubCard, type DashboardSyncStatus } from '../DashboardPage/DashboardPage'
import { ViewLoadingSkeleton } from '../shared/components/display/ViewLoadingSkeleton'

// Lazy loading com code splitting dos módulos pesados
const CanvasView = lazy(() => import('../CanvasPage/canvas').then(m => ({ default: m.CanvasView })))
const WhisperPage = lazy(() => import('../WhisperPage/WhisperPage').then(m => ({ default: m.WhisperPage })))
const AudioPage = lazy(() => import('../AudioPage/AudioPage').then(m => ({ default: m.AudioPage })))
const OKRsPage = lazy(() => import('../OKRsPage/OKRsPage').then(m => ({ default: m.OKRsPage })))
const SystemDesignPage = lazy(() => import('../SystemDesignPage/SystemDesignPage').then(m => ({ default: m.SystemDesignPage })))
const PlannerPage = lazy(() => import('../PlannerPage').then(m => ({ default: m.PlannerPage })))
const HubConhecimento = lazy(() => import('../DashboardPage/hubs/HubConhecimento').then(m => ({ default: m.HubConhecimento })))
const HubEstudos = lazy(() => import('../DashboardPage/hubs/HubEstudos').then(m => ({ default: m.HubEstudos })))
const HubTrabalho = lazy(() => import('../DashboardPage/hubs/HubTrabalho').then(m => ({ default: m.HubTrabalho })))
const HubFerramentas = lazy(() => import('../DashboardPage/hubs/HubFerramentas').then(m => ({ default: m.HubFerramentas })))
const HubSistema = lazy(() => import('../DashboardPage/hubs/HubSistema').then(m => ({ default: m.HubSistema })))

interface AppViewRouterProps {
  activeView: AppView
  activeZoom: number
  cards: Card[]
  calendarEvents: CalendarEvent[]
  notes: Note[]
  noteFolders: NoteFolder[]
  colorPalettes: ColorPalette[]
  clipboardCategories: ClipboardCategory[]
  clipboardItems: ClipboardItem[]
  apps: AppItem[]
  study: StudyState
  settings: Settings
  projects: Project[]
  meetings: Meeting[]
  onUpdateMeeting: (meetingId: string, updates: Partial<Meeting>) => void
  onRemoveMeeting: (meetingId: string) => void
  onReplaceMeetings: (meetings: Meeting[]) => void
  registeredIDEs: any[]
  dashboardHubs: DashboardHubCard[]
  syncStatus: DashboardSyncStatus
  syncError?: string | null
  lastSyncAt?: string | null
  userLoggedIn: boolean
  isConfigured: boolean
  pendingNoteId: string | null
  reduceModeSignal: number
  keyboardShortcuts: any[]
  noteTemplates: NoteTemplate[]
  canvasFolders: CanvasFolder[]
  canvasFolderAssignments: Record<string, string | null>
  canvasVersions: Record<string, CanvasVersionEntry[]>
  onSetActiveView: (view: AppView) => void
  onEditCard: (cardId: string, updates: any) => void
  onAddCard: (title: string) => void
  onAddCalendarEvent: (event: any) => void
  onAddNote: (title: string, folderId?: string | null, projectId?: string | null, parentNoteId?: string | null) => any
  onUpdateNote: (noteId: string, updates: any) => void
  onToggleNoteFavorite: (id: string) => void
  onToggleNotePinned: (id: string) => void
  onToggleNoteLock: (id: string) => void
  onReorderNotes: (ids: string[]) => void
  onReorderNoteFolders: (ids: string[]) => void
  onAddNoteFolder: (name: string, parentId?: string | null) => any
  onUpdateNoteFolder: (folderId: string, updates: any) => void
  onSoftDeleteNote: (id: string) => void
  onSoftDeleteNoteFolder: (id: string) => void
  onRestoreNote: (id: string) => void
  onRestoreNoteFolder: (id: string) => void
  onPurgeNote: (id: string) => void
  onPurgeNoteFolder: (id: string) => void
  onEmptyNotesTrash: () => void
  onSetNoteBookmarks: (noteId: string, bookmarks: NoteBookmark[]) => void
  onSetPendingNoteId: (id: string | null) => void
  onUpdateStudy: (study: any) => void
  onUpdateSettings: (settings: Partial<Settings>) => void
  onOpenShortcut: (url: string) => void
  onUpdateDashboardLayout: (layout: any) => void
  onUpdateDashboardWidgets: (widgets: DashboardWidget[]) => void
  onSaveDashboardTemplate: (name: string, type: any, widgets: DashboardWidget[]) => void
  onDeleteDashboardTemplate: (name: string) => void
  onAddCanvasFolder: (name: string, parentId?: string | null) => any
  onRenameCanvasFolder: (folderId: string, name: string) => void
  onRemoveCanvasFolder: (folderId: string) => void
  onMoveCanvasToFolder: (canvasId: string, folderId: string | null) => void
  onSnapshotCanvasVersion: (canvasId: string, snapshot: Record<string, unknown>, thumbnail?: string) => void
  onRemoveCanvasVersion: (canvasId: string, versionId: string) => void
  onAddClipboardCategory: (name: string) => void
  onRenameClipboardCategory: (catId: string, name: string) => void
  onRemoveClipboardCategory: (catId: string) => void
  onAddClipboardItem: (item: any) => void
  onUpdateClipboardItem: (itemId: string, updates: any) => void
  onRemoveClipboardItem: (itemId: string) => void
  onMoveClipboardItemToCategory: (itemId: string, catId: string | null) => void
  onIncrementClipboardCopyCount: (itemId: string) => void
  onToggleClipboardSnippet: (itemId: string) => void
  onAddColorPalette: (name: string, colors: string[]) => any
  onUpdateColorPalette: (paletteId: string, updates: any) => void
  onRemoveColorPalette: (paletteId: string) => void
  onAddRegisteredIDE: (ide: any) => void
  onUpdateRegisteredIDE: (id: string, updates: any) => void
  onRemoveRegisteredIDE: (id: string) => void
  onResetStore: () => Promise<void>
  onRunSyncNow: () => void
  onLoginWithSync: (email: string, pass: string) => Promise<boolean>
  onRegisterWithSync: (email: string, pass: string, name?: string) => Promise<boolean>
  auth: {
    user: any
    authError: string | null
    isRestoring: boolean
    logout: () => void
    clearError: () => void
    updateProfile: (updates: any) => Promise<boolean>
  }
}

export const AppViewRouter: React.FC<AppViewRouterProps> = (props) => {
  const {
    activeView,
    activeZoom,
    cards,
    calendarEvents,
    notes,
    noteFolders,
    colorPalettes,
    clipboardCategories,
    clipboardItems,
    apps,
    study,
    settings,
    projects,
    meetings,
    onUpdateMeeting,
    onRemoveMeeting,
    onReplaceMeetings,
    registeredIDEs,
    dashboardHubs,
    syncStatus,
    syncError,
    lastSyncAt,
    userLoggedIn,
    isConfigured,
    pendingNoteId,
    reduceModeSignal,
    keyboardShortcuts,
    noteTemplates,
    canvasFolders,
    canvasFolderAssignments,
    canvasVersions,
    onSetActiveView,
    onEditCard,
    onAddCard,
    onAddCalendarEvent,
    onAddNote,
    onUpdateNote,
    onToggleNoteFavorite,
    onToggleNotePinned,
    onToggleNoteLock,
    onReorderNotes,
    onReorderNoteFolders,
    onAddNoteFolder,
    onUpdateNoteFolder,
    onSoftDeleteNote,
    onSoftDeleteNoteFolder,
    onRestoreNote,
    onRestoreNoteFolder,
    onPurgeNote,
    onPurgeNoteFolder,
    onEmptyNotesTrash,
    onSetNoteBookmarks,
    onSetPendingNoteId,
    onUpdateStudy,
    onUpdateSettings,
    onOpenShortcut,
    onUpdateDashboardLayout,
    onUpdateDashboardWidgets,
    onSaveDashboardTemplate,
    onDeleteDashboardTemplate,
    onAddCanvasFolder,
    onRenameCanvasFolder,
    onRemoveCanvasFolder,
    onMoveCanvasToFolder,
    onSnapshotCanvasVersion,
    onRemoveCanvasVersion,
    onAddClipboardCategory,
    onRenameClipboardCategory,
    onRemoveClipboardCategory,
    onAddClipboardItem,
    onUpdateClipboardItem,
    onRemoveClipboardItem,
    onMoveClipboardItemToCategory,
    onIncrementClipboardCopyCount,
    onToggleClipboardSnippet,
    onAddColorPalette,
    onUpdateColorPalette,
    onRemoveColorPalette,
    onAddRegisteredIDE,
    onUpdateRegisteredIDE,
    onRemoveRegisteredIDE,
    onResetStore,
    onRunSyncNow,
    onLoginWithSync,
    onRegisterWithSync,
    auth,
  } = props

  return (
    <div className="app-body" style={{ flex: 1, overflow: 'hidden' }}>
      <div
        key={activeView}
        className="app-view view-tab-enter"
        style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {activeView === 'today' && (
          <DashboardPage
            cards={cards}
            calendarEvents={calendarEvents}
            notes={notes}
            study={study}
            hubCards={dashboardHubs}
            projectsCount={projects.length}
            colorPalettesCount={colorPalettes.length}
            clipboardCategoriesCount={clipboardCategories.length}
            clipboardItemsCount={clipboardItems.length}
            syncStatus={syncStatus}
            lastSyncAt={lastSyncAt}
            userLoggedIn={userLoggedIn}
            dashboardLayout={settings.dashboardLayout ?? 'hub'}
            dashboardWidgets={settings.dashboardWidgets ?? DEFAULT_DASHBOARD_WIDGETS}
            onDashboardLayoutChange={onUpdateDashboardLayout}
            onDashboardWidgetsChange={onUpdateDashboardWidgets}
            dashboardTemplates={settings.dashboardTemplates ?? []}
            onSaveTemplate={(name: string, widgets: DashboardWidget[]) =>
              onSaveDashboardTemplate(name, 'custom', widgets)
            }
            onDeleteTemplate={onDeleteDashboardTemplate}
            onGoToPlannerCard={(_cardId: string) => {
              onSetActiveView('planner')
            }}
            onGoToCalendarDate={(_dateISO: string) => {
              onSetActiveView('calendar')
            }}
            onOpenShortcut={onOpenShortcut}
            onGoToNotes={() => onSetActiveView('notes')}
            onNavigate={(view: AppView) => onSetActiveView(view)}
            onEditCard={onEditCard}
          />
        )}

        {activeView !== 'today' && (
          <div
            className="app-view-content app-view-content-enter"
            style={activeZoom !== 1 ? { zoom: activeZoom } : undefined}
          >
            {(activeView === 'agenda' || activeView === 'planner' || activeView === 'calendar') && (
              <Suspense fallback={<ViewLoadingSkeleton title="Carregando Planejador..." message="Preparando tarefas e calendário" />}>
                <PlannerPage />
              </Suspense>
            )}

            {activeView === 'notes' && (
              <Suspense fallback={<ViewLoadingSkeleton title="Carregando Notas..." message="Preparando editor e árvore de conhecimento" />}>
                <HubConhecimento
                notes={notes}
                folders={noteFolders}
                onAddNote={(title: string, folderId?: string | null, projectId?: string | null, parentNoteId?: string | null) =>
                  onAddNote(typeof title === 'string' ? title : 'Nova nota', folderId, projectId, parentNoteId)
                }
                onUpdateNote={onUpdateNote}
                onToggleFavorite={onToggleNoteFavorite}
                onTogglePinned={onToggleNotePinned}
                onToggleLock={onToggleNoteLock}
                onReorderNotes={onReorderNotes}
                onReorderFolders={onReorderNoteFolders}
                onRemoveNote={onSoftDeleteNote}
                onAddFolder={(name: string) => onAddNoteFolder(name)}
                onUpdateFolder={onUpdateNoteFolder}
                onRemoveFolder={onSoftDeleteNoteFolder}
                reduceModeSignal={reduceModeSignal}
                initialNoteId={pendingNoteId}
                onInitialNoteConsumed={() => onSetPendingNoteId(null)}
                keyboardShortcuts={keyboardShortcuts}
                onSoftDeleteNote={onSoftDeleteNote}
                onSoftDeleteFolder={onSoftDeleteNoteFolder}
                onRestoreNote={onRestoreNote}
                onRestoreFolder={onRestoreNoteFolder}
                onPurgeNote={onPurgeNote}
                onPurgeFolder={onPurgeNoteFolder}
                onEmptyTrash={onEmptyNotesTrash}
                noteTemplates={noteTemplates}
                onSetNoteBookmarks={onSetNoteBookmarks}
                />
              </Suspense>
            )}

            {activeView === 'study' && (
              <Suspense fallback={<ViewLoadingSkeleton title="Carregando Estudos..." message="Preparando foco e materiais" />}>
                <HubEstudos
                activeView={activeView}
                cards={cards}
                study={study}
                onUpdateStudy={onUpdateStudy}
                onUpdatePlanningCard={(cardId: string, updates: Partial<Pick<Card, 'title' | 'descriptionHtml' | 'priority' | 'status' | 'checklist'>>) =>
                  onEditCard(cardId, updates)
                }
                />
              </Suspense>
            )}

            {activeView === 'projects' && (
              <Suspense fallback={<ViewLoadingSkeleton title="Carregando Projetos..." message="Preparando relatórios locais" />}>
                <HubTrabalho
                activeView={activeView}
                reportsDir={settings.reportsDir}
                dataDir={settings.dataDir}
                onUpdateReportsDir={(dir: string) => onUpdateSettings({ reportsDir: dir })}
                />
              </Suspense>
            )}

            {activeView === 'canvas' && (
              <Suspense
                fallback={
                  <ViewLoadingSkeleton
                    title="Carregando Canvas..."
                    message="Inicializando ambiente de desenho vetorial"
                  />
                }
              >
                <CanvasView
                  userLoggedIn={userLoggedIn}
                  canvasFolders={canvasFolders}
                  canvasFolderAssignments={canvasFolderAssignments}
                  canvasVersions={canvasVersions}
                  onAddCanvasFolder={(name: string) => onAddCanvasFolder(name)}
                  onRenameCanvasFolder={onRenameCanvasFolder}
                  onRemoveCanvasFolder={onRemoveCanvasFolder}
                  onMoveCanvasToFolder={onMoveCanvasToFolder}
                  onSnapshotVersion={onSnapshotCanvasVersion}
                  onRemoveVersion={onRemoveCanvasVersion}
                />
              </Suspense>
            )}

            {activeView === 'transcripts' && (
              <Suspense
                fallback={
                  <ViewLoadingSkeleton
                    title="Carregando Transcrições..."
                    message="Conectando aos modelos Whisper locais"
                  />
                }
              >
                <WhisperPage
                  onExportToNote={(title, content) => onAddNote(title, content)}
                  meetings={meetings}
                  settings={settings}
                  onUpdateMeeting={onUpdateMeeting}
                  onRemoveMeeting={onRemoveMeeting}
                  onReplaceMeetings={onReplaceMeetings}
                  onUpdateSettings={onUpdateSettings}
                />
              </Suspense>
            )}

            {activeView === 'audio' && (
              <Suspense
                fallback={
                  <ViewLoadingSkeleton
                    title="Carregando Áudio..."
                    message="Preparando interface de gravações"
                  />
                }
              >
                <AudioPage />
              </Suspense>
            )}

            {activeView === 'okrs' && (
              <Suspense
                fallback={
                  <ViewLoadingSkeleton
                    title="Carregando Metas & OKRs..."
                    message="Calculando progresso dos resultados-chave"
                  />
                }
              >
                <OKRsPage />
              </Suspense>
            )}

            {activeView === 'system-design' && (
              <Suspense
                fallback={
                  <ViewLoadingSkeleton
                    title="Carregando System Design..."
                    message="Preparando canvas de arquitetura"
                  />
                }
              >
                <SystemDesignPage />
              </Suspense>
            )}

            {(['clipboard', 'colors'] as AppView[]).includes(activeView) && (
              <Suspense fallback={<ViewLoadingSkeleton title="Carregando Ferramentas..." message="Preparando utilitários" />}>
                <HubFerramentas
                activeView={activeView}
                categories={clipboardCategories}
                items={clipboardItems}
                onAddCategory={onAddClipboardCategory}
                onRenameCategory={onRenameClipboardCategory}
                onRemoveCategory={onRemoveClipboardCategory}
                onAddItem={onAddClipboardItem}
                onUpdateItem={onUpdateClipboardItem}
                onRemoveItem={onRemoveClipboardItem}
                onMoveItemToCategory={onMoveClipboardItemToCategory}
                onIncrementCopyCount={onIncrementClipboardCopyCount}
                onToggleSnippet={onToggleClipboardSnippet}
                palettes={colorPalettes}
                onAddPalette={onAddColorPalette}
                onUpdatePalette={onUpdateColorPalette}
                onRemovePalette={onRemoveColorPalette}
                />
              </Suspense>
            )}

            {(activeView === 'settings' || activeView === 'history') && (
              <Suspense fallback={<ViewLoadingSkeleton title="Carregando Sistema..." message="Preparando configurações" />}>
                <HubSistema
                activeView={activeView}
                settings={settings}
                onUpdateSettings={onUpdateSettings}
                registeredIDEs={registeredIDEs}
                onAddRegisteredIDE={onAddRegisteredIDE}
                onUpdateRegisteredIDE={onUpdateRegisteredIDE}
                onRemoveRegisteredIDE={onRemoveRegisteredIDE}
                onResetStore={onResetStore}
                onOpenHistory={() => onSetActiveView('history')}
                onAddNote={onAddNote}
                onAddCard={onAddCard}
                onAddCalendarEvent={onAddCalendarEvent}
                syncStatus={syncStatus}
                syncError={syncError ?? null}
                lastSyncAt={lastSyncAt ?? null}
                onSync={onRunSyncNow}
                isConfigured={isConfigured}
                userLoggedIn={userLoggedIn}
                onLogin={onLoginWithSync}
                onRegister={onRegisterWithSync}
                onLogout={auth.logout}
                authError={auth.authError}
                onClearAuthError={auth.clearError}
                authUser={auth.user}
                authLoading={auth.isRestoring}
                onUpdateProfile={auth.updateProfile}
                profilePhotoDataUrl={settings.profilePhotoDataUrl}
                onUpdateProfilePhoto={(dataUrl: string | null) =>
                  onUpdateSettings({ profilePhotoDataUrl: dataUrl ?? undefined })
                }
                notes={notes}
                cards={cards}
                events={calendarEvents}
                projects={projects}
                meetings={meetings}
                apps={apps}
                colorPalettes={colorPalettes}
                />
              </Suspense>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
