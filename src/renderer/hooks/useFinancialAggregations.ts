/**
 * Hook puro de agregacoes financeiras mensais.
 *
 * Calcula totais, breakdowns por categoria, e serie historica por mes.
 * Consumido por graficos (upgrade 12) e KPIs. Zero side effects.
 *
 * Definido no upgrade 12 (foundations).
 */

import { useMemo } from 'react'
import type {
  Expense,
  IncomeEntry,
  FinancialCategory,
} from '../types'

export interface CategoryBreakdown {
  categoryId: string | null
  /** Nome legivel (da FinancialCategory ou do campo livre `category`). */
  label: string
  color: string | null
  total: number
  /** Percentual do total do periodo, 0-100. */
  percent: number
  count: number
}

export interface MonthSeriesPoint {
  /** YYYY-MM */
  month: string
  income: number
  expenses: number
  balance: number
}

interface UseFinancialAggregationsOptions {
  expenses: Expense[]
  incomes: IncomeEntry[]
  categories?: FinancialCategory[]
  /** Data inicial (ISO). Default: 6 meses atras do hoje. */
  fromISO?: string
  /** Data final (ISO). Default: hoje. */
  toISO?: string
}

function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

function addMonthsISO(iso: string, months: number): string {
  const d = new Date(iso + 'T00:00:00')
  const copy = new Date(d.getFullYear(), d.getMonth() + months, d.getDate())
  return copy.toISOString().slice(0, 10)
}

function todayISO(): string {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export interface UseFinancialAggregationsResult {
  totalExpenses: number
  totalIncome: number
  netBalance: number
  expensesByCategory: CategoryBreakdown[]
  incomeByCategory: CategoryBreakdown[]
  monthSeries: MonthSeriesPoint[]
  /** Contagem de transacoes no periodo. */
  transactionCount: number
}

export function useFinancialAggregations(
  options: UseFinancialAggregationsOptions,
): UseFinancialAggregationsResult {
  const {
    expenses,
    incomes,
    categories,
    toISO = todayISO(),
    fromISO = addMonthsISO(toISO, -6),
  } = options

  return useMemo(() => {
    const categoryMap: Record<string, FinancialCategory> = {}
    for (const c of categories ?? []) categoryMap[c.id] = c

    const filteredExpenses = expenses.filter(
      (e) => e.date >= fromISO && e.date <= toISO,
    )
    const filteredIncomes = incomes.filter(
      (i) => i.date >= fromISO && i.date <= toISO,
    )

    const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0)
    const totalIncome = filteredIncomes.reduce((s, i) => s + i.amount, 0)
    const netBalance = totalIncome - totalExpenses

    const expenseByCat = new Map<string, { total: number; count: number }>()
    for (const e of filteredExpenses) {
      const key = e.categoryId ?? `legacy:${e.category ?? 'outro'}`
      const cur = expenseByCat.get(key) ?? { total: 0, count: 0 }
      cur.total += e.amount
      cur.count += 1
      expenseByCat.set(key, cur)
    }

    const expensesByCategory: CategoryBreakdown[] = Array.from(
      expenseByCat.entries(),
    )
      .map(([key, { total, count }]) => {
        const isLegacy = key.startsWith('legacy:')
        const catId = isLegacy ? null : key
        const cat = catId ? categoryMap[catId] : null
        return {
          categoryId: catId,
          label: cat?.name ?? (isLegacy ? key.slice('legacy:'.length) : key),
          color: cat?.color ?? null,
          total,
          percent: totalExpenses === 0 ? 0 : (total / totalExpenses) * 100,
          count,
        }
      })
      .sort((a, b) => b.total - a.total)

    const incomeByCat = new Map<string, { total: number; count: number }>()
    for (const i of filteredIncomes) {
      const key = i.categoryId ?? `legacy:${i.kind}`
      const cur = incomeByCat.get(key) ?? { total: 0, count: 0 }
      cur.total += i.amount
      cur.count += 1
      incomeByCat.set(key, cur)
    }

    const incomeByCategory: CategoryBreakdown[] = Array.from(
      incomeByCat.entries(),
    )
      .map(([key, { total, count }]) => {
        const isLegacy = key.startsWith('legacy:')
        const catId = isLegacy ? null : key
        const cat = catId ? categoryMap[catId] : null
        return {
          categoryId: catId,
          label: cat?.name ?? (isLegacy ? key.slice('legacy:'.length) : key),
          color: cat?.color ?? null,
          total,
          percent: totalIncome === 0 ? 0 : (total / totalIncome) * 100,
          count,
        }
      })
      .sort((a, b) => b.total - a.total)

    const seriesMap = new Map<string, { income: number; expenses: number }>()
    for (const e of filteredExpenses) {
      const k = monthKey(e.date)
      const cur = seriesMap.get(k) ?? { income: 0, expenses: 0 }
      cur.expenses += e.amount
      seriesMap.set(k, cur)
    }
    for (const i of filteredIncomes) {
      const k = monthKey(i.date)
      const cur = seriesMap.get(k) ?? { income: 0, expenses: 0 }
      cur.income += i.amount
      seriesMap.set(k, cur)
    }

    const monthSeries: MonthSeriesPoint[] = Array.from(seriesMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        income: v.income,
        expenses: v.expenses,
        balance: v.income - v.expenses,
      }))

    return {
      totalExpenses,
      totalIncome,
      netBalance,
      expensesByCategory,
      incomeByCategory,
      monthSeries,
      transactionCount: filteredExpenses.length + filteredIncomes.length,
    }
  }, [expenses, incomes, categories, fromISO, toISO])
}
