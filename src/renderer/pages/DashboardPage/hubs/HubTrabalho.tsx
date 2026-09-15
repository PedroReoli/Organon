import type { ComponentProps } from 'react'
import { HubCRM } from './HubCRM'
import { CodeReportsView } from '@Projects/reports/CodeReportsView'
import type { AppView } from '@shared/InternalNav'
import type { CRMSnapshot, CalendarEvent } from '@types'

type HubTrabalhoProps = {
  activeView: AppView
  reportsDir?: string | null
  dataDir?: string | null
  onUpdateReportsDir?: (dir: string) => void
} & Omit<ComponentProps<typeof HubCRM>, 'snapshots' | 'onUpsertSnapshot' | 'onAddEvent' | 'onMigrateCRMStages'> & {
  snapshots?: CRMSnapshot[]
  onUpsertSnapshot: (snapshot: CRMSnapshot) => void
  onAddEvent: (input: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void
  onMigrateCRMStages: () => void
}

export const HubTrabalho = ({
  activeView,
  reportsDir,
  dataDir,
  onUpdateReportsDir,
  // crm
  contacts,
  interactions,
  tags,
  notes,
  calendarEvents,
  projects,
  onAddContact,
  onUpdateContact,
  onRemoveContact,
  onMoveContactToStage,
  onReorderContacts,
  onAddInteraction,
  onRemoveInteraction,
  onAddTag,
  onRemoveTag,
  onAddLink,
  onRemoveLink,
  snapshots,
  onUpsertSnapshot,
  onAddEvent,
  onMigrateCRMStages,
}: HubTrabalhoProps) => {
  if (activeView === 'crm') {
    return (
      <HubCRM
        contacts={contacts}
        interactions={interactions}
        tags={tags}
        snapshots={snapshots ?? []}
        notes={notes}
        calendarEvents={calendarEvents}
        projects={projects ?? []}
        onAddContact={onAddContact}
        onUpdateContact={onUpdateContact}
        onRemoveContact={onRemoveContact}
        onMoveContactToStage={onMoveContactToStage}
        onReorderContacts={onReorderContacts}
        onAddInteraction={onAddInteraction}
        onRemoveInteraction={onRemoveInteraction}
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
        onAddLink={onAddLink}
        onRemoveLink={onRemoveLink}
        onUpsertSnapshot={onUpsertSnapshot}
        onAddEvent={onAddEvent}
        onMigrateCRMStages={onMigrateCRMStages}
      />
    )
  }

  if (activeView === 'projects') {
    return <CodeReportsView reportsDir={reportsDir} dataDir={dataDir} onUpdateReportsDir={onUpdateReportsDir} />
  }

  return null
}

