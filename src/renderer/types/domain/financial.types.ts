export type ExpenseCategory = 'alimentacao' | 'transporte' | 'lazer' | 'moradia' | 'saude' | 'educacao' | 'outro'

export const EXPENSE_CATEGORY_SUGGESTIONS = [
  'Alimentação', 'Transporte', 'Lazer', 'Moradia', 'Saúde', 'Educação',
  'Assinaturas', 'Vestuário', 'Pets', 'Viagem', 'Eletrônicos', 'Outro',
]

export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  alimentacao: '#22c55e',
  'Alimentação': '#22c55e',
  transporte: 'var(--color-primary)',
  'Transporte': 'var(--color-primary)',
  lazer: '#f97316',
  'Lazer': '#f97316',
  moradia: 'var(--color-primary)',
  'Moradia': 'var(--color-primary)',
  saude: '#ef4444',
  'Saúde': '#ef4444',
  educacao: '#eab308',
  'Educação': '#eab308',
}

export interface Bill {
  id: string
  name: string
  amount: number
  dueDay: number
  category: string
  recurrence: 'monthly' | 'yearly'
  isPaid: boolean
  paidDate: string | null
  createdAt: string
}

export interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
  installments: number
  currentInstallment: number
  parentId: string | null
  note: string
  createdAt: string
  categoryId?: string | null
  tagIds?: string[]
}

export interface BudgetCategory {
  category: string
  limit: number
}

export interface FinancialCategory {
  id: string
  name: string
  color: string
  icon: string
  parentId: string | null
  monthlyLimit: number | null
  order: number
  createdAt: string
}

export interface FinancialTag {
  id: string
  name: string
  color: string
  projectId: string | null
  createdAt: string
}

export type InvestmentType = 'renda_fixa' | 'renda_variavel' | 'cripto' | 'fundo' | 'outro'

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  renda_fixa:     'Renda Fixa',
  renda_variavel: 'Renda Variável',
  cripto:         'Cripto',
  fundo:          'Fundo',
  outro:          'Outro',
}

export interface Investment {
  id: string
  name: string
  type: InvestmentType
  institution: string
  investedAmount: number
  currentValue: number
  date: string
  notes: string
  createdAt: string
}

export type IncomeKind = 'fixed' | 'extra'

export interface IncomeEntry {
  id: string
  source: string
  amount: number
  date: string
  kind: IncomeKind
  recurrenceMonths: number
  recurrenceIndex: number
  recurrenceGroupId: string | null
  note: string
  createdAt: string
  categoryId?: string | null
  tagIds?: string[]
}

export interface FinancialConfig {
  monthlyIncome: number
  monthlySpendingLimit: number
}

export interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string | null
  createdAt: string
}
