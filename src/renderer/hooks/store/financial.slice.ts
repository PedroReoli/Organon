/**
 * Financial slice — funcoes puras de mutacao do modulo financeiro.
 *
 * Cobre: bills, expenses, incomes, budget categories, savings goals,
 * investments e financial config.
 *
 * Definido no upgrade 07 sub-A. Ver hooks/store/README.md.
 */

import type {
  Bill,
  BudgetCategory,
  Expense,
  FinancialConfig,
  IncomeEntry,
  Investment,
  SavingsGoal,
  Store,
} from '../../types'
import { generateId } from '../../utils'

const now = () => new Date().toISOString()
const tombstone = (resource: string, id: string, prev: Store) => [
  ...(prev.pendingDeletes ?? []),
  { resource, id },
]

// ─── Bills ──────────────────────────────────────────────────────

export function financialAddBill(prev: Store, input: Omit<Bill, 'id' | 'createdAt'>): Store {
  const newBill: Bill = { ...input, id: generateId(), createdAt: now() }
  return { ...prev, bills: [...prev.bills, newBill] }
}

export function financialUpdateBill(
  prev: Store,
  billId: string,
  updates: Partial<Omit<Bill, 'id' | 'createdAt'>>,
): Store {
  return {
    ...prev,
    bills: prev.bills.map((b) => (b.id === billId ? { ...b, ...updates } : b)),
  }
}

export function financialRemoveBill(prev: Store, billId: string): Store {
  return {
    ...prev,
    bills: prev.bills.filter((b) => b.id !== billId),
    pendingDeletes: tombstone('finance_bills', billId, prev),
  }
}

// ─── Expenses ───────────────────────────────────────────────────

export function financialAddExpense(
  prev: Store,
  input: Omit<Expense, 'id' | 'createdAt'>,
): Store {
  const newExpense: Expense = { ...input, id: generateId(), createdAt: now() }
  return { ...prev, expenses: [...prev.expenses, newExpense] }
}

export function financialUpdateExpense(
  prev: Store,
  expenseId: string,
  updates: Partial<Omit<Expense, 'id' | 'createdAt'>>,
): Store {
  return {
    ...prev,
    expenses: prev.expenses.map((e) => (e.id === expenseId ? { ...e, ...updates } : e)),
  }
}

export function financialRemoveExpense(prev: Store, expenseId: string): Store {
  return {
    ...prev,
    expenses: prev.expenses.filter((e) => e.id !== expenseId),
    pendingDeletes: tombstone('finance_expenses', expenseId, prev),
  }
}

// ─── Budget categories ─────────────────────────────────────────

export function financialSetBudgetCategories(prev: Store, categories: BudgetCategory[]): Store {
  return { ...prev, budgetCategories: categories }
}

// ─── Incomes ────────────────────────────────────────────────────

export function financialAddIncome(
  prev: Store,
  input: Omit<IncomeEntry, 'id' | 'createdAt'>,
): Store {
  const newIncome: IncomeEntry = { ...input, id: generateId(), createdAt: now() }
  return { ...prev, incomes: [...prev.incomes, newIncome] }
}

export function financialUpdateIncome(
  prev: Store,
  incomeId: string,
  updates: Partial<Omit<IncomeEntry, 'id' | 'createdAt'>>,
): Store {
  return {
    ...prev,
    incomes: prev.incomes.map((i) => (i.id === incomeId ? { ...i, ...updates } : i)),
  }
}

export function financialRemoveIncome(prev: Store, incomeId: string): Store {
  return {
    ...prev,
    incomes: prev.incomes.filter((i) => i.id !== incomeId),
    pendingDeletes: tombstone('finance_incomes', incomeId, prev),
  }
}

// ─── Config ─────────────────────────────────────────────────────

export function financialUpdateConfig(prev: Store, updates: Partial<FinancialConfig>): Store {
  return {
    ...prev,
    financialConfig: { ...prev.financialConfig, ...updates },
  }
}

// ─── Savings goals ─────────────────────────────────────────────

export function financialAddSavingsGoal(
  prev: Store,
  input: Omit<SavingsGoal, 'id' | 'createdAt'>,
): Store {
  const newGoal: SavingsGoal = { ...input, id: generateId(), createdAt: now() }
  return { ...prev, savingsGoals: [...prev.savingsGoals, newGoal] }
}

export function financialUpdateSavingsGoal(
  prev: Store,
  goalId: string,
  updates: Partial<Omit<SavingsGoal, 'id' | 'createdAt'>>,
): Store {
  return {
    ...prev,
    savingsGoals: prev.savingsGoals.map((g) =>
      g.id === goalId ? { ...g, ...updates } : g,
    ),
  }
}

export function financialRemoveSavingsGoal(prev: Store, goalId: string): Store {
  return {
    ...prev,
    savingsGoals: prev.savingsGoals.filter((g) => g.id !== goalId),
    pendingDeletes: tombstone('finance_savings_goals', goalId, prev),
  }
}

// ─── Investments ───────────────────────────────────────────────

export function financialAddInvestment(
  prev: Store,
  input: Omit<Investment, 'id' | 'createdAt'>,
): Store {
  const newInvestment: Investment = { ...input, id: generateId(), createdAt: now() }
  return { ...prev, investments: [...prev.investments, newInvestment] }
}

export function financialUpdateInvestment(
  prev: Store,
  investmentId: string,
  updates: Partial<Omit<Investment, 'id' | 'createdAt'>>,
): Store {
  return {
    ...prev,
    investments: prev.investments.map((i) =>
      i.id === investmentId ? { ...i, ...updates } : i,
    ),
  }
}

export function financialRemoveInvestment(prev: Store, investmentId: string): Store {
  return {
    ...prev,
    investments: prev.investments.filter((i) => i.id !== investmentId),
    pendingDeletes: tombstone('finance_investments', investmentId, prev),
  }
}
