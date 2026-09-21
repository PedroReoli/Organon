
import type { SettingsViewProps } from '@types'
import { useSettingsView }       from './hooks/useSettingsView'
import { SettingsNav }           from './SettingsNav'
import { ThemeSection }          from './sections/ThemeSection'
import { AudioSection }          from './sections/AudioSection'
import { DataSection }           from './sections/DataSection'
import { IdesSection }           from './sections/IdesSection'
import { ShortcutsSection }      from './sections/ShortcutsSection'
import { BackupSection }         from './sections/BackupSection'
import { PlannerSection }        from './sections/PlannerSection'
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

        <PlannerSection
          activeSection={v.activeSection}
          userLoggedIn={props.userLoggedIn}
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
      </div>
    </div>
  )
}
