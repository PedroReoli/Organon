
import type { SettingsViewProps } from '@types'
import { useSettingsView }       from './hooks/useSettingsView'
import { SettingsNav }           from './SettingsNav'
import { ThemeSection }          from './sections/ThemeSection'
import { AudioSection }          from './sections/AudioSection'
import { DataSection }           from './sections/DataSection'
import { IdesSection }           from './sections/IdesSection'
import { ShortcutsSection }      from './sections/ShortcutsSection'
import { BackupSection }         from './sections/BackupSection'
import { CloudSection }          from './sections/CloudSection'
import { AccountSection }        from './sections/AccountSection'
import { PlannerSection }        from './sections/PlannerSection'
import { FinancialSection }      from './sections/FinancialSection'
import { NotesSection }          from './sections/NotesSection'
import { StudySection }          from './sections/StudySection'
import { DebugSection }          from './sections/DebugSection'

export const SettingsView = (props: SettingsViewProps) => {
  const v = useSettingsView(props)

  return (
    <div className="projects-shell projects-theme">
      <SettingsNav
        activeSection={v.activeSection}
        setActiveSection={v.setActiveSection}
        hasSyncError={props.syncStatus === 'error'}
      />

      <div className="projects-content-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        <ThemeSection
          activeSection={v.activeSection}
          settings={props.settings}
          themeCarouselRef={v.themeCarouselRef}
          scrollThemes={v.scrollThemes}
          handleSelectTheme={v.handleSelectTheme}
        />

        {v.activeSection === 'audio' && <AudioSection />}

        <DataSection
          activeSection={v.activeSection}
          settings={props.settings}
          onUpdateSettings={props.onUpdateSettings}
        />

        <IdesSection
          activeSection={v.activeSection}
          registeredIDEs={props.registeredIDEs}
          onRemoveRegisteredIDE={props.onRemoveRegisteredIDE}
          showIdeForm={v.showIdeForm}
          setShowIdeForm={v.setShowIdeForm}
          ideFormName={v.ideFormName}
          setIdeFormName={v.setIdeFormName}
          ideFormExePath={v.ideFormExePath}
          setIdeFormExePath={v.setIdeFormExePath}
          ideFormArgs={v.ideFormArgs}
          setIdeFormArgs={v.setIdeFormArgs}
          ideFormIcon={v.ideFormIcon}
          editingIdeId={v.editingIdeId}
          resetIdeForm={v.resetIdeForm}
          handlePickIdeExe={v.handlePickIdeExe}
          handleSaveIde={v.handleSaveIde}
          handleEditIde={v.handleEditIde}
        />

        <ShortcutsSection
          activeSection={v.activeSection}
          shortcuts={v.shortcuts}
          editingShortcutId={v.editingShortcutId}
          setEditingShortcutId={v.setEditingShortcutId}
          handleSaveShortcut={v.handleSaveShortcut}
          handleResetShortcut={v.handleResetShortcut}
        />

        <BackupSection
          activeSection={v.activeSection}
          showResetConfirm={v.showResetConfirm}
          setShowResetConfirm={v.setShowResetConfirm}
          onResetStore={props.onResetStore}
          onOpenHistory={props.onOpenHistory}
          onAddNote={props.onAddNote}
          onAddCard={props.onAddCard}
          onAddCalendarEvent={props.onAddCalendarEvent}
        />

        <CloudSection
          activeSection={v.activeSection}
          settings={props.settings}
          isConfigured={props.isConfigured}
          userLoggedIn={props.userLoggedIn}
          syncStatus={props.syncStatus}
          syncError={props.syncError}
          onSync={props.onSync}
          pingStatus={v.pingStatus}
          pingReport={v.pingReport}
          handlePing={v.handlePing}
          syncErrorSummary={v.syncErrorSummary}
          syncErrorTime={v.syncErrorTime}
          syncErrorRows={v.syncErrorRows}
          handleDownloadSyncErrorReport={v.handleDownloadSyncErrorReport}
        />

        <PlannerSection
          activeSection={v.activeSection}
          userLoggedIn={props.userLoggedIn}
        />

        <FinancialSection
          activeSection={v.activeSection}
          monthlyIncome={props.financialConfig?.monthlyIncome ?? 0}
          monthlySpendingLimit={props.financialConfig?.monthlySpendingLimit ?? 0}
          currency={props.financialConfig?.currency ?? 'BRL'}
          onSave={props.onUpdateFinancialConfig ?? (() => {})}
        />

        <NotesSection
          activeSection={v.activeSection}
          trashRetentionDays={props.notesConfig?.trashRetentionDays ?? 30}
          dailyNotesEnabled={props.notesConfig?.dailyNotesEnabled ?? false}
          dailyNotesFolder={props.notesConfig?.dailyNotesFolder ?? 'Daily'}
          dailyNotesTitleFormat={props.notesConfig?.dailyNotesTitleFormat ?? '{{date}}'}
          onSave={props.onUpdateNotesConfig ?? (() => {})}
        />

        <StudySection
          activeSection={v.activeSection}
          defaultPresetName={props.studyConfig?.defaultPresetName ?? 'Classic'}
          muteSound={props.studyConfig?.muteSound ?? false}
          onSave={props.onUpdateStudyConfig ?? (() => {})}
        />

        <DebugSection
          activeSection={v.activeSection}
          settings={props.settings}
          onUpdateSettings={props.onUpdateSettings}
        />

        <AccountSection
          activeSection={v.activeSection}
          userLoggedIn={props.userLoggedIn}
          authUser={props.authUser}
          authError={props.authError}
          onClearAuthError={props.onClearAuthError}
          authLoading={props.authLoading}
          profilePhotoDataUrl={props.profilePhotoDataUrl}
          onUpdateProfilePhoto={props.onUpdateProfilePhoto}
          storeSummary={props.storeSummary}
          onLogin={props.onLogin}
          onRegister={props.onRegister}
          onLogout={props.onLogout}
          editingProfileName={v.editingProfileName}
          setEditingProfileName={v.setEditingProfileName}
          profileNameDraft={v.profileNameDraft}
          setProfileNameDraft={v.setProfileNameDraft}
          profileSaving={v.profileSaving}
          profilePhotoInputRef={v.profilePhotoInputRef}
          handleSaveProfileName={v.handleSaveProfileName}
          handleProfilePhotoChange={v.handleProfilePhotoChange}
          authTab={v.authTab}
          setAuthTab={v.setAuthTab}
          authEmail={v.authEmail}
          setAuthEmail={v.setAuthEmail}
          authPassword={v.authPassword}
          setAuthPassword={v.setAuthPassword}
          authPasswordConfirm={v.authPasswordConfirm}
          setAuthPasswordConfirm={v.setAuthPasswordConfirm}
          showAuthPassword={v.showAuthPassword}
          setShowAuthPassword={v.setShowAuthPassword}
          authLocalError={v.authLocalError}
          setAuthLocalError={v.setAuthLocalError}
          authName={v.authName}
          setAuthName={v.setAuthName}
          authSubmitting={v.authSubmitting}
          setAuthSubmitting={v.setAuthSubmitting}
        />
      </div>
    </div>
  )
}
