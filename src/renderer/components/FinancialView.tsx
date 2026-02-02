import { useEffect, useState } from 'react'
import type { Bill, Expense, BudgetCategory, IncomeEntry, FinancialConfig, SavingsGoal, ExpenseCategory } from '../types'
import { EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORY_COLORS } from '../types'
import { generateId, getTodayISO } from '../utils'

interface FinancialViewProps {
  bills: Bill[]
  expenses: Expense[]
  budgetCategories: BudgetCategory[]
  incomes: IncomeEntry[]
  financialConfig: FinancialConfig
  savingsGoals: SavingsGoal[]
  onAddBill: (input: Omit<Bill, 'id' | 'createdAt'>) => string
  onUpdateBill: (billId: string, updates: Partial<Omit<Bill, 'id' | 'createdAt'>>) => void
  onRemoveBill: (billId: string) => void
  onAddExpense: (input: Omit<Expense, 'id' | 'createdAt'>) => string
  onUpdateExpense: (expenseId: string, updates: Partial<Omit<Expense, 'id' | 'createdAt'>>) => void
  onRemoveExpense: (expenseId: string) => void
  onSetBudgetCategories: (categories: BudgetCategory[]) => void
  onAddIncome: (input: Omit<IncomeEntry, 'id' | 'createdAt'>) => string
  onUpdateIncome: (incomeId: string, updates: Partial<Omit<IncomeEntry, 'id' | 'createdAt'>>) => void
  onRemoveIncome: (incomeId: string) => void
  onUpdateFinancialConfig: (updates: Partial<FinancialConfig>) => void
  onAddSavingsGoal: (input: Omit<SavingsGoal, 'id' | 'createdAt'>) => string
  onUpdateSavingsGoal: (goalId: string, updates: Partial<Omit<SavingsGoal, 'id' | 'createdAt'>>) => void
  onRemoveSavingsGoal: (goalId: string) => void
}

type FinancialTab = 'overview' | 'bills' | 'expenses' | 'income' | 'goals'

