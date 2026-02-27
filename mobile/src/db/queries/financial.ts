import { getDb } from '../schema'
import type { Bill, Expense, BudgetCategory, IncomeEntry, SavingsGoal, FinancialConfig } from '../../types'

export function getAllBills(): Bill[] {
  return getDb().getAllSync<{
    id: string; name: string; amount: number; due_day: number
    category: string; recurrence: string; is_paid: number; paid_date: string | null; created_at: string
  }>('SELECT * FROM bills ORDER BY due_day ASC').map(r => ({
    id: r.id, name: r.name, amount: r.amount, dueDay: r.due_day,
    category: r.category as Bill['category'], recurrence: r.recurrence as Bill['recurrence'],
    isPaid: r.is_paid === 1, paidDate: r.paid_date, createdAt: r.created_at,
  }))
}

export function upsertBill(bill: Bill): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO bills (id, name, amount, due_day, category, recurrence, is_paid, paid_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [bill.id, bill.name, bill.amount, bill.dueDay, bill.category, bill.recurrence, bill.isPaid ? 1 : 0, bill.paidDate, bill.createdAt]
  )
}

export function deleteBill(id: string): void {
  getDb().runSync('DELETE FROM bills WHERE id = ?', [id])
}

export function getAllExpenses(): Expense[] {
  return getDb().getAllSync<{
    id: string; description: string; amount: number; category: string
    date: string; installments: number; current_installment: number
    parent_id: string | null; note: string; created_at: string
  }>('SELECT * FROM expenses ORDER BY date DESC').map(r => ({
    id: r.id, description: r.description, amount: r.amount,
    category: r.category as Expense['category'], date: r.date,
    installments: r.installments, currentInstallment: r.current_installment,
    parentId: r.parent_id, note: r.note, createdAt: r.created_at,
  }))
}

export function upsertExpense(expense: Expense): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO expenses (id, description, amount, category, date, installments, current_installment, parent_id, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [expense.id, expense.description, expense.amount, expense.category, expense.date,
     expense.installments, expense.currentInstallment, expense.parentId, expense.note, expense.createdAt]
  )
}

export function deleteExpense(id: string): void {
  getDb().runSync('DELETE FROM expenses WHERE id = ?', [id])
}

export function getAllIncomes(): IncomeEntry[] {
  return getDb().getAllSync<{
    id: string; source: string; amount: number; date: string; kind: string
    recurrence_months: number; recurrence_index: number; recurrence_group_id: string | null
    note: string; created_at: string
  }>('SELECT * FROM incomes ORDER BY date DESC').map(r => ({
    id: r.id, source: r.source, amount: r.amount, date: r.date,
    kind: r.kind as IncomeEntry['kind'],
    recurrenceMonths: r.recurrence_months, recurrenceIndex: r.recurrence_index,
    recurrenceGroupId: r.recurrence_group_id, note: r.note, createdAt: r.created_at,
  }))
}

export function upsertIncome(income: IncomeEntry): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO incomes (id, source, amount, date, kind, recurrence_months, recurrence_index, recurrence_group_id, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [income.id, income.source, income.amount, income.date, income.kind,
     income.recurrenceMonths, income.recurrenceIndex, income.recurrenceGroupId, income.note, income.createdAt]
  )
}

export function deleteIncome(id: string): void {
  getDb().runSync('DELETE FROM incomes WHERE id = ?', [id])
}

export function getAllBudgetCategories(): BudgetCategory[] {
  return getDb().getAllSync<{ category: string; limit_amount: number }>('SELECT * FROM budget_categories')
    .map(r => ({ category: r.category as BudgetCategory['category'], limit: r.limit_amount }))
}

export function upsertBudgetCategory(bc: BudgetCategory): void {
  getDb().runSync('INSERT OR REPLACE INTO budget_categories (category, limit_amount) VALUES (?, ?)', [bc.category, bc.limit])
}

export function getAllSavingsGoals(): SavingsGoal[] {
  return getDb().getAllSync<{
    id: string; name: string; target_amount: number; current_amount: number; deadline: string | null; created_at: string
  }>('SELECT * FROM savings_goals ORDER BY created_at ASC').map(r => ({
    id: r.id, name: r.name, targetAmount: r.target_amount,
    currentAmount: r.current_amount, deadline: r.deadline, createdAt: r.created_at,
  }))
}

export function upsertSavingsGoal(goal: SavingsGoal): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO savings_goals (id, name, target_amount, current_amount, deadline, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [goal.id, goal.name, goal.targetAmount, goal.currentAmount, goal.deadline, goal.createdAt]
  )
}

export function deleteSavingsGoal(id: string): void {
  getDb().runSync('DELETE FROM savings_goals WHERE id = ?', [id])
}

export function getFinancialConfig(): FinancialConfig {
  const row = getDb().getFirstSync<{ monthly_income: number; monthly_spending_limit: number }>(
    'SELECT monthly_income, monthly_spending_limit FROM financial_config WHERE id = 1'
  )
  return { monthlyIncome: row?.monthly_income ?? 0, monthlySpendingLimit: row?.monthly_spending_limit ?? 0 }
}

export function updateFinancialConfig(config: FinancialConfig): void {
  getDb().runSync(
    'UPDATE financial_config SET monthly_income = ?, monthly_spending_limit = ? WHERE id = 1',
    [config.monthlyIncome, config.monthlySpendingLimit]
  )
}
