
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert, PanResponder, Animated, Easing, useWindowDimensions } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { EmptyState } from '../components/shared/EmptyState'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { today, now, formatDate } from '../utils/date'
import { formatCurrency, uid } from '../utils/format'
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_COLORS,
  type ExpenseCategory,
  type Expense,
  type Bill,
  type IncomeEntry,
  type SavingsGoal,
} from '../types'

type Tab = 'overview' | 'expenses' | 'incomes' | 'bills' | 'goals' | 'config'
type EntrySheetType = 'expense' | 'bill' | 'income'
type MonthPickerTarget = 'expenses' | 'incomes'

const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]
const TAB_ORDER: Tab[] = ['overview', 'expenses', 'incomes', 'bills', 'goals', 'config']
const TAB_LABELS: Record<Tab, string> = {
  overview: 'Resumo',
  expenses: 'Despesas',
  incomes: 'Receitas',
  bills: 'Contas',
  goals: 'Metas',
  config: 'Configuracoes',
}
const MONTH_SHORT_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function parseMoney(value: string): number {
  return Number.parseFloat(value.replace(',', '.'))
}

function addMonthsToISO(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const base = new Date(y, (m || 1) - 1 + months, d || 1)
  const yyyy = base.getFullYear()
  const mm = String(base.getMonth() + 1).padStart(2, '0')
  const dd = String(base.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function getMonthView(baseISO: string, offset: number): { ym: string; label: string } {
  const [y, m] = baseISO.split('-').map(Number)
  const base = new Date(y, (m || 1) - 1 + offset, 1)
  const yyyy = base.getFullYear()
  const mm = String(base.getMonth() + 1).padStart(2, '0')
  const ym = `${yyyy}-${mm}`
  const label = base.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return { ym, label }
}

function getDaysUntilDue(todayISO: string, dueDay: number): number {
  const todayDate = new Date(todayISO + 'T00:00:00')
  const currentDay = todayDate.getDate()
  if (dueDay >= currentDay) return dueDay - currentDay
  const lastDay = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate()
  return (lastDay - currentDay) + dueDay
}

export function FinancialScreen() {
  const theme = useTheme()
  const { width: viewportWidth } = useWindowDimensions()
  const {
    store,
    addExpense,
    deleteExpense,
    addBill,
    updateBill,
    deleteBill,
    addIncome,
    deleteIncome,
    updateFinancialConfig,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    setBudgetCategories,
  } = useStore()

  const todayStr = today()
  const currentMonth = todayStr.slice(0, 7)

  const [tab, setTab] = useState<Tab>('overview')
  const [showEntrySheet, setShowEntrySheet] = useState(false)
  const [sheetType, setSheetType] = useState<EntrySheetType>('expense')
  const [showGoalSheet, setShowGoalSheet] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [expenseMonthOffset, setExpenseMonthOffset] = useState(0)
  const [incomeMonthOffset, setIncomeMonthOffset] = useState(0)
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [monthPickerTarget, setMonthPickerTarget] = useState<MonthPickerTarget>('expenses')
  const [monthPickerYear, setMonthPickerYear] = useState(new Date(todayStr + 'T00:00:00').getFullYear())
  const dragX = useRef(new Animated.Value(0)).current
  const isAnimatingRef = useRef(false)

  const [entryForm, setEntryForm] = useState({
    description: '', source: '', amount: '', category: 'outro' as ExpenseCategory,
    date: todayStr, dueDay: '1', recurrence: 'monthly' as 'monthly' | 'yearly',
    kind: 'fixed' as 'fixed' | 'extra', installments: '1', repeatMonths: '1', note: '',
  })

  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '', currentAmount: '', deadline: '' })
  const [configForm, setConfigForm] = useState({
    monthlyIncome: store.financialConfig.monthlyIncome > 0 ? String(store.financialConfig.monthlyIncome) : '',
    monthlySpendingLimit: store.financialConfig.monthlySpendingLimit > 0 ? String(store.financialConfig.monthlySpendingLimit) : '',
  })
  const [budgetForm, setBudgetForm] = useState<Record<ExpenseCategory, string>>({
    alimentacao: '', transporte: '', lazer: '', moradia: '', saude: '', educacao: '', outro: '',
  })

  useEffect(() => {
    setConfigForm({
      monthlyIncome: store.financialConfig.monthlyIncome > 0 ? String(store.financialConfig.monthlyIncome) : '',
      monthlySpendingLimit: store.financialConfig.monthlySpendingLimit > 0 ? String(store.financialConfig.monthlySpendingLimit) : '',
    })
  }, [store.financialConfig.monthlyIncome, store.financialConfig.monthlySpendingLimit])

  useEffect(() => {
    const next: Record<ExpenseCategory, string> = {
      alimentacao: '', transporte: '', lazer: '', moradia: '', saude: '', educacao: '', outro: '',
    }
    for (const budget of store.budgetCategories) next[budget.category] = String(budget.limit)
    setBudgetForm(next)
  }, [store.budgetCategories])

  const expenseMonthView = useMemo(() => getMonthView(todayStr, expenseMonthOffset), [todayStr, expenseMonthOffset])
  const incomeMonthView = useMemo(() => getMonthView(todayStr, incomeMonthOffset), [todayStr, incomeMonthOffset])
  const expenseMonthSelection = useMemo(() => {
    const [year, month] = expenseMonthView.ym.split('-').map(Number)
    return { year: year || monthPickerYear, monthIndex: Math.max(0, (month || 1) - 1) }
  }, [expenseMonthView.ym, monthPickerYear])
  const incomeMonthSelection = useMemo(() => {
    const [year, month] = incomeMonthView.ym.split('-').map(Number)
    return { year: year || monthPickerYear, monthIndex: Math.max(0, (month || 1) - 1) }
  }, [incomeMonthView.ym, monthPickerYear])

  const monthExpensesCurrent = useMemo(() => store.expenses.filter(e => e.date.startsWith(currentMonth)), [store.expenses, currentMonth])
  const monthIncomesCurrent = useMemo(() => store.incomes.filter(i => i.date.startsWith(currentMonth)), [store.incomes, currentMonth])
  const monthExpensesView = useMemo(() => store.expenses.filter(e => e.date.startsWith(expenseMonthView.ym)), [store.expenses, expenseMonthView.ym])
  const monthIncomesView = useMemo(() => store.incomes.filter(i => i.date.startsWith(incomeMonthView.ym)), [store.incomes, incomeMonthView.ym])

  const totalCurrentExpenses = useMemo(() => monthExpensesCurrent.reduce((sum, e) => sum + e.amount, 0), [monthExpensesCurrent])
  const totalCurrentIncomesExtra = useMemo(() => monthIncomesCurrent.reduce((sum, i) => sum + i.amount, 0), [monthIncomesCurrent])
  const configuredIncome = store.financialConfig.monthlyIncome
  const totalCurrentIncomes = configuredIncome + totalCurrentIncomesExtra
  const currentBalance = totalCurrentIncomes - totalCurrentExpenses

  const expensesByCategoryCurrent = useMemo(() => {
    const map: Record<ExpenseCategory, number> = { alimentacao: 0, transporte: 0, lazer: 0, moradia: 0, saude: 0, educacao: 0, outro: 0 }
    for (const expense of monthExpensesCurrent) map[expense.category] += expense.amount
    return map
  }, [monthExpensesCurrent])

  const budgetLimitByCategory = useMemo(() => {
    const map: Record<ExpenseCategory, number> = { alimentacao: 0, transporte: 0, lazer: 0, moradia: 0, saude: 0, educacao: 0, outro: 0 }
    for (const budget of store.budgetCategories) map[budget.category] = budget.limit
    return map
  }, [store.budgetCategories])

  const totalBudgetLimit = useMemo(() => store.budgetCategories.reduce((sum, b) => sum + b.limit, 0), [store.budgetCategories])
  const spendingLimit = store.financialConfig.monthlySpendingLimit
  const spendingLimitRemaining = spendingLimit > 0 ? spendingLimit - totalCurrentExpenses : null

  const billsSorted = useMemo(() => [...store.bills].sort((a, b) => a.dueDay - b.dueDay), [store.bills])
  const unpaidBills = useMemo(() => billsSorted.filter(b => !b.isPaid), [billsSorted])
  const unpaidBillsAmount = useMemo(() => unpaidBills.reduce((sum, b) => sum + b.amount, 0), [unpaidBills])

  const goalsSorted = useMemo(() => [...store.savingsGoals].sort((a, b) => a.name.localeCompare(b.name)), [store.savingsGoals])
  const totalGoalsSaved = useMemo(() => goalsSorted.reduce((sum, g) => sum + g.currentAmount, 0), [goalsSorted])
  const totalGoalsTarget = useMemo(() => goalsSorted.reduce((sum, g) => sum + g.targetAmount, 0), [goalsSorted])
  function openEntry(type: EntrySheetType) {
    setSheetType(type)
    setEntryForm({
      description: '', source: '', amount: '', category: 'outro', date: todayStr, dueDay: '1',
      recurrence: 'monthly', kind: 'fixed', installments: '1', repeatMonths: '1', note: '',
    })
    setShowEntrySheet(true)
  }

  function handleSaveEntry() {
    const amount = parseMoney(entryForm.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Valor invalido', 'Informe um valor maior que zero.')
      return
    }

    if (sheetType === 'expense') {
      if (!entryForm.description.trim()) return
      const installments = Math.max(1, Math.min(60, Number.parseInt(entryForm.installments, 10) || 1))
      const parentId = installments > 1 ? uid() : null
      for (let i = 0; i < installments; i += 1) {
        addExpense({
          description: entryForm.description.trim(), amount, category: entryForm.category,
          date: addMonthsToISO(entryForm.date, i), installments, currentInstallment: i + 1,
          parentId, note: entryForm.note.trim(), createdAt: now(),
        })
      }
    } else if (sheetType === 'bill') {
      if (!entryForm.description.trim()) return
      const dueDay = Math.max(1, Math.min(31, Number.parseInt(entryForm.dueDay, 10) || 1))
      addBill({
        name: entryForm.description.trim(), amount, dueDay, category: entryForm.category,
        recurrence: entryForm.recurrence, isPaid: false, paidDate: null, createdAt: now(),
      })
    } else {
      if (!entryForm.source.trim()) return
      const repeatMonths = Math.max(1, Math.min(60, Number.parseInt(entryForm.repeatMonths, 10) || 1))
      const recurrenceGroupId = repeatMonths > 1 ? uid() : null
      for (let i = 0; i < repeatMonths; i += 1) {
        addIncome({
          source: entryForm.source.trim(), amount, date: addMonthsToISO(entryForm.date, i),
          kind: entryForm.kind, recurrenceMonths: repeatMonths, recurrenceIndex: i + 1,
          recurrenceGroupId, note: entryForm.note.trim(), createdAt: now(),
        })
      }
    }

    setShowEntrySheet(false)
  }

  function toggleBillPaid(bill: Bill) {
    updateBill(bill.id, { isPaid: !bill.isPaid, paidDate: !bill.isPaid ? todayStr : null })
  }

  function openGoal(goal?: SavingsGoal) {
    if (goal) {
      setEditingGoal(goal)
      setGoalForm({
        name: goal.name,
        targetAmount: String(goal.targetAmount),
        currentAmount: String(goal.currentAmount),
        deadline: goal.deadline ?? '',
      })
    } else {
      setEditingGoal(null)
      setGoalForm({ name: '', targetAmount: '', currentAmount: '', deadline: '' })
    }
    setShowGoalSheet(true)
  }

  function saveGoal() {
    const targetAmount = parseMoney(goalForm.targetAmount)
    const currentAmount = parseMoney(goalForm.currentAmount || '0')
    if (!goalForm.name.trim() || !Number.isFinite(targetAmount) || targetAmount <= 0 || !Number.isFinite(currentAmount) || currentAmount < 0) {
      Alert.alert('Dados invalidos', 'Confira nome e valores da meta.')
      return
    }

    const data = { name: goalForm.name.trim(), targetAmount, currentAmount, deadline: goalForm.deadline.trim() || null }
    if (editingGoal) updateSavingsGoal(editingGoal.id, data)
    else addSavingsGoal({ ...data, createdAt: now() })
    setShowGoalSheet(false)
  }

  function saveFinancialConfig() {
    const monthlyIncome = Math.max(0, parseMoney(configForm.monthlyIncome || '0') || 0)
    const monthlySpendingLimit = Math.max(0, parseMoney(configForm.monthlySpendingLimit || '0') || 0)
    updateFinancialConfig({ monthlyIncome, monthlySpendingLimit })
    const categories = CATEGORIES.map(category => ({ category, limit: Math.max(0, parseMoney(budgetForm[category] || '0') || 0) })).filter(entry => entry.limit > 0)
    setBudgetCategories(categories)
    Alert.alert('Configuracoes salvas', 'Dados financeiros atualizados.')
  }

  const travelDistance = Math.max(240, viewportWidth * 0.92)
  const swipeThreshold = Math.max(58, viewportWidth * 0.17)

  const snapBack = useCallback(() => {
    Animated.spring(dragX, {
      toValue: 0,
      damping: 18,
      stiffness: 240,
      mass: 0.8,
      useNativeDriver: true,
    }).start()
  }, [dragX])

  const runTabTransition = useCallback((nextTab: Tab, direction: 'next' | 'prev', fromDrag = false) => {
    if (nextTab === tab || isAnimatingRef.current) {
      if (fromDrag) snapBack()
      return
    }

    isAnimatingRef.current = true
    const exitX = direction === 'next' ? -travelDistance : travelDistance
    const enterX = -exitX

    Animated.timing(dragX, {
      toValue: exitX,
      duration: fromDrag ? 120 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setTab(nextTab)
      dragX.setValue(enterX)

      Animated.spring(dragX, {
        toValue: 0,
        damping: 18,
        stiffness: 240,
        mass: 0.8,
        useNativeDriver: true,
      }).start(() => {
        isAnimatingRef.current = false
      })
    })
  }, [dragX, snapBack, tab, travelDistance])

  const shiftTab = useCallback((direction: 'next' | 'prev', fromDrag = false) => {
    const currentIndex = TAB_ORDER.indexOf(tab)
    if (currentIndex < 0) {
      if (fromDrag) snapBack()
      return
    }

    if (direction === 'next') {
      if (currentIndex >= TAB_ORDER.length - 1) {
        if (fromDrag) snapBack()
        return
      }
      runTabTransition(TAB_ORDER[currentIndex + 1], 'next', fromDrag)
      return
    }

    if (currentIndex <= 0) {
      if (fromDrag) snapBack()
      return
    }
    runTabTransition(TAB_ORDER[currentIndex - 1], 'prev', fromDrag)
  }, [runTabTransition, snapBack, tab])

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2,
        onPanResponderGrant: () => {
          dragX.stopAnimation()
        },
        onPanResponderMove: (_, gesture) => {
          if (isAnimatingRef.current) return
          const clampedX = Math.max(-travelDistance, Math.min(travelDistance, gesture.dx))
          dragX.setValue(clampedX)
        },
        onPanResponderRelease: (_, gesture) => {
          if (Math.abs(gesture.dx) < swipeThreshold || Math.abs(gesture.dx) < Math.abs(gesture.dy)) {
            snapBack()
            return
          }
          if (gesture.dx < 0) shiftTab('next', true)
          else shiftTab('prev', true)
        },
        onPanResponderTerminate: () => {
          snapBack()
        },
      }),
    [dragX, shiftTab, snapBack, swipeThreshold, travelDistance],
  )

  const contentOpacity = dragX.interpolate({
    inputRange: [-travelDistance, 0, travelDistance],
    outputRange: [0.82, 1, 0.82],
    extrapolate: 'clamp',
  })

  const contentScale = dragX.interpolate({
    inputRange: [-travelDistance, 0, travelDistance],
    outputRange: [0.985, 1, 0.985],
    extrapolate: 'clamp',
  })

  function handleFooterAdd() {
    if (tab === 'incomes') return openEntry('income')
    if (tab === 'bills') return openEntry('bill')
    if (tab === 'goals') return openGoal()
    return openEntry('expense')
  }

  function openMonthPicker(target: MonthPickerTarget) {
    setMonthPickerTarget(target)
    const selected = target === 'expenses' ? expenseMonthSelection : incomeMonthSelection
    setMonthPickerYear(selected.year)
    setMonthPickerOpen(true)
  }

  function selectMonth(monthIndex: number) {
    const todayDate = new Date(todayStr + 'T00:00:00')
    const todayIndex = (todayDate.getFullYear() * 12) + todayDate.getMonth()
    const targetIndex = (monthPickerYear * 12) + monthIndex
    const nextOffset = targetIndex - todayIndex

    if (monthPickerTarget === 'expenses') setExpenseMonthOffset(nextOffset)
    else setIncomeMonthOffset(nextOffset)

    setMonthPickerOpen(false)
  }

  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    sectionBar: {
      height: 44,
      borderBottomWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface,
      paddingHorizontal: 10,
    },
    sectionNavBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionBarTitle: { fontSize: 14, fontWeight: '700' },
    swipeArea: { flex: 1 },
    list: { flex: 1, padding: 12 },
    panel: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
    panelTitle: { fontSize: 13.5, fontWeight: '700', marginBottom: 10 },
    statsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statCard: { flexBasis: '48%', flexGrow: 1, borderRadius: 11, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
    statValue: { fontSize: 15.5, fontWeight: '800' },
    statLabel: { fontSize: 10.5, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
    row: { flexDirection: 'row', alignItems: 'center' },
    catDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    catLabel: { flex: 1, fontSize: 12.5, fontWeight: '600' },
    catMoney: { fontSize: 12, fontWeight: '700' },
    catMeta: { fontSize: 11, marginTop: 2 },
    barWrap: { width: '100%', height: 6, borderRadius: 4, overflow: 'hidden', marginTop: 5 },
    barFill: { height: 6, borderRadius: 4 },
    monthBar: {
      borderRadius: 11,
      borderWidth: 1,
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
      gap: 8,
      paddingHorizontal: 12,
    },
    monthLabel: { fontSize: 13.5, fontWeight: '700', textTransform: 'capitalize' },
    monthPickerYearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    monthPickerYearBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthPickerYearTxt: { fontSize: 16, fontWeight: '700' },
    monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 12 },
    monthCard: {
      width: '31%',
      minHeight: 44,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthCardTxt: { fontSize: 13, fontWeight: '600' },
    itemCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
    itemTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    itemTitle: { flex: 1, fontSize: 14, fontWeight: '600' },
    amountExpense: { color: '#ef4444', fontWeight: '700', fontSize: 13 },
    amountIncome: { color: '#22c55e', fontWeight: '700', fontSize: 13 },
    itemMeta: { fontSize: 11.5, marginTop: 4 },
    iconBtn: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    billBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
    billBadgeTxt: { fontSize: 10.5, fontWeight: '700' },
    goalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
    goalName: { flex: 1, fontSize: 14, fontWeight: '700' },
    goalPct: { fontSize: 12, fontWeight: '700' },
    goalBarWrap: { width: '100%', height: 7, borderRadius: 4, overflow: 'hidden' },
    goalBarFill: { height: 7, borderRadius: 4 },
    goalMeta: { fontSize: 11.5, marginTop: 4 },
    goalActions: { flexDirection: 'row', gap: 8, marginTop: 9 },
    goalActionBtn: { borderRadius: 9, borderWidth: 1, minHeight: 34, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
    chip: { borderRadius: 16, borderWidth: 1, minHeight: 32, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
    chipTxt: { fontSize: 12, fontWeight: '600' },
    configRow: { marginBottom: 9 },
    saveBtn: { borderRadius: 12, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
    saveBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
    footer: {
      height: 66,
      borderTopWidth: 1,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    footerSide: { width: 112, alignItems: 'flex-start' },
    footerBtn: {
      height: 42,
      paddingHorizontal: 14,
      borderRadius: 13,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    footerBtnTxt: { fontSize: 13, fontWeight: '600' },
    footerAddBtn: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 6,
    },
  })

  const renderMonthSelector = (label: string, onPress: () => void) => (
    <TouchableOpacity
      style={[s.monthBar, { borderColor: theme.text + '14', backgroundColor: theme.surface }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[s.monthLabel, { color: theme.text }]}>{label}</Text>
      <Feather name="chevron-down" size={16} color={theme.text + 'a0'} />
    </TouchableOpacity>
  )
  const renderOverview = () => (
    <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
      <View style={[s.panel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
        <Text style={[s.panelTitle, { color: theme.text }]}>Resumo do mes atual</Text>
        <View style={s.statsWrap}>
          <View style={[s.statCard, { borderColor: theme.text + '14', backgroundColor: theme.background }]}>
            <Text style={[s.statValue, { color: currentBalance >= 0 ? '#22c55e' : '#ef4444' }]}>{formatCurrency(currentBalance)}</Text>
            <Text style={[s.statLabel, { color: theme.text + '65' }]}>Saldo</Text>
          </View>
          <View style={[s.statCard, { borderColor: theme.text + '14', backgroundColor: theme.background }]}>
            <Text style={[s.statValue, { color: '#22c55e' }]}>{formatCurrency(totalCurrentIncomes)}</Text>
            <Text style={[s.statLabel, { color: theme.text + '65' }]}>Receitas</Text>
          </View>
          <View style={[s.statCard, { borderColor: theme.text + '14', backgroundColor: theme.background }]}>
            <Text style={[s.statValue, { color: '#ef4444' }]}>{formatCurrency(totalCurrentExpenses)}</Text>
            <Text style={[s.statLabel, { color: theme.text + '65' }]}>Despesas</Text>
          </View>
          <View style={[s.statCard, { borderColor: theme.text + '14', backgroundColor: theme.background }]}>
            <Text style={[s.statValue, { color: unpaidBills.length > 0 ? '#f59e0b' : theme.text }]}>{unpaidBills.length}</Text>
            <Text style={[s.statLabel, { color: theme.text + '65' }]}>Contas pendentes</Text>
          </View>
        </View>
        <Text style={[s.itemMeta, { color: theme.text + '6e', marginTop: 10 }]}>Pendencias em valor: {formatCurrency(unpaidBillsAmount)}</Text>
      </View>

      <View style={[s.panel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
        <Text style={[s.panelTitle, { color: theme.text }]}>Limites e orcamento</Text>
        <Text style={[s.itemMeta, { color: theme.text + '72' }]}>Renda fixa configurada: {formatCurrency(configuredIncome)}</Text>
        <Text style={[s.itemMeta, { color: theme.text + '72' }]}>Limite mensal de gastos: {spendingLimit > 0 ? formatCurrency(spendingLimit) : 'Nao definido'}</Text>
        {spendingLimitRemaining !== null && <Text style={[s.itemMeta, { color: spendingLimitRemaining >= 0 ? '#22c55e' : '#ef4444' }]}>Saldo do limite: {formatCurrency(spendingLimitRemaining)}</Text>}
        <Text style={[s.itemMeta, { color: theme.text + '72' }]}>Soma de limites por categoria: {formatCurrency(totalBudgetLimit)}</Text>
      </View>

      <View style={[s.panel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
        <Text style={[s.panelTitle, { color: theme.text }]}>Categorias (gasto x limite)</Text>
        {CATEGORIES.map(category => {
          const spent = expensesByCategoryCurrent[category]
          const limit = budgetLimitByCategory[category]
          if (spent <= 0 && limit <= 0) return null
          const pct = limit > 0 ? Math.min(1, spent / limit) : 0
          return (
            <View key={category} style={{ marginBottom: 10 }}>
              <View style={s.row}>
                <View style={[s.catDot, { backgroundColor: EXPENSE_CATEGORY_COLORS[category] }]} />
                <Text style={[s.catLabel, { color: theme.text }]}>{EXPENSE_CATEGORY_LABELS[category]}</Text>
                <Text style={[s.catMoney, { color: theme.text + '88' }]}>{formatCurrency(spent)}</Text>
              </View>
              <Text style={[s.catMeta, { color: theme.text + '66' }]}>{limit > 0 ? `Limite ${formatCurrency(limit)}` : 'Sem limite definido'}</Text>
              <View style={[s.barWrap, { backgroundColor: theme.text + '16' }]}>
                <View style={[s.barFill, { width: `${limit > 0 ? pct * 100 : 0}%`, backgroundColor: EXPENSE_CATEGORY_COLORS[category] }]} />
              </View>
            </View>
          )
        })}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  )

  const renderExpenses = () => (
    <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
      {renderMonthSelector(expenseMonthView.label, () => openMonthPicker('expenses'))}
      {monthExpensesView.length === 0 && <EmptyState icon="dollar-sign" title="Sem despesas nesse mes" subtitle="Toque no + para registrar" />}
      {[...monthExpensesView].sort((a, b) => b.date.localeCompare(a.date)).map((expense: Expense) => (
        <View key={expense.id} style={[s.itemCard, { borderColor: theme.text + '12', backgroundColor: theme.surface }]}>
          <View style={s.itemTop}>
            <View style={[s.catDot, { backgroundColor: EXPENSE_CATEGORY_COLORS[expense.category] }]} />
            <Text style={[s.itemTitle, { color: theme.text }]} numberOfLines={1}>{expense.description}</Text>
            <Text style={s.amountExpense}>{formatCurrency(expense.amount)}</Text>
            <TouchableOpacity
              style={[s.iconBtn, { backgroundColor: theme.text + '08' }]}
              onPress={() => Alert.alert('Excluir', 'Excluir esta despesa?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Excluir', style: 'destructive', onPress: () => deleteExpense(expense.id) },
              ])}
            >
              <Feather name="trash-2" size={14} color={theme.text + '55'} />
            </TouchableOpacity>
          </View>
          <Text style={[s.itemMeta, { color: theme.text + '70' }]}>{EXPENSE_CATEGORY_LABELS[expense.category]} - {formatDate(expense.date)}</Text>
        </View>
      ))}
      <View style={{ height: 24 }} />
    </ScrollView>
  )

  const renderIncomes = () => (
    <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
      {renderMonthSelector(incomeMonthView.label, () => openMonthPicker('incomes'))}
      {monthIncomesView.length === 0 && <EmptyState icon="trending-up" title="Sem receitas nesse mes" subtitle="Toque no + para registrar" />}
      {[...monthIncomesView].sort((a, b) => b.date.localeCompare(a.date)).map((income: IncomeEntry) => (
        <View key={income.id} style={[s.itemCard, { borderColor: theme.text + '12', backgroundColor: theme.surface }]}>
          <View style={s.itemTop}>
            <Feather name="arrow-down-circle" size={16} color="#22c55e" />
            <Text style={[s.itemTitle, { color: theme.text }]} numberOfLines={1}>{income.source}</Text>
            <Text style={s.amountIncome}>{formatCurrency(income.amount)}</Text>
            <TouchableOpacity
              style={[s.iconBtn, { backgroundColor: theme.text + '08' }]}
              onPress={() => Alert.alert('Excluir', 'Excluir esta receita?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Excluir', style: 'destructive', onPress: () => deleteIncome(income.id) },
              ])}
            >
              <Feather name="trash-2" size={14} color={theme.text + '55'} />
            </TouchableOpacity>
          </View>
          <Text style={[s.itemMeta, { color: theme.text + '70' }]}>{income.kind === 'fixed' ? 'Fixa' : 'Extra'} - {formatDate(income.date)}</Text>
        </View>
      ))}
      <View style={{ height: 24 }} />
    </ScrollView>
  )
  const renderBills = () => (
    <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
      {billsSorted.length === 0 && <EmptyState icon="credit-card" title="Sem contas cadastradas" subtitle="Toque no + para criar" />}
      {billsSorted.map((bill: Bill) => {
        const days = getDaysUntilDue(todayStr, bill.dueDay)
        const badgeColor = bill.isPaid ? '#22c55e' : days === 0 ? '#ef4444' : days <= 3 ? '#f97316' : days <= 7 ? '#eab308' : theme.text + '66'
        const badgeLabel = bill.isPaid ? 'Pago' : days === 0 ? 'Hoje' : `${days}d`
        return (
          <View key={bill.id} style={[s.itemCard, { borderColor: theme.text + '12', backgroundColor: theme.surface, opacity: bill.isPaid ? 0.64 : 1 }]}>
            <View style={s.itemTop}>
              <View style={[s.catDot, { backgroundColor: EXPENSE_CATEGORY_COLORS[bill.category] }]} />
              <Text style={[s.itemTitle, { color: theme.text }]} numberOfLines={1}>{bill.name}</Text>
              <Text style={s.amountExpense}>{formatCurrency(bill.amount)}</Text>
              <View style={[s.billBadge, { borderColor: badgeColor + '55', backgroundColor: badgeColor + '14' }]}><Text style={[s.billBadgeTxt, { color: badgeColor }]}>{badgeLabel}</Text></View>
            </View>
            <Text style={[s.itemMeta, { color: theme.text + '70' }]}>Vence dia {bill.dueDay} - {bill.recurrence === 'monthly' ? 'Mensal' : 'Anual'}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TouchableOpacity style={[s.goalActionBtn, { borderColor: theme.text + '20', backgroundColor: theme.background }]} onPress={() => toggleBillPaid(bill)}>
                <Text style={[s.chipTxt, { color: theme.text + 'd0' }]}>{bill.isPaid ? 'Marcar pendente' : 'Marcar paga'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.goalActionBtn, { borderColor: '#ef444480', backgroundColor: '#ef444412' }]}
                onPress={() => Alert.alert('Excluir', 'Excluir esta conta?', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Excluir', style: 'destructive', onPress: () => deleteBill(bill.id) },
                ])}
              >
                <Text style={[s.chipTxt, { color: '#ef4444' }]}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      })}
      <View style={{ height: 24 }} />
    </ScrollView>
  )

  const renderGoals = () => (
    <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
      {goalsSorted.length === 0 && <EmptyState icon="target" title="Sem metas" subtitle="Toque no + para criar" />}
      {goalsSorted.map(goal => {
        const pct = goal.targetAmount > 0 ? Math.min(1, goal.currentAmount / goal.targetAmount) : 0
        return (
          <View key={goal.id} style={[s.itemCard, { borderColor: theme.text + '12', backgroundColor: theme.surface }]}>
            <View style={s.goalHeader}>
              <Text style={[s.goalName, { color: theme.text }]} numberOfLines={1}>{goal.name}</Text>
              <Text style={[s.goalPct, { color: theme.primary }]}>{Math.round(pct * 100)}%</Text>
            </View>
            <View style={[s.goalBarWrap, { backgroundColor: theme.text + '16' }]}><View style={[s.goalBarFill, { width: `${pct * 100}%`, backgroundColor: theme.primary }]} /></View>
            <Text style={[s.goalMeta, { color: theme.text + '70' }]}>{formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}</Text>
            {goal.deadline ? <Text style={[s.goalMeta, { color: theme.text + '70' }]}>Prazo: {formatDate(goal.deadline)}</Text> : null}
            <View style={s.goalActions}>
              <TouchableOpacity style={[s.goalActionBtn, { borderColor: theme.primary + '70', backgroundColor: theme.primary + '12' }]} onPress={() => updateSavingsGoal(goal.id, { currentAmount: goal.currentAmount + 100 })}><Text style={[s.chipTxt, { color: theme.primary }]}>+100</Text></TouchableOpacity>
              <TouchableOpacity style={[s.goalActionBtn, { borderColor: theme.text + '20', backgroundColor: theme.background }]} onPress={() => openGoal(goal)}><Text style={[s.chipTxt, { color: theme.text + 'd0' }]}>Editar</Text></TouchableOpacity>
              <TouchableOpacity
                style={[s.goalActionBtn, { borderColor: '#ef444480', backgroundColor: '#ef444412' }]}
                onPress={() => Alert.alert('Excluir meta', `Excluir "${goal.name}"?`, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Excluir', style: 'destructive', onPress: () => deleteSavingsGoal(goal.id) },
                ])}
              >
                <Text style={[s.chipTxt, { color: '#ef4444' }]}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      })}
      <View style={{ height: 24 }} />
    </ScrollView>
  )

  const renderConfig = () => (
    <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
      <View style={[s.panel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
        <Text style={[s.panelTitle, { color: theme.text }]}>Configuracao mensal</Text>
        <FormInput label="Renda mensal fixa (R$)" value={configForm.monthlyIncome} onChangeText={value => setConfigForm(prev => ({ ...prev, monthlyIncome: value }))} placeholder="0,00" keyboardType="decimal-pad" />
        <FormInput label="Limite mensal de gastos (R$)" value={configForm.monthlySpendingLimit} onChangeText={value => setConfigForm(prev => ({ ...prev, monthlySpendingLimit: value }))} placeholder="0,00" keyboardType="decimal-pad" />
      </View>
      <View style={[s.panel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
        <Text style={[s.panelTitle, { color: theme.text }]}>Limite por categoria</Text>
        {CATEGORIES.map(category => (
          <View key={category} style={s.configRow}>
            <FormInput label={EXPENSE_CATEGORY_LABELS[category]} value={budgetForm[category]} onChangeText={value => setBudgetForm(prev => ({ ...prev, [category]: value }))} placeholder="0,00" keyboardType="decimal-pad" />
          </View>
        ))}
      </View>
      <TouchableOpacity style={[s.saveBtn, { backgroundColor: theme.primary }]} onPress={saveFinancialConfig}><Text style={s.saveBtnTxt}>Salvar configuracoes</Text></TouchableOpacity>
      <View style={{ height: 24 }} />
    </ScrollView>
  )

  const monthPickerSelected = monthPickerTarget === 'expenses' ? expenseMonthSelection : incomeMonthSelection
  const monthPickerTitle = monthPickerTarget === 'expenses' ? 'Mes de despesas' : 'Mes de receitas'

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Financeiro" />
      <View style={[s.sectionBar, { borderBottomColor: theme.text + '10' }]}>
        <TouchableOpacity
          style={[s.sectionNavBtn, { borderColor: theme.text + '1f', backgroundColor: theme.text + '08' }]}
          onPress={() => shiftTab('prev')}
        >
          <Feather name="chevron-left" size={16} color={theme.text + '86'} />
        </TouchableOpacity>
        <Text style={[s.sectionBarTitle, { color: theme.text }]}>{TAB_LABELS[tab]}</Text>
        <TouchableOpacity
          style={[s.sectionNavBtn, { borderColor: theme.text + '1f', backgroundColor: theme.text + '08' }]}
          onPress={() => shiftTab('next')}
        >
          <Feather name="chevron-right" size={16} color={theme.text + '86'} />
        </TouchableOpacity>
      </View>
      <Animated.View
        style={[
          s.swipeArea,
          { opacity: contentOpacity, transform: [{ translateX: dragX }, { scale: contentScale }] },
        ]}
        {...panResponder.panHandlers}
      >
        {tab === 'overview' && renderOverview()}
        {tab === 'expenses' && renderExpenses()}
        {tab === 'incomes' && renderIncomes()}
        {tab === 'bills' && renderBills()}
        {tab === 'goals' && renderGoals()}
        {tab === 'config' && renderConfig()}
      </Animated.View>

      <View style={[s.footer, { backgroundColor: theme.surface, borderTopColor: theme.text + '12' }]}>
        <View style={s.footerSide}>
          <TouchableOpacity
            style={[s.footerBtn, { backgroundColor: tab === 'overview' ? theme.primary + '18' : theme.text + '0a', borderColor: tab === 'overview' ? theme.primary + '42' : theme.text + '12' }]}
            onPress={() => setTab('overview')}
          >
            <Feather name="bar-chart-2" size={15} color={tab === 'overview' ? theme.primary : theme.text + '85'} />
            <Text style={[s.footerBtnTxt, { color: tab === 'overview' ? theme.primary : theme.text + '85' }]}>Resumo</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[s.footerAddBtn, { backgroundColor: theme.primary }]}
          onPress={handleFooterAdd}
          activeOpacity={0.9}
        >
          <Feather name="plus" size={21} color="#fff" />
        </TouchableOpacity>

        <View style={[s.footerSide, { alignItems: 'flex-end' }]}>
          <TouchableOpacity
            style={[s.footerBtn, { backgroundColor: tab === 'config' ? theme.primary + '18' : theme.text + '0a', borderColor: tab === 'config' ? theme.primary + '42' : theme.text + '12' }]}
            onPress={() => setTab('config')}
          >
            <Feather name="settings" size={15} color={tab === 'config' ? theme.primary : theme.text + '85'} />
            <Text style={[s.footerBtnTxt, { color: tab === 'config' ? theme.primary : theme.text + '85' }]}>Config</Text>
          </TouchableOpacity>
        </View>
      </View>

      <BottomSheet
        visible={monthPickerOpen}
        onClose={() => setMonthPickerOpen(false)}
        title={monthPickerTitle}
        maxHeight="62%"
      >
        <View style={s.monthPickerYearRow}>
          <TouchableOpacity
            style={[s.monthPickerYearBtn, { borderColor: theme.text + '20', backgroundColor: theme.text + '08' }]}
            onPress={() => setMonthPickerYear(prev => prev - 1)}
          >
            <Feather name="chevron-left" size={16} color={theme.text + '80'} />
          </TouchableOpacity>
          <Text style={[s.monthPickerYearTxt, { color: theme.text }]}>{monthPickerYear}</Text>
          <TouchableOpacity
            style={[s.monthPickerYearBtn, { borderColor: theme.text + '20', backgroundColor: theme.text + '08' }]}
            onPress={() => setMonthPickerYear(prev => prev + 1)}
          >
            <Feather name="chevron-right" size={16} color={theme.text + '80'} />
          </TouchableOpacity>
        </View>

        <View style={s.monthGrid}>
          {MONTH_SHORT_LABELS.map((label, idx) => {
            const active = monthPickerYear === monthPickerSelected.year && idx === monthPickerSelected.monthIndex
            return (
              <TouchableOpacity
                key={label}
                style={[
                  s.monthCard,
                  active
                    ? { borderColor: theme.primary, backgroundColor: theme.primary + '18' }
                    : { borderColor: theme.text + '20', backgroundColor: theme.text + '08' },
                ]}
                onPress={() => selectMonth(idx)}
              >
                <Text style={[s.monthCardTxt, { color: active ? theme.primary : theme.text + '90' }]}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </BottomSheet>

      <BottomSheet visible={showEntrySheet} onClose={() => setShowEntrySheet(false)} title={{ expense: 'Nova despesa', bill: 'Nova conta', income: 'Nova receita' }[sheetType]} onSave={handleSaveEntry}>
        {sheetType === 'income'
          ? <FormInput label="Fonte" value={entryForm.source} onChangeText={value => setEntryForm(prev => ({ ...prev, source: value }))} placeholder="Ex: Salario" autoFocus />
          : <FormInput label={sheetType === 'bill' ? 'Nome da conta' : 'Descricao'} value={entryForm.description} onChangeText={value => setEntryForm(prev => ({ ...prev, description: value }))} placeholder={sheetType === 'bill' ? 'Ex: Internet' : 'Ex: Supermercado'} autoFocus />}
        <FormInput label="Valor (R$)" value={entryForm.amount} onChangeText={value => setEntryForm(prev => ({ ...prev, amount: value }))} placeholder="0,00" keyboardType="decimal-pad" />
        {sheetType !== 'income' && (
          <>
            <Text style={[s.sectionLabel, { color: theme.text + '72' }]}>Categoria</Text>
            <View style={s.chips}>
              {CATEGORIES.map(category => {
                const active = entryForm.category === category
                return (
                  <TouchableOpacity
                    key={category}
                    style={[
                      s.chip,
                      active
                        ? { borderColor: EXPENSE_CATEGORY_COLORS[category], backgroundColor: EXPENSE_CATEGORY_COLORS[category] + '22' }
                        : { borderColor: theme.text + '22', backgroundColor: theme.text + '08' },
                    ]}
                    onPress={() => setEntryForm(prev => ({ ...prev, category }))}
                  >
                    <Text style={[s.chipTxt, { color: active ? EXPENSE_CATEGORY_COLORS[category] : theme.text + '85' }]}>{EXPENSE_CATEGORY_LABELS[category]}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )}

        {sheetType === 'income' ? (
          <>
            <FormInput
              label="Data (YYYY-MM-DD)"
              value={entryForm.date}
              onChangeText={value => setEntryForm(prev => ({ ...prev, date: value }))}
              placeholder={todayStr}
              keyboardType="numbers-and-punctuation"
            />
            <Text style={[s.sectionLabel, { color: theme.text + '72' }]}>Tipo de receita</Text>
            <View style={s.chips}>
              {(['fixed', 'extra'] as const).map(kind => {
                const active = entryForm.kind === kind
                return (
                  <TouchableOpacity
                    key={kind}
                    style={[
                      s.chip,
                      active
                        ? { borderColor: theme.primary, backgroundColor: theme.primary + '22' }
                        : { borderColor: theme.text + '22', backgroundColor: theme.text + '08' },
                    ]}
                    onPress={() => setEntryForm(prev => ({ ...prev, kind }))}
                  >
                    <Text style={[s.chipTxt, { color: active ? theme.primary : theme.text + '85' }]}>{kind === 'fixed' ? 'Fixa' : 'Extra'}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <FormInput
              label="Repetir por meses"
              value={entryForm.repeatMonths}
              onChangeText={value => setEntryForm(prev => ({ ...prev, repeatMonths: value }))}
              placeholder="1"
              keyboardType="number-pad"
            />
          </>
        ) : sheetType === 'bill' ? (
          <>
            <FormInput
              label="Dia do vencimento"
              value={entryForm.dueDay}
              onChangeText={value => setEntryForm(prev => ({ ...prev, dueDay: value }))}
              placeholder="1-31"
              keyboardType="number-pad"
            />
            <Text style={[s.sectionLabel, { color: theme.text + '72' }]}>Recorrencia</Text>
            <View style={s.chips}>
              {(['monthly', 'yearly'] as const).map(recurrence => {
                const active = entryForm.recurrence === recurrence
                return (
                  <TouchableOpacity
                    key={recurrence}
                    style={[
                      s.chip,
                      active
                        ? { borderColor: theme.primary, backgroundColor: theme.primary + '22' }
                        : { borderColor: theme.text + '22', backgroundColor: theme.text + '08' },
                    ]}
                    onPress={() => setEntryForm(prev => ({ ...prev, recurrence }))}
                  >
                    <Text style={[s.chipTxt, { color: active ? theme.primary : theme.text + '85' }]}>{recurrence === 'monthly' ? 'Mensal' : 'Anual'}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        ) : (
          <>
            <FormInput
              label="Data (YYYY-MM-DD)"
              value={entryForm.date}
              onChangeText={value => setEntryForm(prev => ({ ...prev, date: value }))}
              placeholder={todayStr}
              keyboardType="numbers-and-punctuation"
            />
            <FormInput
              label="Parcelas"
              value={entryForm.installments}
              onChangeText={value => setEntryForm(prev => ({ ...prev, installments: value }))}
              placeholder="1"
              keyboardType="number-pad"
            />
          </>
        )}
        {sheetType !== 'bill' && (
          <FormInput
            label="Nota"
            value={entryForm.note}
            onChangeText={value => setEntryForm(prev => ({ ...prev, note: value }))}
            placeholder="Opcional"
            multiline
            numberOfLines={3}
          />
        )}
      </BottomSheet>

      <BottomSheet visible={showGoalSheet} onClose={() => setShowGoalSheet(false)} title={editingGoal ? 'Editar meta' : 'Nova meta'} onSave={saveGoal}>
        <FormInput label="Nome" value={goalForm.name} onChangeText={value => setGoalForm(prev => ({ ...prev, name: value }))} placeholder="Ex: Reserva" autoFocus />
        <FormInput label="Valor alvo (R$)" value={goalForm.targetAmount} onChangeText={value => setGoalForm(prev => ({ ...prev, targetAmount: value }))} placeholder="0,00" keyboardType="decimal-pad" />
        <FormInput label="Valor atual (R$)" value={goalForm.currentAmount} onChangeText={value => setGoalForm(prev => ({ ...prev, currentAmount: value }))} placeholder="0,00" keyboardType="decimal-pad" />
        <FormInput label="Prazo (YYYY-MM-DD)" value={goalForm.deadline} onChangeText={value => setGoalForm(prev => ({ ...prev, deadline: value }))} placeholder="Opcional" keyboardType="numbers-and-punctuation" />
      </BottomSheet>
    </SafeAreaView>
  )
}
