/**
 * Hook puro de previsao de fluxo de caixa.
 *
 * Projeta saldo mensal nos proximos N meses a partir de:
 * - Bills recorrentes (monthly/yearly)
 * - IncomeEntries (unicas e recorrentes via recurrenceMonths)
 * - Historico recente de expenses (media dos ultimos 3 meses)
 *
 * Zero side effects, memoizado. Consumidor (widget/chart/report) renderiza.
 *
 * Definido no upgrade 12 (foundations).
 */

import { useMemo } from 'react'
import type { Bill, Expense, IncomeEntry, FinancialConfig } from '../types'

export interface ForecastMonth {
  /** YYYY-MM */
  month: string
  /** Timestamp do primeiro dia do mes, local time. */
  monthDate: Date
  income: number
  expensesFixed: number
  expensesVariable: number
  balance: number
  /** Saldo acumulado desde o inicio da projecao. */
  cumulativeBalance: number
}

interface UseCashFlowForecastOptions {
  bills: Bill[]
  incomes: IncomeEntry[]
  expenses: Expense[]
  financialConfig: FinancialConfig
  /** Quantos meses projetar no futuro. Default: 6. */
  months?: number
  /** Data base para projecao. Default: hoje. */
  fromDate?: Date
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function addMonths(d: Date, n: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth() + n, 1)
  return copy
}

/**
 * Media mensal de despesas variaveis dos ultimos N meses (excluindo bills).
 */
export function averageVariableExpenses(
  expenses: Expense[],
  fromDate: Date,
  months: number,
): number {
  if (months <= 0) return 0
  const startBoundary = addMonths(fromDate, -months)
  const inRange = expenses.filter((e) => {
    const d = new Date(e.date + 'T00:00:00')
    return d >= startBoundary && d < fromDate
  })
  if (inRange.length === 0) return 0
  const total = inRange.reduce((acc, e) => acc + e.amount, 0)
  return total / months
}

/**
 * Total de income para um dado mes, considerando recorrencia.
 */
export function incomeForMonth(
  incomes: IncomeEntry[],
  targetMonth: Date,
): number {
  const key = monthKey(targetMonth)
  let total = 0

  for (const inc of incomes) {
    const startDate = new Date(inc.date + 'T00:00:00')
    const startKey = monthKey(startDate)

    if (inc.recurrenceMonths <= 1) {
      if (startKey === key) total += inc.amount
      continue
    }

    // Recorrencia mensal por N meses a partir de startDate
    for (let i = 0; i < inc.recurrenceMonths; i++) {
      const projected = addMonths(startDate, i)
      if (monthKey(projected) === key) {
        total += inc.amount
        break
      }
    }
  }

  return total
}

/**
 * Total de bills (contas fixas) para um dado mes.
 */
export function billsForMonth(bills: Bill[], _targetMonth: Date): number {
  let total = 0
  for (const bill of bills) {
    if (bill.recurrence === 'monthly') {
      total += bill.amount
    } else if (bill.recurrence === 'yearly') {
      // Aproxima amortizando em 12 para forecast mensal.
      total += bill.amount / 12
    }
  }
  return total
}

export interface UseCashFlowForecastResult {
  projection: ForecastMonth[]
  averageBalance: number
  lowestBalance: ForecastMonth | null
  totalIncome: number
  totalExpenses: number
}

export function useCashFlowForecast(
  options: UseCashFlowForecastOptions,
): UseCashFlowForecastResult {
  const {
    bills,
    incomes,
    expenses,
    financialConfig,
    months = 6,
    fromDate = new Date(),
  } = options

  return useMemo(() => {
    const baseDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1)
    const avgVariable = averageVariableExpenses(expenses, baseDate, 3)

    const projection: ForecastMonth[] = []
    let cumulative = 0
    let totalIncome = 0
    let totalExpenses = 0

    for (let i = 0; i < months; i++) {
      const monthDate = addMonths(baseDate, i)
      const fixedIncome = financialConfig.monthlyIncome
      const incomeExtras = incomeForMonth(incomes, monthDate)
      const income = fixedIncome + incomeExtras
      const expensesFixed = billsForMonth(bills, monthDate)
      const expensesVariable = avgVariable
      const balance = income - expensesFixed - expensesVariable
      cumulative += balance

      projection.push({
        month: monthKey(monthDate),
        monthDate,
        income,
        expensesFixed,
        expensesVariable,
        balance,
        cumulativeBalance: cumulative,
      })

      totalIncome += income
      totalExpenses += expensesFixed + expensesVariable
    }

    const averageBalance =
      projection.length === 0 ? 0 : cumulative / projection.length

    const lowestBalance = projection.reduce<ForecastMonth | null>(
      (lowest, m) =>
        lowest === null || m.cumulativeBalance < lowest.cumulativeBalance
          ? m
          : lowest,
      null,
    )

    return {
      projection,
      averageBalance,
      lowestBalance,
      totalIncome,
      totalExpenses,
    }
  }, [bills, incomes, expenses, financialConfig, months, fromDate])
}
