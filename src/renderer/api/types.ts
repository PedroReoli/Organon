/**
 * Tipos compartilhados para a API v5
 * Use estes tipos em ambos Desktop e Mobile
 */

// ============================================================
// AUTH
// ============================================================

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  createdAt: string
  updatedAt: string
}

export interface AuthTokens {
  token: string
  refreshToken: string
  expiresIn?: number
}

// ============================================================
// DASHBOARD
// ============================================================

export interface DashboardData {
  tasks: Task[]
  events: CalendarEvent[]
  finance: FinanceSummary
  goals: SavingsGoal[]
  fetchedAt: string
}

export interface MobileHome {
  pendingTasks: number
  todayEvents: Array<{ id: string; title: string; time: string | null }>
  balance: { income: number; expenses: number }
}

// ============================================================
// NOTES
// ============================================================

export interface Note {
  id: string
  userId: string
  folderId: string | null
  parentNoteId: string | null
  title: string
  content: string
  contentFormat: 'html' | 'markdown'
  isFavorite: boolean
  isPinned: boolean
  isLocked: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface NoteFolder {
  id: string
  userId: string
  name: string
  parentId: string | null
  isHome: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

// ============================================================
// TASKS (unificado)
// ============================================================

export interface Task {
  id: string
  userId: string
  type: 'task' | 'sprint'
  title: string
  descriptionHtml: string
  columnId: string | null
  sectionId: string | null
  sprintLane: string | null
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' | null
  period: 'morning' | 'afternoon' | 'night' | null
  date: string | null
  hasDate: boolean
  status: 'todo' | 'in_progress' | 'done' | 'cancelled'
  priority: number
  checklist: any[]
  tags: string[]
  sortOrder: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface SprintBoard {
  board: {
    name: string
    lanesEnabled: boolean
    groupsEnabled: boolean
    sectionsEnabled: boolean
  }
  columns: Array<{ name: string; color: string; sortOrder: number }>
  sections: Array<{ columnId: string; name: string; sortOrder: number }>
}

// ============================================================
// CALENDAR
// ============================================================

export interface CalendarEvent {
  id: string
  userId: string
  categoryId: string | null
  title: string
  description: string | null
  date: string
  endDate: string | null
  eventTime: string | null
  color: string | null
  reminderEnabled: boolean
  reminderOffsetMinutes: number | null
  isRecurring: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface CalendarCategory {
  id: string
  userId: string
  name: string
  color: string
  createdAt: string
  deletedAt: string | null
}

// ============================================================
// FINANCE
// ============================================================

export interface FinanceSummary {
  month: string
  income: number
  expenses: number
  balance: number
  pendingBills: number
}

export interface FinanceExpense {
  id: string
  userId: string
  description: string
  amount: number
  category: string | null
  expenseDate: string
  isRecurring: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface FinanceIncome {
  id: string
  userId: string
  description: string
  amount: number
  source: string | null
  incomeDate: string
  isRecurring: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface SavingsGoal {
  id: string
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string | null
  icon: string | null
  color: string | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}


// ============================================================
// SHORTCUTS
// ============================================================

export interface Shortcut {
  id: string
  userId: string
  folderId: string | null
  scope: 'normal' | 'quick'
  name: string
  url: string
  description: string | null
  icon: string | null
  tags: string[]
  isFavorite: boolean
  useCount: number
  lastOpenedAt: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

// ============================================================
// CRM
// ============================================================

export interface CRMContact {
  id: string
  userId: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  stage: string
  position: number
  notes: string | null
  links: Record<string, any>
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

// ============================================================
// API RESPONSE
// ============================================================

export interface PaginatedResponse<T> {
  items: T[]
  nextCursor: string | null
}

export interface ApiError {
  error: string
  message: string
  status: number
}