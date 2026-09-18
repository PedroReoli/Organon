import type {
  Card,
  Note,
  NoteFolder,
  CalendarEvent,
  Project,
  Bill,
  Expense,
  IncomeEntry,
  SavingsGoal,
  Investment,
  Meeting,
  StudyGoal,
  StudyMediaItem,
  FinancialConfig,
  ColorPalette,
  BudgetCategory,
  ChecklistItem,
  CardPriority,
  CardStatus,
  ProjectLink,
  CalendarRecurrence,
  CalendarReminder,
  ShortcutFolder,
  ShortcutItem,
  SprintCard,
  SprintColumnSection,
  AgendaCategory,
} from '../../renderer/types'
import { SyncChange } from '../organon'
import {
  Payload,
  PartialSyncedStore,
  now,
  s,
  n,
  b,
  arr,
} from './sync.types'

export function cardFromApi(id: string, p: Payload): Card {
  return {
    id,
    title: s(p.title),
    descriptionHtml: s(p.description_html),
    location: {
      day: (p.location_day as Card['location']['day']) ?? null,
      period: (p.location_period as Card['location']['period']) ?? null,
    },
    order: n(p.sort_order),
    date: p.date ? s(p.date) : null,
    time: p.time ? s(p.time) : null,
    hasDate: b(p.has_date),
    isLocked: b(p.is_locked),
    priority: (p.priority as CardPriority) ?? null,
    status: (p.status as CardStatus) ?? 'todo',
    checklist: arr<ChecklistItem>(p.checklist),
    durationMinutes: typeof p.duration_minutes === 'number' ? p.duration_minutes : null,
    projectId: p.project_id ? s(p.project_id) : null,
    inSprint: b(p.in_sprint),
    sprintColumnId: p.sprint_column_id ? s(p.sprint_column_id) : null,
    sprintSectionId: p.sprint_section_id ? s(p.sprint_section_id) : null,
    createdAt: s(p.created_at) || now(),
    updatedAt: s(p.updated_at) || now(),
  }
}

export function noteFromApi(id: string, p: Payload): Note {
  return {
    id,
    title: s(p.title),
    mdPath: `${id}.md`,
    folderId: p.folder_id ? s(p.folder_id) : null,
    parentNoteId: p.parent_note_id ? s(p.parent_note_id) : null,
    projectId: p.project_id ? s(p.project_id) : null,
    checksum: p.checksum ? s(p.checksum) : undefined,
    isPinned: b(p.is_pinned),
    isFavorite: b(p.is_favorite),
    isLocked: b((p as Payload).is_locked),
    order: n(p.sort_order),
    createdAt: s(p.created_at) || now(),
    updatedAt: s(p.updated_at) || now(),
  }
}

export function noteFolderFromApi(id: string, p: Payload): NoteFolder {
  return {
    id,
    name: s(p.name),
    parentId: p.parent_id ? s(p.parent_id) : null,
    order: n(p.sort_order),
    isHome: b(p.is_home),
  }
}

export function projectFromApi(id: string, p: Payload): Project {
  return {
    id,
    name: s(p.name),
    path: s(p.path),
    description: s(p.description),
    color: s(p.color),
    links: arr<ProjectLink>(p.links),
    preferredIdeId: p.preferred_ide_id ? s(p.preferred_ide_id) : null,
    order: n(p.sort_order),
    createdAt: s(p.created_at) || now(),
    updatedAt: s(p.updated_at) || now(),
  }
}

export function calendarEventFromApi(id: string, p: Payload): CalendarEvent {
  return {
    id,
    title: s(p.title),
    date: s(p.date),
    time: p.time ? s(p.time) : null,
    recurrence: (p.recurrence as CalendarRecurrence) ?? null,
    reminder: (p.reminder as CalendarReminder) ?? null,
    description: s(p.description),
    color: s(p.color),
    categoryId: s(p.category_id) || s(p.category) || null,
    createdAt: s(p.created_at) || now(),
    updatedAt: s(p.updated_at) || now(),
  }
}

export function billFromApi(id: string, p: Payload): Bill {
  return {
    id,
    name: s(p.name),
    amount: n(p.amount),
    dueDay: n(p.due_day, 1),
    category: (p.category as Bill['category']) ?? 'outro',
    recurrence: (p.recurrence as Bill['recurrence']) ?? 'monthly',
    isPaid: b(p.is_paid),
    paidDate: p.paid_date ? s(p.paid_date) : null,
    createdAt: s(p.created_at) || now(),
  }
}

