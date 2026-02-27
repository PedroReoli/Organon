import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { uid } from '../utils/format'
import { now, today } from '../utils/date'
import type {
  MobileStore, Card, CalendarEvent, Note, NoteFolder,
  Habit, HabitEntry, Bill, Expense, BudgetCategory, IncomeEntry,
  FinancialConfig, SavingsGoal, Playbook, CRMContact, CRMInteraction,
  CRMTag, ShortcutFolder, ShortcutItem, ColorPalette, Settings,
  StudyGoal, StudySessionLog,
} from '../types'
import { DEFAULT_MOBILE_STORE } from '../types'
import * as CardsDB     from '../db/queries/cards'
import * as EventsDB    from '../db/queries/events'
import * as NotesDB     from '../db/queries/notes'
import * as HabitsDB    from '../db/queries/habits'
import * as FinancialDB from '../db/queries/financial'
import * as CrmDB       from '../db/queries/crm'
import * as MiscDB      from '../db/queries/misc'

// ── Context ────────────────────────────────────────────────────────────────────

interface StoreContextValue {
  store: MobileStore
  isLoaded: boolean
  // Cards
  addCard: (data: Partial<Card>) => Card
  updateCard: (id: string, data: Partial<Card>) => void
  deleteCard: (id: string) => void
  // Events
  addEvent: (data: Partial<CalendarEvent>) => CalendarEvent
  updateEvent: (id: string, data: Partial<CalendarEvent>) => void
  deleteEvent: (id: string) => void
  // Notes
  addNote: (data: Partial<Note>) => Note
  updateNote: (id: string, data: Partial<Note>) => void
  deleteNote: (id: string) => void
  addNoteFolder: (data: Partial<NoteFolder>) => NoteFolder
  updateNoteFolder: (id: string, data: Partial<NoteFolder>) => void
  deleteNoteFolder: (id: string) => void
  // Habits
  addHabit: (data: Partial<Habit>) => Habit
  updateHabit: (id: string, data: Partial<Habit>) => void
  deleteHabit: (id: string) => void
  upsertHabitEntry: (entry: HabitEntry) => void
  // Financial
  addBill: (data: Partial<Bill>) => Bill
  updateBill: (id: string, data: Partial<Bill>) => void
  deleteBill: (id: string) => void
  addExpense: (data: Partial<Expense>) => Expense
  updateExpense: (id: string, data: Partial<Expense>) => void
  deleteExpense: (id: string) => void
  addIncome: (data: Partial<IncomeEntry>) => IncomeEntry
  deleteIncome: (id: string) => void
  updateFinancialConfig: (config: FinancialConfig) => void
  addSavingsGoal: (data: Partial<SavingsGoal>) => SavingsGoal
  updateSavingsGoal: (id: string, data: Partial<SavingsGoal>) => void
  deleteSavingsGoal: (id: string) => void
  // CRM
  addCRMContact: (data: Partial<CRMContact>) => CRMContact
  updateCRMContact: (id: string, data: Partial<CRMContact>) => void
  deleteCRMContact: (id: string) => void
  addCRMInteraction: (data: Partial<CRMInteraction>) => CRMInteraction
  deleteCRMInteraction: (id: string) => void
  addCRMTag: (data: Partial<CRMTag>) => CRMTag
  // Playbooks
  addPlaybook: (data: Partial<Playbook>) => Playbook
  updatePlaybook: (id: string, data: Partial<Playbook>) => void
  deletePlaybook: (id: string) => void
  // Shortcuts
  addShortcutFolder: (data: Partial<ShortcutFolder>) => ShortcutFolder
  updateShortcutFolder: (id: string, data: Partial<ShortcutFolder>) => void
  deleteShortcutFolder: (id: string) => void
  addShortcut: (data: Partial<ShortcutItem>) => ShortcutItem
  updateShortcut: (id: string, data: Partial<ShortcutItem>) => void
  deleteShortcut: (id: string) => void
  // Colors
  addColorPalette: (data: Partial<ColorPalette>) => ColorPalette
  updateColorPalette: (id: string, data: Partial<ColorPalette>) => void
  deleteColorPalette: (id: string) => void
  // Study
  addStudyGoal: (data: Partial<StudyGoal>) => StudyGoal
  updateStudyGoal: (id: string, data: Partial<StudyGoal>) => void
  deleteStudyGoal: (id: string) => void
  addStudySession: (session: StudySessionLog) => void
  updateStudySettings: (focusMinutes: number, breakMinutes: number) => void
  // Settings
  updateSettings: (data: Partial<Settings>) => void
}

