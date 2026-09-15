/**
 * useFinancialAlerts — alertas proativos do modulo financeiro.
 *
 * Detecta:
 * - Bills vencendo nos proximos N dias (default 3)
 * - Categorias com orcamento excedido (>= 80% do limite)
 * - Metas de poupanca em risco (faltando muito e prazo proximo)
 * - Saldo projetado negativo no proximo mes (precisa de useCashFlowForecast)
 *
 * Hook puro, memoizado. Upgrade 12.
 */

import { useMemo } from 'react'
import type {
  Bill,
  Expense,
  BudgetCategory,
  SavingsGoal,
  FinancialConfig,
} from '../types'

export type FinancialAlertSeverity = 'info' | 'warning' | 'critical'

export interface FinancialAlert {
  id: string
  severity: FinancialAlertSeverity
  kind: 'bill-due' | 'budget-exceeded' | 'goal-at-risk' | 'cashflow-negative'
  title: string
  description: string
  /** Identificador da entidade relacionada (billId, categoria, goalId). */
  refId?: string
}

interface UseFinancialAlertsOptions {
  bills: Bill[]
  expenses: Expense[]
  budgetCategories: BudgetCategory[]
  savingsGoals: SavingsGoal[]
  financialConfig: FinancialConfig
  /** Saldo cumulativo projetado para o proximo mes (vem de useCashFlowForecast). */
  nextMonthCumulativeBalance?: number
  /** Dias de antecedencia para alertar contas vencendo. Default 3. */
  daysAhead?: number
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + 'T00:00:00')
  const b = new Date(toISO + 'T00:00:00')
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

/** Calcula a proxima data de vencimento de uma bill com base em dueDay (1-31). */
function nextDueDateForBill(dueDay: number, recurrence: 'monthly' | 'yearly'): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  if (recurrence === 'monthly') {
    const thisMonth = new Date(year, month, dueDay)
    if (thisMonth >= new Date(year, month, today.getDate())) {
      return thisMonth.toISOString().slice(0, 10)
    }
    const next = new Date(year, month + 1, dueDay)
    return next.toISOString().slice(0, 10)
  }
  // yearly: assume January
  const thisYear = new Date(year, 0, dueDay)
  if (thisYear >= today) return thisYear.toISOString().slice(0, 10)
  return new Date(year + 1, 0, dueDay).toISOString().slice(0, 10)
}

function currentMonthExpenses(expenses: Expense[]): Map<string, number> {
  const today = todayISO()
  const monthKey = today.slice(0, 7)
  const result = new Map<string, number>()
  for (const e of expenses) {
    if (e.date.slice(0, 7) !== monthKey) continue
    const cat = e.category ?? 'outro'
    result.set(cat, (result.get(cat) ?? 0) + e.amount)
  }
  return result
}

export function useFinancialAlerts(options: UseFinancialAlertsOptions): FinancialAlert[] {
  const {
    bills,
    expenses,
    budgetCategories,
    savingsGoals,
    nextMonthCumulativeBalance,
    daysAhead = 3,
  } = options

  return useMemo(() => {
    const alerts: FinancialAlert[] = []
    const today = todayISO()

    // 1. Bills vencendo (calcula proxima data via dueDay)
    for (const bill of bills) {
      if (bill.isPaid) continue
      const dueISO = nextDueDateForBill(bill.dueDay, bill.recurrence)
      const days = daysBetween(today, dueISO)
      if (days < 0 || days > daysAhead) continue
      const severity: FinancialAlertSeverity = days <= 0 ? 'critical' : days <= 1 ? 'warning' : 'info'
      alerts.push({
        id: `bill-${bill.id}`,
        severity,
        kind: 'bill-due',
        title: bill.name,
        description: days === 0 ? 'Vence hoje' : `Vence em ${days} dia(s)`,
        refId: bill.id,
      })
    }

    // 2. Categorias com orcamento excedido
    const monthExpenses = currentMonthExpenses(expenses)
    for (const cat of budgetCategories) {
      if (cat.limit <= 0) continue
      const spent = monthExpenses.get(cat.category) ?? 0
      const ratio = spent / cat.limit
      if (ratio >= 1) {
        alerts.push({
          id: `budget-${cat.category}`,
          severity: 'critical',
          kind: 'budget-exceeded',
          title: cat.category,
          description: `Orcamento excedido (${(ratio * 100).toFixed(0)}%)`,
        })
      } else if (ratio >= 0.8) {
        alerts.push({
          id: `budget-${cat.category}`,
          severity: 'warning',
          kind: 'budget-exceeded',
          title: cat.category,
          description: `${(ratio * 100).toFixed(0)}% do orcamento usado`,
        })
      }
    }

    // 3. Metas em risco
    for (const goal of savingsGoals) {
      if (!goal.deadline || goal.targetAmount <= 0) continue
      const daysLeft = daysBetween(today, goal.deadline)
      if (daysLeft < 0) continue
      const remaining = goal.targetAmount - goal.currentAmount
      if (remaining <= 0) continue
      const monthsLeft = Math.max(daysLeft / 30, 0.1)
      const requiredPerMonth = remaining / monthsLeft
      if (daysLeft <= 30) {
        alerts.push({
          id: `goal-${goal.id}`,
          severity: 'warning',
          kind: 'goal-at-risk',
          title: goal.name,
          description: `Faltam ${remaining.toFixed(0)} em ${daysLeft} dia(s) (${requiredPerMonth.toFixed(0)}/mes)`,
          refId: goal.id,
        })
      }
    }

    // 4. Saldo projetado negativo
    if (typeof nextMonthCumulativeBalance === 'number' && nextMonthCumulativeBalance < 0) {
      alerts.push({
        id: 'cashflow-next-month',
        severity: 'critical',
        kind: 'cashflow-negative',
        title: 'Saldo projetado negativo',
        description: `Proximo mes fechara em ${nextMonthCumulativeBalance.toFixed(0)}`,
      })
    }

    return alerts.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 }
      return order[a.severity] - order[b.severity]
    })
  }, [bills, expenses, budgetCategories, savingsGoals, nextMonthCumulativeBalance, daysAhead])
}
