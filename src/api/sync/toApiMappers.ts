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
  ColorPalette,
  SprintCard,
  SprintColumnSection,
  AgendaCategory,
} from '../../renderer/types'
import { Payload, i32 } from './sync.types'

export function cardToApi(c: Card): Payload {
  return {
    title: c.title,
    description_html: c.descriptionHtml ?? '',
    location_day: c.location?.day ?? null,
    location_period: c.location?.period ?? null,
    sort_order: i32(c.order, 0),
    date: c.date ?? null,
    time: c.time ?? null,
    has_date: c.hasDate ?? false,
    is_locked: c.isLocked ?? false,
    priority: c.priority ?? null,
    status: c.status ?? 'todo',
    checklist: (c.checklist ?? []).map(item => ({ id: item.id, text: item.text, done: item.done })),
    duration_minutes: c.durationMinutes ?? null,
    project_id: c.projectId ?? null,
    in_sprint: c.inSprint ?? false,
    sprint_column_id: c.sprintColumnId ?? null,
    sprint_section_id: c.sprintSectionId ?? null,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  }
}

export function noteToApi(note: Note, content: string): Payload {
  return {
    title: note.title,
    content: content ?? '',
    content_format: 'html',
    ...(note.checksum ? { base_checksum: note.checksum } : {}),
    folder_id: note.folderId ?? null,
    project_id: note.projectId ?? null,
    parent_note_id: note.parentNoteId ?? null,
    is_pinned: note.isPinned ?? false,
    is_favorite: note.isFavorite ?? false,
    is_locked: note.isLocked ?? false,
    sort_order: i32(note.order, 0),
  }
}

export function noteFolderToApi(f: NoteFolder): Payload {
  return {
    name: f.name,
    parent_id: f.parentId ?? null,
    sort_order: i32(f.order, 0),
    is_home: f.isHome ?? false,
  }
}

export function projectToApi(p: Project): Payload {
  return {
    name: p.name,
    path: p.path ?? '',
    description: p.description ?? '',
    color: p.color ?? '',
    preferred_ide_id: p.preferredIdeId ?? null,
    sort_order: i32(p.order, 0),
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }
}

export function calendarEventToApi(e: CalendarEvent): Payload {
  return {
    title: e.title,
    date: e.date,
    time: e.time ?? null,
    recurrence: e.recurrence ?? null,
    reminder: e.reminder ?? null,
    description: e.description ?? '',
    color: e.color ?? '',
    category_id: e.categoryId ?? null,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  }
}

export function billToApi(bill: Bill): Payload {
  return {
    name: bill.name,
    amount: bill.amount ?? 0,
    due_day: bill.dueDay ?? 1,
    category: bill.category ?? 'outro',
    recurrence: bill.recurrence ?? 'monthly',
    is_paid: bill.isPaid ?? false,
    paid_date: bill.paidDate ?? null,
    created_at: bill.createdAt,
  }
}

export function expenseToApi(e: Expense): Payload {
  return {
    description: e.description,
    amount: e.amount ?? 0,
    category: e.category ?? 'outro',
    date: e.date,
    installments: e.installments ?? 1,
    current_installment: e.currentInstallment ?? 1,
    parent_id: e.parentId ?? null,
    note: e.note ?? '',
    created_at: e.createdAt,
  }
}

export function incomeToApi(i: IncomeEntry): Payload {
  return {
    source: i.source,
    amount: i.amount ?? 0,
    date: i.date,
    kind: i.kind ?? 'fixed',
    recurrence_months: i.recurrenceMonths ?? 1,
    recurrence_index: i.recurrenceIndex ?? 1,
    recurrence_group_id: i.recurrenceGroupId ?? null,
    note: i.note ?? '',
    created_at: i.createdAt,
  }
}

export function savingsGoalToApi(g: SavingsGoal): Payload {
  return {
    name: g.name,
    target_amount: g.targetAmount ?? 0,
    current_amount: g.currentAmount ?? 0,
    deadline: g.deadline ?? null,
    created_at: g.createdAt,
  }
}

export function investmentToApi(i: Investment): Payload {
  return {
    name: i.name,
    type: i.type,
    institution: i.institution ?? '',
    invested_amount: i.investedAmount ?? 0,
    current_value: i.currentValue ?? 0,
    date: i.date,
    notes: i.notes ?? '',
    created_at: i.createdAt,
  }
}

export function meetingToApi(m: Meeting): Payload {
  return {
    title: m.title,
    notes: m.transcription ?? '',
    audio_path: m.audioPath ?? null,
    duration_min: Math.round((m.duration ?? 0) / 60),
    date: m.createdAt ? m.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    created_at: m.createdAt,
    updated_at: m.updatedAt,
  }
}

export function studyGoalToApi(g: StudyGoal): Payload {
  return {
    title: g.title,
    description: g.description ?? '',
    category: g.category ?? '',
    priority: g.priority ?? null,
    status: g.status ?? 'todo',
    checklist: g.checklist ?? [],
    linked_planning_card_id: g.linkedPlanningCardId ?? null,
    created_at: g.createdAt,
    updated_at: g.updatedAt ?? g.createdAt,
  }
}

export function studyMediaItemToApi(m: StudyMediaItem): Payload {
  return {
    title: m.title,
    url: m.url ?? '',
    type: m.kind,
    youtube_video_id: m.youtubeVideoId ?? null,
    volume: m.volume ?? 1,
    loop: m.loop ?? false,
    show_dock: m.showDock ?? false,
  }
}

export function colorPaletteToApi(p: ColorPalette): Payload {
  return {
    name: p.name,
    colors: p.colors ?? [],
    sort_order: i32(p.order, 0),
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }
}

export function sprintCardToApi(c: SprintCard): Payload {
  return {
    title: c.title,
    description: c.description ?? '',
    priority: c.priority ?? null,
    status: c.status ?? 'todo',
    checklist: c.checklist ?? [],
    column_id: c.columnId ?? null,
    section_id: c.sectionId ?? null,
    sort_order: i32(c.order, 0),
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  }
}

export function sprintColumnSectionToApi(s: SprintColumnSection): Payload {
  return {
    column_id: s.columnId,
    name: s.name,
    sort_order: i32(s.order, 0),
  }
}

export function calendarCategoryToApi(c: AgendaCategory): Payload {
  return { name: c.name, color: c.color ?? '#6366f1' }
}
