import { useMemo } from 'react'
import { SettingsView } from '@Settings/SettingsPage'
import { HistoryView } from '@Settings/HistoryView'
import type { AppView } from '@shared/InternalNav'
import type { ComponentProps } from 'react'
import type { SyncStatus } from '../../shared/hooks/useSync'

type SettingsProps = ComponentProps<typeof SettingsView>
type HistoryProps  = ComponentProps<typeof HistoryView>

type HubSistemaProps = {
  activeView: AppView
  syncStatus: SyncStatus
  syncError: string | null
  lastSyncAt: string | null | undefined
  crmContacts?: { length: number }
  colorPalettes?: { length: number }
} & Omit<SettingsProps, 'isSyncing' | 'storeSummary' | 'syncStatus' | 'syncError'>
  & HistoryProps

export const HubSistema = ({
  activeView,
  // settings
  settings, onUpdateSettings,
  registeredIDEs, onAddRegisteredIDE, onUpdateRegisteredIDE, onRemoveRegisteredIDE,
  onResetStore, onOpenHistory, onAddNote, onAddCard, onAddCalendarEvent,
  syncStatus, syncError, onSync,
  isConfigured, userLoggedIn,
  onLogin, onRegister, onLogout,
  authError, onClearAuthError, authUser, authLoading, onUpdateProfile,
  profilePhotoDataUrl, onUpdateProfilePhoto,
  // history + summary data
  notes, cards, events, projects, meetings,
  lastSyncAt,
  crmContacts, colorPalettes,
}: HubSistemaProps) => {
  const storeSummary = useMemo(() => ({
    lastSyncAt: lastSyncAt ?? undefined,
    counts: [
      { label: 'Notas',        n: notes?.length        ?? 0 },
      { label: 'Cards',        n: cards?.length        ?? 0 },
      { label: 'Eventos',      n: events?.length       ?? 0 },
      { label: 'Projetos',     n: projects?.length     ?? 0 },
      { label: 'Reuniões',     n: meetings?.length     ?? 0 },
      { label: 'Contatos CRM', n: crmContacts?.length  ?? 0 },
      { label: 'Paletas',      n: colorPalettes?.length ?? 0 },
    ],
    recentNotes: [...(notes ?? [])]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5)
      .map(n => ({ id: n.id, title: n.title, updatedAt: n.updatedAt })),
  }), [lastSyncAt, notes, cards, events, projects, meetings, crmContacts, colorPalettes])


  if (activeView === 'settings') {
    return (
      <SettingsView
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        registeredIDEs={registeredIDEs}
        onAddRegisteredIDE={onAddRegisteredIDE}
        onUpdateRegisteredIDE={onUpdateRegisteredIDE}
        onRemoveRegisteredIDE={onRemoveRegisteredIDE}
        onResetStore={onResetStore}
        onOpenHistory={onOpenHistory}
        onAddNote={onAddNote}
        onAddCard={onAddCard}
        onAddCalendarEvent={onAddCalendarEvent}
        isSyncing={syncStatus === 'syncing'}
        syncStatus={syncStatus}
        syncError={syncError}
        onSync={onSync}
        isConfigured={isConfigured}
        userLoggedIn={userLoggedIn}
        onLogin={onLogin}
        onRegister={onRegister}
        onLogout={onLogout}
        authError={authError}
        onClearAuthError={onClearAuthError}
        authUser={authUser}
        authLoading={authLoading}
        onUpdateProfile={onUpdateProfile}
        profilePhotoDataUrl={profilePhotoDataUrl}
        onUpdateProfilePhoto={onUpdateProfilePhoto}
        storeSummary={storeSummary}
      />
    )
  }

  if (activeView === 'history') {
    return (
      <HistoryView
        cards={cards}
        events={events}
        notes={notes ?? []}
        apps={apps}
        projects={projects}
        meetings={meetings}
      />
    )
  }

  return null
}