export const StoreContext = createContext<StoreContextValue>({
  store: DEFAULT_MOBILE_STORE,
  isLoaded: false,
  addCard: () => ({} as Card),
  updateCard: () => {},
  deleteCard: () => {},
  addEvent: () => ({} as CalendarEvent),
  updateEvent: () => {},
  deleteEvent: () => {},
  addNote: () => ({} as Note),
  updateNote: () => {},
  deleteNote: () => {},
  addNoteFolder: () => ({} as NoteFolder),
  updateNoteFolder: () => {},
  deleteNoteFolder: () => {},
  addHabit: () => ({} as Habit),
  updateHabit: () => {},
  deleteHabit: () => {},
  upsertHabitEntry: () => {},
  addBill: () => ({} as Bill),
  updateBill: () => {},
  deleteBill: () => {},
  addExpense: () => ({} as Expense),
  updateExpense: () => {},
  deleteExpense: () => {},
  addIncome: () => ({} as IncomeEntry),
  deleteIncome: () => {},
  updateFinancialConfig: () => {},
  addSavingsGoal: () => ({} as SavingsGoal),
  updateSavingsGoal: () => {},
  deleteSavingsGoal: () => {},
  addCRMContact: () => ({} as CRMContact),
  updateCRMContact: () => {},
  deleteCRMContact: () => {},
  addCRMInteraction: () => ({} as CRMInteraction),
  deleteCRMInteraction: () => {},
  addCRMTag: () => ({} as CRMTag),
  addPlaybook: () => ({} as Playbook),
  updatePlaybook: () => {},
  deletePlaybook: () => {},
  addShortcutFolder: () => ({} as ShortcutFolder),
  updateShortcutFolder: () => {},
  deleteShortcutFolder: () => {},
  addShortcut: () => ({} as ShortcutItem),
  updateShortcut: () => {},
  deleteShortcut: () => {},
  addColorPalette: () => ({} as ColorPalette),
  updateColorPalette: () => {},
  deleteColorPalette: () => {},
  addStudyGoal: () => ({} as StudyGoal),
  updateStudyGoal: () => {},
  deleteStudyGoal: () => {},
  addStudySession: () => {},
  updateStudySettings: () => {},
  updateSettings: () => {},
})

// ── Provider ───────────────────────────────────────────────────────────────────