export function expenseFromApi(id: string, p: Payload): Expense {
  return {
    id,
    description: s(p.description),
    amount: n(p.amount),
    category: (p.category as Expense['category']) ?? 'outro',
    date: s(p.date),
    installments: n(p.installments, 1),
    currentInstallment: n(p.current_installment, 1),
    parentId: p.parent_id ? s(p.parent_id) : null,
    note: s(p.note),
    createdAt: s(p.created_at) || now(),
  }
}

export function incomeFromApi(id: string, p: Payload): IncomeEntry {
  return {
    id,
    source: s(p.source),
    amount: n(p.amount),
    date: s(p.date),
    kind: (p.kind as IncomeEntry['kind']) ?? 'fixed',
    recurrenceMonths: n(p.recurrence_months, 1),
    recurrenceIndex: n(p.recurrence_index, 1),
    recurrenceGroupId: p.recurrence_group_id ? s(p.recurrence_group_id) : null,
    note: s(p.note),
    createdAt: s(p.created_at) || now(),
  }
}

export function savingsGoalFromApi(id: string, p: Payload): SavingsGoal {
  return {
    id,
    name: s(p.name),
    targetAmount: n(p.target_amount),
    currentAmount: n(p.current_amount),
    deadline: p.deadline ? s(p.deadline) : null,
    createdAt: s(p.created_at) || now(),
  }
}

export function investmentFromApi(id: string, p: Payload): Investment {
  return {
    id,
    name: s(p.name),
    type: (s(p.type) || 'outro') as Investment['type'],
    institution: s(p.institution),
    investedAmount: n(p.invested_amount),
    currentValue: n(p.current_value),
    date: s(p.date),
    notes: s(p.notes),
    createdAt: s(p.created_at) || now(),
  }
}

export function meetingFromApi(id: string, p: Payload): Meeting {
  return {
    id,
    title: s(p.title),
    transcription: s(p.notes),
    audioPath: p.audio_path ? s(p.audio_path) : null,
    duration: n(p.duration_min) * 60,
    createdAt: s(p.created_at) || now(),
    updatedAt: s(p.updated_at) || now(),
  }
}

export function studyGoalFromApi(id: string, p: Payload): StudyGoal {
  return {
    id,
    title: s(p.title),
    description: s(p.description),
    category: s(p.category),
    priority: (p.priority as CardPriority) ?? null,
    status: (p.status as CardStatus) ?? 'todo',
    checklist: arr<ChecklistItem>(p.checklist),
    linkedPlanningCardId: p.linked_planning_card_id ? s(p.linked_planning_card_id) : null,
    createdAt: s(p.created_at) || now(),
    updatedAt: s(p.updated_at) || now(),
  }
}

export function studyMediaItemFromApi(id: string, p: Payload): StudyMediaItem {
  return {
    id,
    title: s(p.title),
    url: s(p.url),
    kind: (p.type as StudyMediaItem['kind']) ?? 'youtube',
    youtubeVideoId: p.youtube_video_id ? s(p.youtube_video_id) : null,
    volume: n(p.volume, 1),
    loop: b(p.loop),
    showDock: b(p.show_dock),
  }
}

export function colorPaletteFromApi(id: string, p: Payload): ColorPalette {
  return {
    id,
    name: s(p.name),
    colors: arr<string>(p.colors),
    order: n(p.sort_order),
    createdAt: s(p.created_at) || now(),
    updatedAt: s(p.updated_at) || now(),
  }
}

export function sprintCardFromApi(id: string, p: Payload): SprintCard {
  const checklist = typeof p.checklist === 'string' ? JSON.parse(p.checklist) : arr(p.checklist)
  return {
    id,
    title: s(p.title),
    description: s(p.description),
    priority: (p.priority as SprintCard['priority']) ?? null,
    status: (p.status as SprintCard['status']) ?? 'todo',
    checklist,
    columnId: p.column_id ? s(p.column_id) : null,
    sectionId: p.section_id ? s(p.section_id) : null,
    order: n(p.sort_order),
    createdAt: s(p.created_at) || now(),
    updatedAt: s(p.updated_at) || now(),
  }
}

