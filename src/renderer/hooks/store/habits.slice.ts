/**
 * Habits slice — funcoes puras de mutacao de habitos e entries.
 *
 * Definido no upgrade 07 sub-A. Ver hooks/store/README.md.
 */

import type { Habit, HabitEntry, Store } from '../../types'
import { generateId } from '../../utils'

const now = () => new Date().toISOString()

export function habitsAdd(
  prev: Store,
  input: Omit<Habit, 'id' | 'createdAt' | 'order'>,
): Store {
  const newHabit: Habit = {
    ...input,
    id: generateId(),
    createdAt: now(),
    order: prev.habits.length,
  }
  return { ...prev, habits: [...prev.habits, newHabit] }
}

export function habitsUpdate(
  prev: Store,
  habitId: string,
  updates: Partial<Omit<Habit, 'id' | 'createdAt'>>,
): Store {
  return {
    ...prev,
    habits: prev.habits.map((h) => (h.id === habitId ? { ...h, ...updates } : h)),
  }
}

export function habitsRemove(prev: Store, habitId: string): Store {
  return {
    ...prev,
    habits: prev.habits.filter((h) => h.id !== habitId),
    habitEntries: prev.habitEntries.filter((e) => e.habitId !== habitId),
    pendingDeletes: [...(prev.pendingDeletes ?? []), { resource: 'habits', id: habitId }],
  }
}

export function habitsAddEntry(
  prev: Store,
  input: Omit<HabitEntry, 'id'>,
): Store {
  const newEntry: HabitEntry = { ...input, id: generateId() }
  return { ...prev, habitEntries: [...prev.habitEntries, newEntry] }
}

export function habitsUpdateEntry(
  prev: Store,
  entryId: string,
  updates: Partial<Omit<HabitEntry, 'id'>>,
): Store {
  return {
    ...prev,
    habitEntries: prev.habitEntries.map((e) =>
      e.id === entryId ? { ...e, ...updates } : e,
    ),
  }
}

export function habitsRemoveEntry(prev: Store, entryId: string): Store {
  return {
    ...prev,
    habitEntries: prev.habitEntries.filter((e) => e.id !== entryId),
    pendingDeletes: [
      ...(prev.pendingDeletes ?? []),
      { resource: 'habit_entries', id: entryId },
    ],
  }
}
