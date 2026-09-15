export interface NoteFolder {
  id: string
  name: string
  parentId: string | null
  order: number
  isHome: boolean
  deletedAt?: string | null
  deletedFromParentId?: string | null
}

export interface Note {
  id: string
  title: string
  mdPath: string
  folderId: string | null
  parentNoteId: string | null
  projectId: string | null
  checksum?: string
  isPinned: boolean
  isFavorite: boolean
  isLocked: boolean
  createdAt: string
  updatedAt: string
  order: number
  deletedAt?: string | null
  deletedFromFolderId?: string | null
  bookmarks?: NoteBookmark[]
}

export const NOTE_TRASH_RETENTION_DAYS = 30

export interface NoteBookmark {
  id: string
  label: string
  anchor: string
  createdAt: string
}

export interface NoteTemplate {
  id: string
  name: string
  description?: string
  category?: string
  icon?: string
  content: string
  variables?: NoteTemplateVariable[]
  isDefaultDaily?: boolean
  order: number
  createdAt: string
  updatedAt: string
}

export interface NoteTemplateVariable {
  key: string
  label: string
  defaultValue?: string
}

export const BUILTIN_NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'builtin-daily',
    name: 'Daily Note',
    description: 'Template diario com agenda + tarefas + reflexao',
    category: 'daily',
    icon: 'calendar',
    content: '<h1>{{date}}</h1><h2>Agenda</h2><ul><li></li></ul><h2>Tarefas do dia</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div></div></li></ul><h2>Reflexão</h2><p></p>',
    variables: [
      { key: 'date', label: 'Data atual' },
    ],
    isDefaultDaily: true,
    order: 0,
    createdAt: '2026-04-11T00:00:00Z',
    updatedAt: '2026-04-11T00:00:00Z',
  },
  {
    id: 'builtin-meeting',
    name: 'Reunião',
    description: 'Template de ata de reuniao',
    category: 'reuniao',
    icon: 'users',
    content: '<h1>{{title}}</h1><p><strong>Data:</strong> {{date}} {{time}}</p><h2>Participantes</h2><ul><li></li></ul><h2>Agenda</h2><ol><li></li></ol><h2>Decisões</h2><ul><li></li></ul><h2>Próximos passos</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div></div></li></ul>',
    variables: [
      { key: 'title', label: 'Titulo da reuniao' },
      { key: 'date', label: 'Data' },
      { key: 'time', label: 'Hora' },
    ],
    order: 1,
    createdAt: '2026-04-11T00:00:00Z',
    updatedAt: '2026-04-11T00:00:00Z',
  },
  {
    id: 'builtin-project',
    name: 'Projeto',
    description: 'Template inicial de projeto',
    category: 'projeto',
    icon: 'rocket',
    content: '<h1>{{title}}</h1><h2>Objetivo</h2><p></p><h2>Escopo</h2><ul><li></li></ul><h2>Milestones</h2><ol><li></li></ol><h2>Riscos</h2><ul><li></li></ul><h2>Notas</h2><p></p>',
    variables: [
      { key: 'title', label: 'Nome do projeto' },
    ],
    order: 2,
    createdAt: '2026-04-11T00:00:00Z',
    updatedAt: '2026-04-11T00:00:00Z',
  },
]

export interface CanvasFolder {
  id: string
  name: string
  parentId: string | null
  order: number
  createdAt: string
}

export interface CanvasVersionEntry {
  id: string
  createdAt: string
  snapshot: Record<string, unknown>
  thumbnail?: string
}

export const CANVAS_VERSIONS_LIMIT = 10

export interface NoteLinkRef {
  sourceNoteId: string
  targetTitle: string
  targetNoteId: string | null
  contextSnippet: string
}