const CATEGORY_OPTIONS: ExpenseCategory[] = [
  'alimentacao', 'transporte', 'lazer', 'moradia', 'saude', 'educacao', 'outro',
]

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const FinancialView = ({
  bills,
  expenses,
  budgetCategories,
  incomes,
  financialConfig,
  savingsGoals,
  onAddBill,
  onUpdateBill,
  onRemoveBill,
  onAddExpense,
  onUpdateExpense,
  onRemoveExpense,
  onSetBudgetCategories,
  onAddIncome,
  onRemoveIncome,
  onUpdateFinancialConfig,
  onAddSavingsGoal,
  onUpdateSavingsGoal,
  onRemoveSavingsGoal,
}: FinancialViewProps) => {
  const today = getTodayISO()
  const todayDate = new Date(today + 'T00:00:00')
  const [activeTab, setActiveTab] = useState<FinancialTab>('overview')
  const [incomeMonthOffset, setIncomeMonthOffset] = useState(0)

  // Month navigation for expenses
  const [expenseMonthOffset, setExpenseMonthOffset] = useState(0)
  const viewMonth = (() => {
    const d = new Date(todayDate)
    d.setMonth(d.getMonth() + expenseMonthOffset)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${yyyy}-${mm}`
  })()
  const viewMonthLabel = (() => {
    const [y, m] = viewMonth.split('-')
    return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`
  })()
  const incomeViewMonth = (() => {
    const d = new Date(todayDate)
    d.setMonth(d.getMonth() + incomeMonthOffset)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${yyyy}-${mm}`
  })()
  const incomeViewMonthLabel = (() => {
    const [y, m] = incomeViewMonth.split('-')
    return `${MONTH_NAMES[parseInt(m) - 1]} ${y}`
  })()

  // ---- Bills state ----
  const [showBillModal, setShowBillModal] = useState(false)
  const [billName, setBillName] = useState('')
  const [billAmount, setBillAmount] = useState('')
  const [billDueDay, setBillDueDay] = useState('1')
  const [billCategory, setBillCategory] = useState<ExpenseCategory>('outro')
  const [billRecurrence, setBillRecurrence] = useState<'monthly' | 'yearly'>('monthly')

  // ---- Expenses state ----
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('outro')
  const [expenseDate, setExpenseDate] = useState(today)
  const [expenseInstallments, setExpenseInstallments] = useState('1')
  const [expenseNote, setExpenseNote] = useState('')

  // ---- Income state ----
  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [incomeSource, setIncomeSource] = useState('')
  const [incomeAmount, setIncomeAmount] = useState('')
  const [incomeDate, setIncomeDate] = useState(today)
  const [incomeKind, setIncomeKind] = useState<'fixed' | 'extra'>('fixed')
  const [incomeRepeatMonths, setIncomeRepeatMonths] = useState('1')
  const [incomeNote, setIncomeNote] = useState('')

  // ---- Financial config state ----
  const [monthlyIncomeInput, setMonthlyIncomeInput] = useState(
    financialConfig.monthlyIncome > 0 ? financialConfig.monthlyIncome.toString() : '',
  )
  const [monthlyLimitInput, setMonthlyLimitInput] = useState(
    financialConfig.monthlySpendingLimit > 0 ? financialConfig.monthlySpendingLimit.toString() : '',
  )

  useEffect(() => {
    setMonthlyIncomeInput(financialConfig.monthlyIncome > 0 ? financialConfig.monthlyIncome.toString() : '')
    setMonthlyLimitInput(financialConfig.monthlySpendingLimit > 0 ? financialConfig.monthlySpendingLimit.toString() : '')
  }, [financialConfig.monthlyIncome, financialConfig.monthlySpendingLimit])

  // ---- Edit expense state ----
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)

  // ---- Budget state ----
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [budgetEdits, setBudgetEdits] = useState<Record<ExpenseCategory, string>>({
    alimentacao: '', transporte: '', lazer: '', moradia: '', saude: '', educacao: '', outro: '',
  })

  // ---- Goals state ----
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalCurrent, setGoalCurrent] = useState('')
  const [goalDeadline, setGoalDeadline] = useState('')

  // ---- Deposit modal ----
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState('')

  // ========================================
  // HELPERS
  // ========================================

  const currentMonth = today.slice(0, 7)

  const viewMonthExpenses = expenses.filter(e => e.date.startsWith(viewMonth))
  const currentMonthExpenses = expenses.filter(e => e.date.startsWith(currentMonth))
  const viewMonthIncomes = incomes.filter(i => i.date.startsWith(incomeViewMonth))
  const currentMonthIncomes = incomes.filter(i => i.date.startsWith(currentMonth))

  const getExpensesByCategory = (monthExpenses: Expense[]) =>
    monthExpenses.reduce<Record<ExpenseCategory, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, { alimentacao: 0, transporte: 0, lazer: 0, moradia: 0, saude: 0, educacao: 0, outro: 0 })

  const expensesByCategory = getExpensesByCategory(currentMonthExpenses)
  const viewExpensesByCategory = getExpensesByCategory(viewMonthExpenses)

  const totalMonthExpenses = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
  const totalViewMonthExpenses = viewMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
  const totalMonthIncomes = currentMonthIncomes.reduce((sum, i) => sum + i.amount, 0)
  const totalViewMonthIncomes = viewMonthIncomes.reduce((sum, i) => sum + i.amount, 0)

  const totalBills = bills.reduce((sum, b) => sum + b.amount, 0)
  const paidBills = bills.filter(b => b.isPaid)
  const unpaidBills = bills.filter(b => !b.isPaid).sort((a, b) => a.dueDay - b.dueDay)

  const totalGoalsSaved = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0)
  const totalGoalsTarget = savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0)

  const totalBudgetLimit = budgetCategories.reduce((sum, b) => sum + b.limit, 0)
  const budgetRemaining = totalBudgetLimit > 0 ? totalBudgetLimit - totalMonthExpenses : 0
  const spendingLimitRemaining = financialConfig.monthlySpendingLimit > 0
    ? financialConfig.monthlySpendingLimit - totalMonthExpenses
    : null
  const incomeBalance = totalMonthIncomes - totalMonthExpenses

  const getBudgetLimit = (cat: ExpenseCategory): number | null => {
    const found = budgetCategories.find(b => b.category === cat)
    return found ? found.limit : null
  }

  const formatCurrency = (value: number): string => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`
  }

  const getDaysUntilDue = (dueDay: number): number => {
    const currentDay = todayDate.getDate()
    if (dueDay >= currentDay) return dueDay - currentDay
    // Next month
    const lastDay = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate()
    return (lastDay - currentDay) + dueDay
  }

  const getDueBadge = (bill: Bill): { text: string; color: string } => {
    const days = getDaysUntilDue(bill.dueDay)
    if (days === 0) return { text: 'Hoje', color: '#ef4444' }
    if (days <= 3) return { text: `${days}d`, color: '#f97316' }
    if (days <= 7) return { text: `${days}d`, color: '#eab308' }
    return { text: `${days}d`, color: 'var(--color-text-muted)' }
  }

  // Donut chart data
  const donutData = (() => {
    const total = totalMonthExpenses || 1
    const segments: { category: ExpenseCategory; pct: number; color: string }[] = []
    let accum = 0
    for (const cat of CATEGORY_OPTIONS) {
      const spent = expensesByCategory[cat]
      if (spent <= 0) continue
      const pct = (spent / total) * 100
      segments.push({ category: cat, pct, color: EXPENSE_CATEGORY_COLORS[cat] })
      accum += pct
    }
    // Fallback if nothing
    if (segments.length === 0) {
      segments.push({ category: 'outro', pct: 100, color: 'var(--color-border)' })
    }
    return segments
  })()

  const donutGradient = (() => {
    let accum = 0
    const stops: string[] = []
    for (const seg of donutData) {
      stops.push(`${seg.color} ${accum}% ${accum + seg.pct}%`)
      accum += seg.pct
    }
    return `conic-gradient(${stops.join(', ')})`
  })()

  // ========================================
  // BILL HANDLERS
  // ========================================

  const resetBillForm = () => {
    setBillName('')
    setBillAmount('')
    setBillDueDay('1')
    setBillCategory('outro')
    setBillRecurrence('monthly')
  }

  const handleAddBill = () => {
    const amount = parseFloat(billAmount.replace(',', '.'))
    if (!billName.trim() || isNaN(amount) || amount <= 0) return
    const dueDay = Math.max(1, Math.min(31, parseInt(billDueDay) || 1))
    onAddBill({
      name: billName.trim(),
      amount,
      dueDay,
      category: billCategory,
      recurrence: billRecurrence,
      isPaid: false,
      paidDate: null,
    })
    resetBillForm()
    setShowBillModal(false)
  }

  const handleTogglePaid = (bill: Bill) => {
    onUpdateBill(bill.id, {
      isPaid: !bill.isPaid,
      paidDate: !bill.isPaid ? today : null,
    })
  }

  // ========================================
  // EXPENSE HANDLERS
  // ========================================

  const resetExpenseForm = () => {
    setExpenseDescription('')
    setExpenseAmount('')
    setExpenseCategory('outro')
    setExpenseDate(today)
    setExpenseInstallments('1')
    setExpenseNote('')
    setEditingExpenseId(null)
  }

  const handleAddExpense = () => {
    const amount = parseFloat(expenseAmount.replace(',', '.'))
    if (!expenseDescription.trim() || isNaN(amount) || amount <= 0) return
    const installments = Math.max(1, parseInt(expenseInstallments) || 1)

    if (editingExpenseId) {
      onUpdateExpense(editingExpenseId, {
        description: expenseDescription.trim(),
        amount,
        category: expenseCategory,
        date: expenseDate,
        installments,
        note: expenseNote.trim(),
      })
    } else {
      onAddExpense({
        description: expenseDescription.trim(),
        amount,
        category: expenseCategory,
        date: expenseDate,
        installments,
        currentInstallment: 1,
        parentId: null,
        note: expenseNote.trim(),
      })
    }
    resetExpenseForm()
    setShowExpenseModal(false)
  }

  const openEditExpense = (expense: Expense) => {
    setEditingExpenseId(expense.id)
    setExpenseDescription(expense.description)
    setExpenseAmount(expense.amount.toString())
    setExpenseCategory(expense.category)
    setExpenseDate(expense.date)
    setExpenseInstallments(expense.installments.toString())
    setExpenseNote(expense.note)
    setShowExpenseModal(true)
  }

  // ========================================
  // BUDGET HANDLERS
  // ========================================

  const openBudgetModal = () => {
    const edits: Record<ExpenseCategory, string> = {
      alimentacao: '', transporte: '', lazer: '', moradia: '', saude: '', educacao: '', outro: '',
    }
    for (const bc of budgetCategories) {
      edits[bc.category] = bc.limit > 0 ? bc.limit.toString() : ''
    }
    setBudgetEdits(edits)
    setShowBudgetModal(true)
  }

  const handleSaveBudget = () => {
    const categories: BudgetCategory[] = []
    for (const cat of CATEGORY_OPTIONS) {
      const val = parseFloat(budgetEdits[cat].replace(',', '.'))
      if (!isNaN(val) && val > 0) {
        categories.push({ category: cat, limit: val })
      }
    }
    onSetBudgetCategories(categories)
    setShowBudgetModal(false)
  }

  // ========================================
  // INCOME HANDLERS
  // ========================================

  const addMonthsToISO = (isoDate: string, monthsToAdd: number): string => {
    const [yearStr, monthStr, dayStr] = isoDate.split('-')
    const y = parseInt(yearStr)
    const m = parseInt(monthStr) - 1
    const d = parseInt(dayStr)
    const dt = new Date(y, m + monthsToAdd, d)
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  }

  const resetIncomeForm = () => {
    setIncomeSource('')
    setIncomeAmount('')
    setIncomeDate(today)
    setIncomeKind('fixed')
    setIncomeRepeatMonths('1')
    setIncomeNote('')
  }

  const handleAddIncome = () => {
    const amount = parseFloat(incomeAmount.replace(',', '.'))
    if (!incomeSource.trim() || isNaN(amount) || amount <= 0) return

    const repeatMonths = Math.max(1, Math.min(60, parseInt(incomeRepeatMonths) || 1))
    const recurrenceGroupId = repeatMonths > 1 ? generateId() : null

    for (let i = 0; i < repeatMonths; i++) {
      onAddIncome({
        source: incomeSource.trim(),
        amount,
        date: addMonthsToISO(incomeDate, i),
        kind: incomeKind,
        recurrenceMonths: repeatMonths,
        recurrenceIndex: i + 1,
        recurrenceGroupId,
        note: incomeNote.trim(),
      })
    }

    resetIncomeForm()
    setShowIncomeModal(false)
  }

  const handleSaveFinancialConfig = () => {
    const monthlyIncome = parseFloat(monthlyIncomeInput.replace(',', '.'))
    const monthlySpendingLimit = parseFloat(monthlyLimitInput.replace(',', '.'))
    onUpdateFinancialConfig({
      monthlyIncome: !isNaN(monthlyIncome) && monthlyIncome > 0 ? monthlyIncome : 0,
      monthlySpendingLimit: !isNaN(monthlySpendingLimit) && monthlySpendingLimit > 0 ? monthlySpendingLimit : 0,
    })
  }

  // ========================================
  // GOAL HANDLERS
  // ========================================

  const resetGoalForm = () => {
    setGoalName('')
    setGoalTarget('')
    setGoalCurrent('')
    setGoalDeadline('')
    setEditingGoalId(null)
  }

  const openAddGoalModal = () => {
    resetGoalForm()
    setShowGoalModal(true)
  }

  const openEditGoalModal = (goal: SavingsGoal) => {
    setEditingGoalId(goal.id)
    setGoalName(goal.name)
    setGoalTarget(goal.targetAmount.toString())
    setGoalCurrent(goal.currentAmount.toString())
    setGoalDeadline(goal.deadline ?? '')
    setShowGoalModal(true)
  }

  const handleSaveGoal = () => {
    const target = parseFloat(goalTarget.replace(',', '.'))
    const current = parseFloat(goalCurrent.replace(',', '.'))
    if (!goalName.trim() || isNaN(target) || target <= 0) return

    if (editingGoalId) {
      onUpdateSavingsGoal(editingGoalId, {
        name: goalName.trim(),
        targetAmount: target,
        currentAmount: isNaN(current) ? 0 : current,
        deadline: goalDeadline.trim() || null,
      })
    } else {
      onAddSavingsGoal({
        name: goalName.trim(),
        targetAmount: target,
        currentAmount: isNaN(current) ? 0 : current,
        deadline: goalDeadline.trim() || null,
      })
    }
    resetGoalForm()
    setShowGoalModal(false)
  }

  const openDepositModal = (goalId: string) => {
    setDepositGoalId(goalId)
    setDepositAmount('')
    setShowDepositModal(true)
  }

  const handleDeposit = () => {
    if (!depositGoalId) return
    const amount = parseFloat(depositAmount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) return
    const goal = savingsGoals.find(g => g.id === depositGoalId)
    if (!goal) return
    onUpdateSavingsGoal(depositGoalId, {
      currentAmount: goal.currentAmount + amount,
    })
    setShowDepositModal(false)
    setDepositGoalId(null)
    setDepositAmount('')
  }

  const getMonthsRemaining = (deadline: string): number => {
    const deadlineDate = new Date(deadline + 'T00:00:00')
    const diffMs = deadlineDate.getTime() - todayDate.getTime()
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30)))
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="financial-layout">
      {/* Header */}
      <header className="financial-header">
        <div>
          <h2 className="financial-header-title">Financeiro</h2>
          <p className="financial-header-sub">
            {MONTH_NAMES[todayDate.getMonth()]} {todayDate.getFullYear()}
          </p>
        </div>
      </header>

      {/* Summary cards - always visible */}
      <div className="financial-summary">
        <div className="financial-summary-card">
          <div className="financial-summary-value">{formatCurrency(totalBills)}</div>
          <div className="financial-summary-label">Total Contas</div>
        </div>
        <div className="financial-summary-card" style={unpaidBills.length > 0 ? { borderColor: '#f97316' } : undefined}>
          <div className="financial-summary-value" style={unpaidBills.length > 0 ? { color: '#f97316' } : undefined}>
            {unpaidBills.length}
          </div>
          <div className="financial-summary-label">Pendentes</div>
        </div>
        <div className="financial-summary-card">
          <div className="financial-summary-value">{formatCurrency(totalMonthExpenses)}</div>
          <div className="financial-summary-label">Gastos do Mes</div>
        </div>
        <div className="financial-summary-card">
          <div className="financial-summary-value" style={{ color: '#22c55e' }}>{formatCurrency(totalMonthIncomes)}</div>
          <div className="financial-summary-label">Recebido no Mes</div>
        </div>
        {financialConfig.monthlySpendingLimit > 0 && (
          <div className="financial-summary-card" style={spendingLimitRemaining !== null && spendingLimitRemaining < 0 ? { borderColor: '#ef4444' } : undefined}>
            <div className="financial-summary-value" style={{ color: spendingLimitRemaining !== null && spendingLimitRemaining < 0 ? '#ef4444' : 'var(--color-text)' }}>
              {formatCurrency(financialConfig.monthlySpendingLimit)}
            </div>
            <div className="financial-summary-label">Teto de Gastos</div>
          </div>
        )}
        {totalBudgetLimit > 0 && (
          <div className="financial-summary-card" style={budgetRemaining < 0 ? { borderColor: '#ef4444' } : undefined}>
            <div className="financial-summary-value" style={{ color: budgetRemaining < 0 ? '#ef4444' : '#22c55e' }}>
              {formatCurrency(budgetRemaining)}
            </div>
            <div className="financial-summary-label">Orcamento Restante</div>
          </div>
        )}
        {savingsGoals.length > 0 && (
          <div className="financial-summary-card">
            <div className="financial-summary-value" style={{ color: 'var(--color-primary)' }}>
              {formatCurrency(totalGoalsSaved)}
            </div>
            <div className="financial-summary-label">Metas Poupadas</div>
          </div>
        )}
        {financialConfig.monthlyIncome > 0 && (
          <div className="financial-summary-card">
            <div className="financial-summary-value">{formatCurrency(financialConfig.monthlyIncome)}</div>
            <div className="financial-summary-label">Recebimento Base</div>
          </div>
        )}
      </div>

      {/* Tab buttons */}
      <div className="financial-tabs">
        {([
          { key: 'overview' as const, label: 'Visao Geral' },
          { key: 'bills' as const, label: 'Contas' },
          { key: 'expenses' as const, label: 'Gastos' },
          { key: 'income' as const, label: 'Recebimentos' },
          { key: 'goals' as const, label: 'Metas' },
        ]).map(tab => (
          <button
            key={tab.key}
            className={`financial-tab ${activeTab === tab.key ? 'is-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================ */}
      {/* TAB: VISAO GERAL (OVERVIEW) */}
      {/* ============================================ */}
      {activeTab === 'overview' && (
        <div className="financial-content">
          <div className="financial-overview">
            {/* Budget bars + Donut */}
            <div className="financial-overview-left">
              <h3 className="financial-section-title">Orcamento por Categoria</h3>
              <div className="financial-budget-list">
                {CATEGORY_OPTIONS.map(cat => {
                  const spent = expensesByCategory[cat]
                  const limit = getBudgetLimit(cat)
                  if (spent === 0 && limit === null) return null
                  const pct = limit ? Math.min(100, (spent / limit) * 100) : 0
                  const overBudget = limit !== null && spent > limit
                  return (
                    <div key={cat} className="financial-budget-row">
                      <div className="financial-budget-row-header">
                        <span className="financial-budget-cat-dot" style={{ background: EXPENSE_CATEGORY_COLORS[cat] }} />
                        <span className="financial-budget-label">{EXPENSE_CATEGORY_LABELS[cat]}</span>
                        <span className={`financial-budget-amount ${overBudget ? 'over' : ''}`}>
                          {formatCurrency(spent)}
                          {limit !== null && <span className="financial-budget-limit"> / {formatCurrency(limit)}</span>}
                        </span>
                      </div>
                      {limit !== null && (
                        <div className="financial-budget-track">
                          <div
                            className="financial-budget-fill"
                            style={{
                              width: `${Math.min(100, pct)}%`,
                              background: overBudget ? '#ef4444' : EXPENSE_CATEGORY_COLORS[cat],
                            }}
                          />
                        </div>
                      )}
                      {overBudget && (
                        <span className="financial-budget-warning">Acima do limite!</span>
                      )}
                    </div>
                  )
                })}
                {budgetCategories.length === 0 && totalMonthExpenses === 0 && (
                  <p className="financial-muted">Nenhum gasto ou orcamento definido.</p>
                )}
              </div>
              <button className="btn btn-secondary" style={{ marginTop: 8, alignSelf: 'flex-start' }} onClick={openBudgetModal}>
                Definir Orcamento
              </button>
              <div className="card" style={{ marginTop: 12, width: '100%' }}>
                <h4 style={{ marginBottom: 10 }}>Limites Mensais</h4>
                <div className="form-group">
                  <label className="form-label">Valor base que voce recebe por mes (R$)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={monthlyIncomeInput}
                    onChange={e => setMonthlyIncomeInput(e.target.value)}
                    placeholder="Ex: 2500"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Teto de gastos do mes (R$)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={monthlyLimitInput}
                    onChange={e => setMonthlyLimitInput(e.target.value)}
                    placeholder="Ex: 1000"
                  />
                  <p className="form-hint">Esse limite pode ser diferente do que voce recebe.</p>
                </div>
                <button className="btn btn-secondary" onClick={handleSaveFinancialConfig}>
                  Salvar Limites
                </button>
              </div>
            </div>

            <div className="financial-overview-right">
              {/* Donut chart */}
              {totalMonthExpenses > 0 && (
                <div className="financial-donut-section">
                  <h3 className="financial-section-title">Distribuicao</h3>
                  <div className="financial-donut-wrapper">
                    <div className="financial-donut" style={{ background: donutGradient }}>
                      <div className="financial-donut-hole">
                        <span className="financial-donut-total">{formatCurrency(totalMonthExpenses)}</span>
                      </div>
                    </div>
                    <div className="financial-donut-legend">
                      {donutData.filter(s => s.category !== 'outro' || s.pct > 0).map(seg => (
                        <div key={seg.category} className="financial-donut-legend-item">
                          <span className="financial-donut-legend-dot" style={{ background: seg.color }} />
                          <span>{EXPENSE_CATEGORY_LABELS[seg.category]}</span>
                          <span className="financial-donut-legend-pct">{seg.pct.toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Upcoming bills */}
              <div className="financial-upcoming">
                <h3 className="financial-section-title">Proximas Contas</h3>
                {unpaidBills.length > 0 ? (
                  <div className="financial-upcoming-list">
                    {unpaidBills.slice(0, 5).map(bill => {
                      const badge = getDueBadge(bill)
                      return (
                        <div key={bill.id} className="financial-upcoming-item">
                          <span className="financial-upcoming-due" style={{ color: badge.color }}>
                            {badge.text}
                          </span>
                          <span className="financial-upcoming-name">{bill.name}</span>
                          <span className="financial-upcoming-amount">{formatCurrency(bill.amount)}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="financial-muted">Todas as contas estao pagas!</p>
                )}
              </div>

              <div className="financial-upcoming" style={{ marginTop: 12 }}>
                <h3 className="financial-section-title">Entrada x Saida</h3>
                <div className="financial-upcoming-list">
                  <div className="financial-upcoming-item">
                    <span className="financial-upcoming-name">Recebido no mes</span>
                    <span className="financial-upcoming-amount" style={{ color: '#22c55e' }}>
                      {formatCurrency(totalMonthIncomes)}
                    </span>
                  </div>
                  <div className="financial-upcoming-item">
                    <span className="financial-upcoming-name">Gastos do mes</span>
                    <span className="financial-upcoming-amount">
                      {formatCurrency(totalMonthExpenses)}
                    </span>
                  </div>
                  <div className="financial-upcoming-item">
                    <span className="financial-upcoming-name">Saldo atual</span>
                    <span
                      className="financial-upcoming-amount"
                      style={{ color: incomeBalance >= 0 ? '#22c55e' : '#ef4444' }}
                    >
                      {formatCurrency(incomeBalance)}
                    </span>
                  </div>
                  {spendingLimitRemaining !== null && (
                    <div className="financial-upcoming-item">
                      <span className="financial-upcoming-name">Restante ate o teto</span>
                      <span
                        className="financial-upcoming-amount"
                        style={{ color: spendingLimitRemaining >= 0 ? 'var(--color-text)' : '#ef4444' }}
                      >
                        {formatCurrency(spendingLimitRemaining)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Goals progress mini */}
          {savingsGoals.length > 0 && (
            <div className="financial-goals-mini">
              <h3 className="financial-section-title">Progresso das Metas</h3>
              <div className="financial-goals-grid">
                {savingsGoals.map(goal => {
                  const pct = goal.targetAmount > 0 ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100) : 0
                  const isComplete = goal.currentAmount >= goal.targetAmount
                  return (
                    <div key={goal.id} className="financial-goal-mini">
                      <div className="financial-goal-mini-header">
                        <span className="financial-goal-mini-name">{goal.name}</span>
                        <span className="financial-goal-mini-pct" style={{ color: isComplete ? '#22c55e' : 'var(--color-text-secondary)' }}>
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="financial-goal-bar">
                        <div className="financial-goal-fill" style={{ width: `${pct}%`, background: isComplete ? '#22c55e' : undefined }} />
                      </div>
                      <span className="financial-goal-mini-amount">
                        {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* TAB: CONTAS (BILLS) */}
      {/* ============================================ */}
      {activeTab === 'bills' && (
        <div className="financial-content">
          <div className="financial-content-header">
            <p className="financial-content-info">
              Total: {formatCurrency(totalBills)} | Pagas: {paidBills.length}/{bills.length}
            </p>
            <button className="btn btn-primary" onClick={() => { resetBillForm(); setShowBillModal(true) }}>
              + Conta
            </button>
          </div>

          {unpaidBills.length > 0 && (
            <div className="financial-list-section">
              <h3 className="financial-section-title">Pendentes ({unpaidBills.length})</h3>
              <div className="financial-list">
                {unpaidBills.map(bill => {
                  const badge = getDueBadge(bill)
                  return (
                    <div key={bill.id} className="financial-bill" style={{ borderLeftColor: EXPENSE_CATEGORY_COLORS[bill.category] }}>
                      <button
                        className="financial-paid-btn"
                        onClick={() => handleTogglePaid(bill)}
                        title="Marcar como paga"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                      <div className="financial-bill-info">
                        <div className="financial-bill-name">{bill.name}</div>
                        <div className="financial-bill-meta">
                          Dia {bill.dueDay} | {EXPENSE_CATEGORY_LABELS[bill.category]} | {bill.recurrence === 'monthly' ? 'Mensal' : 'Anual'}
                        </div>
                      </div>
                      <span className="financial-bill-due" style={{ color: badge.color }}>{badge.text}</span>
                      <span className="financial-amount">{formatCurrency(bill.amount)}</span>
                      <button className="btn-icon btn-icon-danger" onClick={() => onRemoveBill(bill.id)} title="Remover">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {paidBills.length > 0 && (
            <div className="financial-list-section">
              <h3 className="financial-section-title">Pagas ({paidBills.length})</h3>
              <div className="financial-list">
                {paidBills
                  .sort((a, b) => a.dueDay - b.dueDay)
                  .map(bill => (
                    <div key={bill.id} className="financial-bill is-paid" style={{ borderLeftColor: EXPENSE_CATEGORY_COLORS[bill.category] }}>
                      <button
                        className="financial-paid-btn is-paid"
                        onClick={() => handleTogglePaid(bill)}
                        title="Desmarcar"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                      <div className="financial-bill-info">
                        <div className="financial-bill-name" style={{ textDecoration: 'line-through', opacity: 0.6 }}>{bill.name}</div>
                        <div className="financial-bill-meta">
                          Dia {bill.dueDay} | {EXPENSE_CATEGORY_LABELS[bill.category]}
                          {bill.paidDate && ` | Pago em ${bill.paidDate.split('-').reverse().join('/')}`}
                        </div>
                      </div>
                      <span className="financial-amount" style={{ opacity: 0.5 }}>{formatCurrency(bill.amount)}</span>
                      <button className="btn-icon btn-icon-danger" onClick={() => onRemoveBill(bill.id)} title="Remover">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {bills.length === 0 && (
            <div className="financial-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" style={{ opacity: 0.3 }}>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
              <p>Nenhuma conta cadastrada.</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* TAB: GASTOS (EXPENSES) */}
      {/* ============================================ */}
      {activeTab === 'expenses' && (
        <div className="financial-content">
          <div className="financial-content-header">
            <div className="financial-month-nav">
              <button className="btn-icon" onClick={() => setExpenseMonthOffset(o => o - 1)} title="Mes anterior">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="financial-month-label">{viewMonthLabel}</span>
              <button className="btn-icon" onClick={() => setExpenseMonthOffset(o => o + 1)} title="Proximo mes" disabled={expenseMonthOffset >= 0}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              {expenseMonthOffset !== 0 && (
                <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setExpenseMonthOffset(0)}>
                  Hoje
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={openBudgetModal}>
                Orcamento
              </button>
              <button className="btn btn-primary" onClick={() => { resetExpenseForm(); setShowExpenseModal(true) }}>
                + Gasto
              </button>
            </div>
          </div>

          {/* Budget bars */}
          <div className="financial-budget-list">
            {CATEGORY_OPTIONS.map(cat => {
              const spent = viewExpensesByCategory[cat]
              const limit = getBudgetLimit(cat)
              if (spent === 0 && limit === null) return null
              const pct = limit ? Math.min(100, (spent / limit) * 100) : 0
              const overBudget = limit !== null && spent > limit
              return (
                <div key={cat} className="financial-budget-row compact">
                  <div className="financial-budget-row-header">
                    <span className="financial-budget-cat-dot" style={{ background: EXPENSE_CATEGORY_COLORS[cat] }} />
                    <span className="financial-budget-label">{EXPENSE_CATEGORY_LABELS[cat]}</span>
                    <span className={`financial-budget-amount ${overBudget ? 'over' : ''}`}>
                      {formatCurrency(spent)}
                      {limit !== null && <span className="financial-budget-limit"> / {formatCurrency(limit)}</span>}
                    </span>
                  </div>
                  {limit !== null && (
                    <div className="financial-budget-track">
                      <div
                        className="financial-budget-fill"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          background: overBudget ? '#ef4444' : EXPENSE_CATEGORY_COLORS[cat],
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Total */}
          <div className="financial-expense-total">
            Total: {formatCurrency(totalViewMonthExpenses)}
          </div>

          {/* Expenses grouped by date */}
          {viewMonthExpenses.length > 0 ? (
            (() => {
              const sorted = [...viewMonthExpenses].sort((a, b) => b.date.localeCompare(a.date))
              const groups: Record<string, Expense[]> = {}
              for (const e of sorted) {
                if (!groups[e.date]) groups[e.date] = []
                groups[e.date].push(e)
              }
              return Object.entries(groups).map(([date, exps]) => (
                <div key={date} className="financial-expense-group">
                  <div className="financial-expense-date-divider">
                    {date.split('-').reverse().join('/')}
                  </div>
                  {exps.map(expense => (
                    <div key={expense.id} className="financial-expense" style={{ borderLeftColor: EXPENSE_CATEGORY_COLORS[expense.category] }}>
                      <div className="financial-expense-info">
                        <div className="financial-expense-desc">{expense.description}</div>
                        <div className="financial-expense-meta">
                          {EXPENSE_CATEGORY_LABELS[expense.category]}
                          {expense.installments > 1 && ` | ${expense.currentInstallment}/${expense.installments}x`}
                          {expense.note && ` | ${expense.note}`}
                        </div>
                      </div>
                      <span className="financial-amount">{formatCurrency(expense.amount)}</span>
                      <button className="btn-icon" onClick={() => openEditExpense(expense)} title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button className="btn-icon btn-icon-danger" onClick={() => onRemoveExpense(expense.id)} title="Remover">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ))
            })()
          ) : (
            <div className="financial-empty">
              <p>Nenhum gasto registrado neste mes.</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* TAB: RECEBIMENTOS */}
      {/* ============================================ */}
      {activeTab === 'income' && (
        <div className="financial-content">
          <div className="financial-content-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn-icon" onClick={() => setIncomeMonthOffset(o => o - 1)} title="Mes anterior">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <strong>{incomeViewMonthLabel}</strong>
              <button className="btn-icon" onClick={() => setIncomeMonthOffset(o => o + 1)} title="Proximo mes" disabled={incomeMonthOffset >= 0}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
              {incomeMonthOffset !== 0 && (
                <button className="btn btn-sm btn-secondary" onClick={() => setIncomeMonthOffset(0)}>
                  Mes atual
                </button>
              )}
            </div>
            <button className="btn btn-primary" onClick={() => setShowIncomeModal(true)} style={{ marginLeft: 'auto' }}>
              + Recebimento
            </button>
          </div>

          <div className="financial-summary" style={{ marginBottom: 12 }}>
            <div className="financial-summary-card">
              <div className="financial-summary-value" style={{ color: '#22c55e' }}>{formatCurrency(totalViewMonthIncomes)}</div>
              <div className="financial-summary-label">Total Recebido</div>
            </div>
            {financialConfig.monthlyIncome > 0 && (
              <div className="financial-summary-card">
                <div className="financial-summary-value">{formatCurrency(financialConfig.monthlyIncome)}</div>
                <div className="financial-summary-label">Base Mensal</div>
              </div>
            )}
          </div>

          {viewMonthIncomes.length > 0 ? (
            (() => {
              const sorted = [...viewMonthIncomes].sort((a, b) => b.date.localeCompare(a.date))
              const groups: Record<string, IncomeEntry[]> = {}
              for (const income of sorted) {
                if (!groups[income.date]) groups[income.date] = []
                groups[income.date].push(income)
              }
              return Object.entries(groups).map(([date, items]) => (
                <div key={date} className="financial-expense-group">
                  <div className="financial-expense-date-divider">
                    {date.split('-').reverse().join('/')}
                  </div>
                  {items.map(income => (
                    <div
                      key={income.id}
                      className="financial-expense"
                      style={{ borderLeftColor: income.kind === 'fixed' ? '#22c55e' : '#3b82f6' }}
                    >
                      <div className="financial-expense-info">
                        <div className="financial-expense-desc">{income.source}</div>
                        <div className="financial-expense-meta">
                          {income.kind === 'fixed' ? 'Fixo' : 'Extra'}
                          {income.recurrenceMonths > 1 && ` | ${income.recurrenceIndex}/${income.recurrenceMonths} meses`}
                          {income.note && ` | ${income.note}`}
                        </div>
                      </div>
                      <span className="financial-amount" style={{ color: '#22c55e' }}>{formatCurrency(income.amount)}</span>
                      <button className="btn-icon btn-icon-danger" onClick={() => onRemoveIncome(income.id)} title="Remover">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ))
            })()
          ) : (
            <div className="financial-empty">
              <p>Nenhum recebimento registrado neste mes.</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* TAB: METAS (SAVINGS GOALS) */}
      {/* ============================================ */}
      {activeTab === 'goals' && (
        <div className="financial-content">
          <div className="financial-content-header">
            {savingsGoals.length > 0 && (
              <p className="financial-content-info">
                Total poupado: {formatCurrency(totalGoalsSaved)} / {formatCurrency(totalGoalsTarget)}
              </p>
            )}
            <button className="btn btn-primary" onClick={openAddGoalModal} style={{ marginLeft: 'auto' }}>
              + Meta
            </button>
          </div>

          {savingsGoals.length > 0 ? (
            <div className="financial-goals-grid">
              {savingsGoals.map(goal => {
                const progress = goal.targetAmount > 0
                  ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
                  : 0
                const isComplete = goal.currentAmount >= goal.targetAmount
                const remaining = goal.targetAmount - goal.currentAmount
                const monthsLeft = goal.deadline ? getMonthsRemaining(goal.deadline) : null
                const monthlySavings = monthsLeft && remaining > 0 ? remaining / monthsLeft : null

                return (
                  <div key={goal.id} className="financial-goal">
                    <div className="financial-goal-header">
                      <div>
                        <div className="financial-goal-name">{goal.name}</div>
                        {goal.deadline && (
                          <div className="financial-goal-deadline">
                            Prazo: {goal.deadline.split('-').reverse().join('/')}
                            {monthsLeft !== null && ` (${monthsLeft} mes${monthsLeft > 1 ? 'es' : ''})`}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm btn-primary" onClick={() => openDepositModal(goal.id)}>
                          Depositar
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEditGoalModal(goal)}>
                          Editar
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => onRemoveSavingsGoal(goal.id)}>
                          Remover
                        </button>
                      </div>
                    </div>

                    <div className="financial-goal-progress">
                      <span className="financial-goal-amount">
                        {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                      </span>
                      <span className="financial-goal-pct" style={{ color: isComplete ? '#22c55e' : 'var(--color-text-secondary)' }}>
                        {progress.toFixed(1)}%
                        {isComplete && ' - Concluida!'}
                      </span>
                    </div>

                    {/* Progress bar with milestones */}
                    <div className="financial-goal-bar-wrapper">
                      <div className="financial-goal-bar">
                        <div
                          className="financial-goal-fill"
                          style={{
                            width: `${progress}%`,
                            background: isComplete ? '#22c55e' : undefined,
                          }}
                        />
                      </div>
                      <div className="financial-goal-milestones">
                        <span className="financial-goal-milestone" style={{ left: '25%' }} />
                        <span className="financial-goal-milestone" style={{ left: '50%' }} />
                        <span className="financial-goal-milestone" style={{ left: '75%' }} />
                      </div>
                    </div>

                    {monthlySavings && !isComplete && (
                      <div className="financial-goal-meta">
                        <span>Economia mensal necessaria: {formatCurrency(monthlySavings)}</span>
                        <span>Faltam: {formatCurrency(remaining)}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="financial-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" style={{ opacity: 0.3 }}>
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <p>Nenhuma meta cadastrada.</p>
            </div>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* MODAL: NOVA CONTA */}
      {/* ============================================ */}
      {showBillModal && (
        <div className="modal-backdrop" onClick={() => setShowBillModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Nova Conta</h2>
              <button className="modal-close-btn" onClick={() => setShowBillModal(false)}>&times;</button>
            </header>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nome</label>
                <input type="text" className="form-input" value={billName} onChange={e => setBillName(e.target.value)} placeholder="Ex: Aluguel, Internet, Luz..." autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Valor (R$)</label>
                <input type="text" className="form-input" value={billAmount} onChange={e => setBillAmount(e.target.value)} placeholder="0,00" />
              </div>
              <div className="form-group">
                <label className="form-label">Dia do vencimento</label>
                <input type="number" className="form-input" min={1} max={31} value={billDueDay} onChange={e => setBillDueDay(e.target.value)} />
                <p className="form-hint">Dia do mes em que a conta vence (1-31).</p>
              </div>
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-input" value={billCategory} onChange={e => setBillCategory(e.target.value as ExpenseCategory)}>
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat} value={cat}>{EXPENSE_CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Recorrencia</label>
                <select className="form-input" value={billRecurrence} onChange={e => setBillRecurrence(e.target.value as 'monthly' | 'yearly')}>
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
            </div>
            <footer className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBillModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddBill} disabled={!billName.trim() || !billAmount.trim()}>Adicionar</button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL: NOVO/EDITAR GASTO */}
      {showExpenseModal && (
        <div className="modal-backdrop" onClick={() => { setShowExpenseModal(false); resetExpenseForm() }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h2>{editingExpenseId ? 'Editar Gasto' : 'Novo Gasto'}</h2>
              <button className="modal-close-btn" onClick={() => { setShowExpenseModal(false); resetExpenseForm() }}>&times;</button>
            </header>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Descricao</label>
                <input type="text" className="form-input" value={expenseDescription} onChange={e => setExpenseDescription(e.target.value)} placeholder="Ex: Supermercado, Uber, Cinema..." autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Valor (R$)</label>
                <input type="text" className="form-input" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="0,00" />
              </div>
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select className="form-input" value={expenseCategory} onChange={e => setExpenseCategory(e.target.value as ExpenseCategory)}>
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat} value={cat}>{EXPENSE_CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Data</label>
                <input type="date" className="form-input form-input-date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
              </div>
              {!editingExpenseId && (
                <div className="form-group">
                  <label className="form-label">Parcelas</label>
                  <input type="number" className="form-input" min={1} value={expenseInstallments} onChange={e => setExpenseInstallments(e.target.value)} />
                  <p className="form-hint">1 = a vista. Maior que 1 = parcelado.</p>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Observacao (opcional)</label>
                <input type="text" className="form-input" value={expenseNote} onChange={e => setExpenseNote(e.target.value)} placeholder="Nota adicional..." />
              </div>
            </div>
            <footer className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowExpenseModal(false); resetExpenseForm() }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddExpense} disabled={!expenseDescription.trim() || !expenseAmount.trim()}>
                {editingExpenseId ? 'Salvar' : 'Adicionar'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL: NOVO RECEBIMENTO */}
      {showIncomeModal && (
        <div className="modal-backdrop" onClick={() => { setShowIncomeModal(false); resetIncomeForm() }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Novo Recebimento</h2>
              <button className="modal-close-btn" onClick={() => { setShowIncomeModal(false); resetIncomeForm() }}>&times;</button>
            </header>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Fonte</label>
                <input
                  type="text"
                  className="form-input"
                  value={incomeSource}
                  onChange={e => setIncomeSource(e.target.value)}
                  placeholder="Ex: Salario CLT, Freelancer Cliente X"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Valor (R$)</label>
                <input
                  type="text"
                  className="form-input"
                  value={incomeAmount}
                  onChange={e => setIncomeAmount(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Data</label>
                <input
                  type="date"
                  className="form-input form-input-date"
                  value={incomeDate}
                  onChange={e => setIncomeDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select className="form-input" value={incomeKind} onChange={e => setIncomeKind(e.target.value as 'fixed' | 'extra')}>
                  <option value="fixed">Fixo (ex: salario)</option>
                  <option value="extra">Extra (ex: freelance)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Repetir por quantos meses</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  className="form-input"
                  value={incomeRepeatMonths}
                  onChange={e => setIncomeRepeatMonths(e.target.value)}
                />
                <p className="form-hint">Use 1 para entrada unica. Para valor fixo, informe X meses.</p>
              </div>
              <div className="form-group">
                <label className="form-label">Observacao (opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={incomeNote}
                  onChange={e => setIncomeNote(e.target.value)}
                  placeholder="Ex: contrato principal"
                />
              </div>
            </div>
            <footer className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowIncomeModal(false); resetIncomeForm() }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddIncome} disabled={!incomeSource.trim() || !incomeAmount.trim()}>
                Adicionar
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL: ORCAMENTO */}
      {showBudgetModal && (
        <div className="modal-backdrop" onClick={() => setShowBudgetModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Orcamento Mensal</h2>
              <button className="modal-close-btn" onClick={() => setShowBudgetModal(false)}>&times;</button>
            </header>
            <div className="modal-body">
              <p className="form-hint" style={{ marginBottom: 12 }}>
                Defina o limite mensal para cada categoria. Deixe em branco para nao limitar.
              </p>
              {CATEGORY_OPTIONS.map(cat => (
                <div className="form-group" key={cat}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: EXPENSE_CATEGORY_COLORS[cat], display: 'inline-block' }} />
                    {EXPENSE_CATEGORY_LABELS[cat]}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={budgetEdits[cat]}
                    onChange={e => setBudgetEdits(prev => ({ ...prev, [cat]: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>
              ))}
            </div>
            <footer className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBudgetModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveBudget}>Salvar</button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL: NOVA/EDITAR META */}
      {showGoalModal && (
        <div className="modal-backdrop" onClick={() => { setShowGoalModal(false); resetGoalForm() }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h2>{editingGoalId ? 'Editar Meta' : 'Nova Meta'}</h2>
              <button className="modal-close-btn" onClick={() => { setShowGoalModal(false); resetGoalForm() }}>&times;</button>
            </header>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Nome da meta</label>
                <input type="text" className="form-input" value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="Ex: Viagem, Reserva de emergencia..." autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Valor alvo (R$)</label>
                <input type="text" className="form-input" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} placeholder="0,00" />
              </div>
              <div className="form-group">
                <label className="form-label">Valor atual (R$)</label>
                <input type="text" className="form-input" value={goalCurrent} onChange={e => setGoalCurrent(e.target.value)} placeholder="0,00" />
                <p className="form-hint">Quanto ja foi acumulado ate agora.</p>
              </div>
              <div className="form-group">
                <label className="form-label">Prazo (opcional)</label>
                <input type="date" className="form-input form-input-date" value={goalDeadline} onChange={e => setGoalDeadline(e.target.value)} />
              </div>
            </div>
            <footer className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowGoalModal(false); resetGoalForm() }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveGoal} disabled={!goalName.trim() || !goalTarget.trim()}>
                {editingGoalId ? 'Salvar' : 'Adicionar'}
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* MODAL: DEPOSITAR NA META */}
      {showDepositModal && depositGoalId && (
        <div className="modal-backdrop" onClick={() => setShowDepositModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Depositar</h2>
              <button className="modal-close-btn" onClick={() => setShowDepositModal(false)}>&times;</button>
            </header>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Valor a depositar (R$)</label>
                <input type="text" className="form-input" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="0,00" autoFocus />
              </div>
            </div>
            <footer className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDepositModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleDeposit} disabled={!depositAmount.trim()}>Depositar</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