export function StoreProvider({ children, onStoreChange }: {
  children: React.ReactNode
  onStoreChange?: (store: MobileStore) => void
}) {
  const [store, setStore] = useState<MobileStore>(DEFAULT_MOBILE_STORE)
  const [isLoaded, setIsLoaded] = useState(false)
  const onChangeRef = useRef(onStoreChange)
  onChangeRef.current = onStoreChange

  // Load from SQLite on mount
  useEffect(() => {
    try {
      const cards           = CardsDB.getAllCards()
      const calendarEvents  = EventsDB.getAllEvents()
      const noteFolders     = NotesDB.getAllNoteFolders()
      const notes           = NotesDB.getAllNotes()
      const habits          = HabitsDB.getAllHabits()
      const habitEntries    = HabitsDB.getAllHabitEntries()
      const bills           = FinancialDB.getAllBills()
      const expenses        = FinancialDB.getAllExpenses()
      const budgetCategories = FinancialDB.getAllBudgetCategories()
      const incomes         = FinancialDB.getAllIncomes()
      const financialConfig = FinancialDB.getFinancialConfig()
      const savingsGoals    = FinancialDB.getAllSavingsGoals()
      const crmContacts     = CrmDB.getAllCRMContacts()
      const crmInteractions: CRMInteraction[] = []
      const crmTags         = CrmDB.getAllCRMTags()
      const playbooks       = MiscDB.getAllPlaybooks()
      const shortcutFolders = MiscDB.getAllShortcutFolders()
      const shortcuts       = MiscDB.getAllShortcuts()
      const colorPalettes   = MiscDB.getAllColorPalettes()
      const studyGoals      = MiscDB.getAllStudyGoals()
      const studySessions   = MiscDB.getAllStudySessions()
      const settings        = MiscDB.loadSettings()

      setStore({
        cards, calendarEvents, noteFolders, notes, colorPalettes,
        habits, habitEntries, bills, expenses, budgetCategories,
        incomes, financialConfig, savingsGoals,
        crmContacts, crmInteractions, crmTags, playbooks,
        shortcutFolders, shortcuts,
        study: { focusMinutes: 25, breakMinutes: 5, goals: studyGoals, sessions: studySessions },
        settings, storeUpdatedAt: now(),
      })
    } catch (err) {
      console.error('[Store] Failed to load from SQLite:', err)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Notify parent of store changes (for Appwrite sync)
  const updateStore = useCallback((updater: (prev: MobileStore) => MobileStore) => {
    setStore(prev => {
      const next = updater(prev)
      const withTs = { ...next, storeUpdatedAt: now() }
      onChangeRef.current?.(withTs)
      return withTs
    })
  }, [])

  // ── Cards ──────────────────────────────────────────────────────────────────
  const addCard = useCallback((data: Partial<Card>): Card => {
    const card: Card = {
      id: uid(), title: '', descriptionHtml: '',
      location: { day: null, period: null }, order: 0,
      date: null, time: null, hasDate: false,
      priority: null, status: 'todo', checklist: [],
      projectId: null, createdAt: now(), updatedAt: now(),
      ...data,
    }
    CardsDB.upsertCard(card)
    updateStore(s => ({ ...s, cards: [...s.cards, card] }))
    return card
  }, [updateStore])

  const updateCard = useCallback((id: string, data: Partial<Card>) => {
    updateStore(s => {
      const cards = s.cards.map(c => c.id === id ? { ...c, ...data, updatedAt: now() } : c)
      const updated = cards.find(c => c.id === id)!
      CardsDB.upsertCard(updated)
      return { ...s, cards }
    })
  }, [updateStore])

  const deleteCard = useCallback((id: string) => {
    CardsDB.deleteCard(id)
    updateStore(s => ({ ...s, cards: s.cards.filter(c => c.id !== id) }))
  }, [updateStore])

  // ── Events ─────────────────────────────────────────────────────────────────
  const addEvent = useCallback((data: Partial<CalendarEvent>): CalendarEvent => {
    const event: CalendarEvent = {
      id: uid(), title: '', date: today(), time: null,
      recurrence: null, reminder: null, description: '', color: '#6366f1',
      createdAt: now(), updatedAt: now(), ...data,
    }
    EventsDB.upsertEvent(event)
    updateStore(s => ({ ...s, calendarEvents: [...s.calendarEvents, event] }))
    return event
  }, [updateStore])

  const updateEvent = useCallback((id: string, data: Partial<CalendarEvent>) => {
    updateStore(s => {
      const calendarEvents = s.calendarEvents.map(e => e.id === id ? { ...e, ...data, updatedAt: now() } : e)
      const updated = calendarEvents.find(e => e.id === id)!
      EventsDB.upsertEvent(updated)
      return { ...s, calendarEvents }
    })
  }, [updateStore])

  const deleteEvent = useCallback((id: string) => {
    EventsDB.deleteEvent(id)
    updateStore(s => ({ ...s, calendarEvents: s.calendarEvents.filter(e => e.id !== id) }))
  }, [updateStore])

  // ── Notes ──────────────────────────────────────────────────────────────────
  const addNote = useCallback((data: Partial<Note>): Note => {
    const note: Note = {
      id: uid(), title: 'Nova nota', content: '',
      folderId: null, projectId: null, order: 0,
      createdAt: now(), updatedAt: now(), ...data,
    }
    NotesDB.upsertNote(note)
    updateStore(s => ({ ...s, notes: [...s.notes, note] }))
    return note
  }, [updateStore])

  const updateNote = useCallback((id: string, data: Partial<Note>) => {
    updateStore(s => {
      const notes = s.notes.map(n => n.id === id ? { ...n, ...data, updatedAt: now() } : n)
      const updated = notes.find(n => n.id === id)!
      NotesDB.upsertNote(updated)
      return { ...s, notes }
    })
  }, [updateStore])

  const deleteNote = useCallback((id: string) => {
    NotesDB.deleteNote(id)
    updateStore(s => ({ ...s, notes: s.notes.filter(n => n.id !== id) }))
  }, [updateStore])

  const addNoteFolder = useCallback((data: Partial<NoteFolder>): NoteFolder => {
    const folder: NoteFolder = { id: uid(), name: 'Nova pasta', parentId: null, order: 0, ...data }
    NotesDB.upsertNoteFolder(folder)
    updateStore(s => ({ ...s, noteFolders: [...s.noteFolders, folder] }))
    return folder
  }, [updateStore])

  const updateNoteFolder = useCallback((id: string, data: Partial<NoteFolder>) => {
    updateStore(s => {
      const noteFolders = s.noteFolders.map(f => f.id === id ? { ...f, ...data } : f)
      const updated = noteFolders.find(f => f.id === id)!
      NotesDB.upsertNoteFolder(updated)
      return { ...s, noteFolders }
    })
  }, [updateStore])

  const deleteNoteFolder = useCallback((id: string) => {
    NotesDB.deleteNoteFolder(id)
    updateStore(s => ({
      ...s,
      noteFolders: s.noteFolders.filter(f => f.id !== id),
      notes: s.notes.map(n => n.folderId === id ? { ...n, folderId: null } : n),
    }))
  }, [updateStore])

  // ── Habits ─────────────────────────────────────────────────────────────────
  const addHabit = useCallback((data: Partial<Habit>): Habit => {
    const habit: Habit = {
      id: uid(), name: 'Novo hábito', type: 'boolean',
      target: 1, frequency: 'daily', weeklyTarget: 7, weekDays: [],
      trigger: '', reason: '', minimumTarget: 0,
      color: '#6366f1', order: 0, createdAt: now(), ...data,
    }
    HabitsDB.upsertHabit(habit)
    updateStore(s => ({ ...s, habits: [...s.habits, habit] }))
    return habit
  }, [updateStore])

  const updateHabit = useCallback((id: string, data: Partial<Habit>) => {
    updateStore(s => {
      const habits = s.habits.map(h => h.id === id ? { ...h, ...data } : h)
      const updated = habits.find(h => h.id === id)!
      HabitsDB.upsertHabit(updated)
      return { ...s, habits }
    })
  }, [updateStore])

  const deleteHabit = useCallback((id: string) => {
    HabitsDB.deleteHabit(id)
    updateStore(s => ({
      ...s,
      habits: s.habits.filter(h => h.id !== id),
      habitEntries: s.habitEntries.filter(e => e.habitId !== id),
    }))
  }, [updateStore])

  const upsertHabitEntry = useCallback((entry: HabitEntry) => {
    HabitsDB.upsertHabitEntry(entry)
    updateStore(s => ({
      ...s,
      habitEntries: [
        ...s.habitEntries.filter(e => !(e.habitId === entry.habitId && e.date === entry.date)),
        entry,
      ],
    }))
  }, [updateStore])

  // ── Financial ──────────────────────────────────────────────────────────────
  const addBill = useCallback((data: Partial<Bill>): Bill => {
    const bill: Bill = {
      id: uid(), name: 'Nova conta', amount: 0, dueDay: 1,
      category: 'outro', recurrence: 'monthly', isPaid: false,
      paidDate: null, createdAt: now(), ...data,
    }
    FinancialDB.upsertBill(bill)
    updateStore(s => ({ ...s, bills: [...s.bills, bill] }))
    return bill
  }, [updateStore])

  const updateBill = useCallback((id: string, data: Partial<Bill>) => {
    updateStore(s => {
      const bills = s.bills.map(b => b.id === id ? { ...b, ...data } : b)
      FinancialDB.upsertBill(bills.find(b => b.id === id)!)
      return { ...s, bills }
    })
  }, [updateStore])

  const deleteBill = useCallback((id: string) => {
    FinancialDB.deleteBill(id)
    updateStore(s => ({ ...s, bills: s.bills.filter(b => b.id !== id) }))
  }, [updateStore])

  const addExpense = useCallback((data: Partial<Expense>): Expense => {
    const expense: Expense = {
      id: uid(), description: '', amount: 0, category: 'outro',
      date: today(), installments: 1, currentInstallment: 1,
      parentId: null, note: '', createdAt: now(), ...data,
    }
    FinancialDB.upsertExpense(expense)
    updateStore(s => ({ ...s, expenses: [expense, ...s.expenses] }))
    return expense
  }, [updateStore])

  const updateExpense = useCallback((id: string, data: Partial<Expense>) => {
    updateStore(s => {
      const expenses = s.expenses.map(e => e.id === id ? { ...e, ...data } : e)
      FinancialDB.upsertExpense(expenses.find(e => e.id === id)!)
      return { ...s, expenses }
    })
  }, [updateStore])

  const deleteExpense = useCallback((id: string) => {
    FinancialDB.deleteExpense(id)
    updateStore(s => ({ ...s, expenses: s.expenses.filter(e => e.id !== id) }))
  }, [updateStore])

  const addIncome = useCallback((data: Partial<IncomeEntry>): IncomeEntry => {
    const income: IncomeEntry = {
      id: uid(), source: '', amount: 0, date: today(),
      kind: 'fixed', recurrenceMonths: 1, recurrenceIndex: 1,
      recurrenceGroupId: null, note: '', createdAt: now(), ...data,
    }
    FinancialDB.upsertIncome(income)
    updateStore(s => ({ ...s, incomes: [income, ...s.incomes] }))
    return income
  }, [updateStore])

  const deleteIncome = useCallback((id: string) => {
    FinancialDB.deleteIncome(id)
    updateStore(s => ({ ...s, incomes: s.incomes.filter(i => i.id !== id) }))
  }, [updateStore])

  const updateFinancialConfig = useCallback((config: FinancialConfig) => {
    FinancialDB.updateFinancialConfig(config)
    updateStore(s => ({ ...s, financialConfig: config }))
  }, [updateStore])

  const addSavingsGoal = useCallback((data: Partial<SavingsGoal>): SavingsGoal => {
    const goal: SavingsGoal = {
      id: uid(), name: 'Nova meta', targetAmount: 0, currentAmount: 0,
      deadline: null, createdAt: now(), ...data,
    }
    FinancialDB.upsertSavingsGoal(goal)
    updateStore(s => ({ ...s, savingsGoals: [...s.savingsGoals, goal] }))
    return goal
  }, [updateStore])

  const updateSavingsGoal = useCallback((id: string, data: Partial<SavingsGoal>) => {
    updateStore(s => {
      const savingsGoals = s.savingsGoals.map(g => g.id === id ? { ...g, ...data } : g)
      FinancialDB.upsertSavingsGoal(savingsGoals.find(g => g.id === id)!)
      return { ...s, savingsGoals }
    })
  }, [updateStore])

  const deleteSavingsGoal = useCallback((id: string) => {
    FinancialDB.deleteSavingsGoal(id)
    updateStore(s => ({ ...s, savingsGoals: s.savingsGoals.filter(g => g.id !== id) }))
  }, [updateStore])

  // ── CRM ────────────────────────────────────────────────────────────────────
  const addCRMContact = useCallback((data: Partial<CRMContact>): CRMContact => {
    const contact: CRMContact = {
      id: uid(), name: 'Novo contato', company: null, role: null,
      phone: null, email: null, socialMedia: null, context: null,
      interests: null, priority: 'media', tags: [],
      stageId: 'prospeccao', description: '', followUpDate: null,
      links: { noteIds: [], calendarEventIds: [], cardIds: [] },
      order: 0, createdAt: now(), updatedAt: now(), ...data,
    }
    CrmDB.upsertCRMContact(contact)
    updateStore(s => ({ ...s, crmContacts: [...s.crmContacts, contact] }))
    return contact
  }, [updateStore])

  const updateCRMContact = useCallback((id: string, data: Partial<CRMContact>) => {
    updateStore(s => {
      const crmContacts = s.crmContacts.map(c => c.id === id ? { ...c, ...data, updatedAt: now() } : c)
      CrmDB.upsertCRMContact(crmContacts.find(c => c.id === id)!)
      return { ...s, crmContacts }
    })
  }, [updateStore])

  const deleteCRMContact = useCallback((id: string) => {
    CrmDB.deleteCRMContact(id)
    updateStore(s => ({
      ...s,
      crmContacts: s.crmContacts.filter(c => c.id !== id),
      crmInteractions: s.crmInteractions.filter(i => i.contactId !== id),
    }))
  }, [updateStore])

  const addCRMInteraction = useCallback((data: Partial<CRMInteraction>): CRMInteraction => {
    const interaction: CRMInteraction = {
      id: uid(), contactId: '', type: 'nota', content: '',
      date: today(), time: '00:00', createdAt: now(), ...data,
    }
    CrmDB.upsertCRMInteraction(interaction)
    updateStore(s => ({ ...s, crmInteractions: [interaction, ...s.crmInteractions] }))
    return interaction
  }, [updateStore])

  const deleteCRMInteraction = useCallback((id: string) => {
    CrmDB.deleteCRMInteraction(id)
    updateStore(s => ({ ...s, crmInteractions: s.crmInteractions.filter(i => i.id !== id) }))
  }, [updateStore])

  const addCRMTag = useCallback((data: Partial<CRMTag>): CRMTag => {
    const tag: CRMTag = { id: uid(), name: 'Tag', color: '#6366f1', createdAt: now(), ...data }
    CrmDB.upsertCRMTag(tag)
    updateStore(s => ({ ...s, crmTags: [...s.crmTags, tag] }))
    return tag
  }, [updateStore])

  // ── Playbooks ──────────────────────────────────────────────────────────────
  const addPlaybook = useCallback((data: Partial<Playbook>): Playbook => {
    const pb: Playbook = {
      id: uid(), title: 'Novo Playbook', sector: '', category: '',
      summary: '', content: '', dialogs: [], order: 0,
      createdAt: now(), updatedAt: now(), ...data,
    }
    MiscDB.upsertPlaybook(pb)
    updateStore(s => ({ ...s, playbooks: [...s.playbooks, pb] }))
    return pb
  }, [updateStore])

  const updatePlaybook = useCallback((id: string, data: Partial<Playbook>) => {
    updateStore(s => {
      const playbooks = s.playbooks.map(p => p.id === id ? { ...p, ...data, updatedAt: now() } : p)
      MiscDB.upsertPlaybook(playbooks.find(p => p.id === id)!)
      return { ...s, playbooks }
    })
  }, [updateStore])

  const deletePlaybook = useCallback((id: string) => {
    MiscDB.deletePlaybook(id)
    updateStore(s => ({ ...s, playbooks: s.playbooks.filter(p => p.id !== id) }))
  }, [updateStore])

  // ── Shortcuts ──────────────────────────────────────────────────────────────
  const addShortcutFolder = useCallback((data: Partial<ShortcutFolder>): ShortcutFolder => {
    const folder: ShortcutFolder = { id: uid(), name: 'Nova pasta', parentId: null, order: 0, ...data }
    MiscDB.upsertShortcutFolder(folder)
    updateStore(s => ({ ...s, shortcutFolders: [...s.shortcutFolders, folder] }))
    return folder
  }, [updateStore])

  const updateShortcutFolder = useCallback((id: string, data: Partial<ShortcutFolder>) => {
    updateStore(s => {
      const shortcutFolders = s.shortcutFolders.map(f => f.id === id ? { ...f, ...data } : f)
      MiscDB.upsertShortcutFolder(shortcutFolders.find(f => f.id === id)!)
      return { ...s, shortcutFolders }
    })
  }, [updateStore])

  const deleteShortcutFolder = useCallback((id: string) => {
    MiscDB.deleteShortcutFolder(id)
    updateStore(s => ({
      ...s,
      shortcutFolders: s.shortcutFolders.filter(f => f.id !== id),
      shortcuts: s.shortcuts.map(s2 => s2.folderId === id ? { ...s2, folderId: null } : s2),
    }))
  }, [updateStore])

  const addShortcut = useCallback((data: Partial<ShortcutItem>): ShortcutItem => {
    const s2: ShortcutItem = { id: uid(), folderId: null, title: '', kind: 'url', value: '', icon: null, order: 0, ...data }
    MiscDB.upsertShortcut(s2)
    updateStore(s => ({ ...s, shortcuts: [...s.shortcuts, s2] }))
    return s2
  }, [updateStore])

  const updateShortcut = useCallback((id: string, data: Partial<ShortcutItem>) => {
    updateStore(s => {
      const shortcuts = s.shortcuts.map(sc => sc.id === id ? { ...sc, ...data } : sc)
      MiscDB.upsertShortcut(shortcuts.find(sc => sc.id === id)!)
      return { ...s, shortcuts }
    })
  }, [updateStore])

  const deleteShortcut = useCallback((id: string) => {
    MiscDB.deleteShortcut(id)
    updateStore(s => ({ ...s, shortcuts: s.shortcuts.filter(sc => sc.id !== id) }))
  }, [updateStore])

  // ── Colors ─────────────────────────────────────────────────────────────────
  const addColorPalette = useCallback((data: Partial<ColorPalette>): ColorPalette => {
    const palette: ColorPalette = {
      id: uid(), name: 'Nova paleta', colors: [], order: 0,
      createdAt: now(), updatedAt: now(), ...data,
    }
    MiscDB.upsertColorPalette(palette)
    updateStore(s => ({ ...s, colorPalettes: [...s.colorPalettes, palette] }))
    return palette
  }, [updateStore])

  const updateColorPalette = useCallback((id: string, data: Partial<ColorPalette>) => {
    updateStore(s => {
      const colorPalettes = s.colorPalettes.map(p => p.id === id ? { ...p, ...data, updatedAt: now() } : p)
      MiscDB.upsertColorPalette(colorPalettes.find(p => p.id === id)!)
      return { ...s, colorPalettes }
    })
  }, [updateStore])

  const deleteColorPalette = useCallback((id: string) => {
    MiscDB.deleteColorPalette(id)
    updateStore(s => ({ ...s, colorPalettes: s.colorPalettes.filter(p => p.id !== id) }))
  }, [updateStore])

  // ── Study ──────────────────────────────────────────────────────────────────
  const addStudyGoal = useCallback((data: Partial<StudyGoal>): StudyGoal => {
    const goal: StudyGoal = { id: uid(), title: 'Nova meta', status: 'todo', createdAt: now(), ...data }
    MiscDB.upsertStudyGoal(goal)
    updateStore(s => ({ ...s, study: { ...s.study, goals: [...s.study.goals, goal] } }))
    return goal
  }, [updateStore])

  const updateStudyGoal = useCallback((id: string, data: Partial<StudyGoal>) => {
    updateStore(s => {
      const goals = s.study.goals.map(g => g.id === id ? { ...g, ...data } : g)
      MiscDB.upsertStudyGoal(goals.find(g => g.id === id)!)
      return { ...s, study: { ...s.study, goals } }
    })
  }, [updateStore])

  const deleteStudyGoal = useCallback((id: string) => {
    MiscDB.deleteStudyGoal(id)
    updateStore(s => ({ ...s, study: { ...s.study, goals: s.study.goals.filter(g => g.id !== id) } }))
  }, [updateStore])

  const addStudySession = useCallback((session: StudySessionLog) => {
    MiscDB.insertStudySession(session)
    updateStore(s => ({ ...s, study: { ...s.study, sessions: [session, ...s.study.sessions] } }))
  }, [updateStore])

  const updateStudySettings = useCallback((focusMinutes: number, breakMinutes: number) => {
    updateStore(s => ({ ...s, study: { ...s.study, focusMinutes, breakMinutes } }))
  }, [updateStore])

  // ── Settings ───────────────────────────────────────────────────────────────
  const updateSettings = useCallback((data: Partial<Settings>) => {
    updateStore(s => {
      const settings = { ...s.settings, ...data }
      MiscDB.saveSettings(settings)
      return { ...s, settings }
    })
  }, [updateStore])

  const value: StoreContextValue = {
    store, isLoaded,
    addCard, updateCard, deleteCard,
    addEvent, updateEvent, deleteEvent,
    addNote, updateNote, deleteNote,
    addNoteFolder, updateNoteFolder, deleteNoteFolder,
    addHabit, updateHabit, deleteHabit, upsertHabitEntry,
    addBill, updateBill, deleteBill,
    addExpense, updateExpense, deleteExpense,
    addIncome, deleteIncome, updateFinancialConfig,
    addSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
    addCRMContact, updateCRMContact, deleteCRMContact,
    addCRMInteraction, deleteCRMInteraction, addCRMTag,
    addPlaybook, updatePlaybook, deletePlaybook,
    addShortcutFolder, updateShortcutFolder, deleteShortcutFolder,
    addShortcut, updateShortcut, deleteShortcut,
    addColorPalette, updateColorPalette, deleteColorPalette,
    addStudyGoal, updateStudyGoal, deleteStudyGoal,
    addStudySession, updateStudySettings,
    updateSettings,
  }

  return React.createElement(StoreContext.Provider, { value }, children)
}

export function useStore(): StoreContextValue {
  return useContext(StoreContext)
}