export function sprintColumnSectionFromApi(id: string, p: Payload): SprintColumnSection {
  return {
    id,
    columnId: s(p.column_id),
    name: s(p.name),
    order: n(p.sort_order),
  }
}

export function calendarCategoryFromApi(id: string, p: Payload): AgendaCategory {
  return { id, name: s(p.name), color: s(p.color) || '#6366f1' }
}

export function shortcutFolderFromApi(id: string, p: Payload): ShortcutFolder {
  return {
    id,
    name: s(p.name),
    parentId: p.parent_id ? s(p.parent_id) : null,
    order: n(p.sort_order),
  }
}

export function shortcutItemFromApi(id: string, p: Payload): ShortcutItem {
  return {
    id,
    folderId: p.folder_id ? s(p.folder_id) : null,
    title: s(p.title),
    kind: 'url',
    value: s(p.value),
    icon: p.icon != null ? (p.icon as ShortcutItem['icon']) : null,
    order: n(p.sort_order),
  }
}

export function financeConfigFromApi(p: Payload): FinancialConfig {
  return { monthlyIncome: n(p.monthly_income), monthlySpendingLimit: n(p.monthly_spending_limit) }
}

export function financeConfigBudgetCategoriesFromApi(p: Payload): BudgetCategory[] {
  const raw = arr<Record<string, unknown>>(p.budget_categories)
  return raw.map(c => ({ category: s(c.category), limit: n(c.limit) }))
}

export function studyConfigFromApi(p: Payload): { focusMinutes: number; breakMinutes: number; muteSound: boolean; wallpaperUrl: string } {
  return {
    focusMinutes: n(p.pomodoro_work_min, 25),
    breakMinutes: n(p.pomodoro_break_min, 5),
    muteSound: b(p.mute_sound),
    wallpaperUrl: s(p.wallpaper_url),
  }
}

export function applyChange(
  result: PartialSyncedStore,
  noteContents: Map<string, string>,
  deletedIds: Map<string, string[]>,
  change: SyncChange,
): void {
  if (change.operation === 'delete') {
    const list = deletedIds.get(change.resource) ?? []
    list.push(change.id)
    deletedIds.set(change.resource, list)
    return
  }
  const { id, resource, payload: p } = change
  if (!p) return

  switch (resource) {
    case 'cards':              result.cards.push(cardFromApi(id, p)); break
    case 'notes': {
      const content = s(p.content)
      result.notes.push(noteFromApi(id, p))
      noteContents.set(id, content)
      break
    }
    case 'note_folders':       result.noteFolders.push(noteFolderFromApi(id, p)); break
    case 'calendar_events':    result.calendarEvents.push(calendarEventFromApi(id, p)); break
    case 'projects':           result.projects.push(projectFromApi(id, p)); break
    case 'finance_bills':      result.bills.push(billFromApi(id, p)); break
    case 'finance_expenses':   result.expenses.push(expenseFromApi(id, p)); break
    case 'finance_incomes':    result.incomes.push(incomeFromApi(id, p)); break
    case 'finance_savings_goals':  result.savingsGoals.push(savingsGoalFromApi(id, p)); break
    case 'finance_investments':    result.investments.push(investmentFromApi(id, p)); break
    case 'meetings':           result.meetings.push(meetingFromApi(id, p)); break
    case 'study_goals':        result.studyGoals.push(studyGoalFromApi(id, p)); break
    case 'study_media_items':  result.studyMediaItems.push(studyMediaItemFromApi(id, p)); break
    case 'finance_config':
      result.financeConfig = financeConfigFromApi(p)
      result.financeConfigBudgetCategories = financeConfigBudgetCategoriesFromApi(p)
      break
    case 'study_config':       result.studyConfig = studyConfigFromApi(p); break
    case 'color_palettes':     result.colorPalettes.push(colorPaletteFromApi(id, p)); break
    case 'sprint_cards':       result.sprintCards.push(sprintCardFromApi(id, p)); break
    case 'sprint_column_sections': result.sprintColumnSections.push(sprintColumnSectionFromApi(id, p)); break
    case 'calendar_categories': result.calendarCategories.push(calendarCategoryFromApi(id, p)); break
  }
}
