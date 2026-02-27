import React, { useState, useMemo } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { FAB } from '../components/shared/FAB'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { EmptyState } from '../components/shared/EmptyState'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { today, now, formatDate } from '../utils/date'
import { formatCurrency } from '../utils/format'
import { EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORY_COLORS, type ExpenseCategory, type Expense, type Bill, type IncomeEntry } from '../types'

type Tab = 'overview' | 'expenses' | 'incomes' | 'bills'

const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]

export function FinancialScreen() {
  const theme = useTheme()
  const { store, addExpense, deleteExpense, addBill, deleteBill, addIncome, deleteIncome } = useStore()
  const [tab, setTab] = useState<Tab>('overview')
  const [showSheet, setShowSheet] = useState(false)
  const [sheetType, setSheetType] = useState<'expense' | 'bill' | 'income'>('expense')
  const [form, setForm] = useState({ description: '', amount: '', category: 'outro' as ExpenseCategory, date: today(), source: '', dueDay: '1', kind: 'fixed' })

  const todayStr = today()
  const ym = todayStr.substring(0, 7)

  const monthExpenses = useMemo(() => store.expenses.filter(e => e.date.startsWith(ym)), [store.expenses, ym])
  const monthIncomes = useMemo(() => store.incomes.filter(i => i.date.startsWith(ym)), [store.incomes, ym])
  const totalExpenses = useMemo(() => monthExpenses.reduce((s, e) => s + e.amount, 0), [monthExpenses])
  const totalIncome = useMemo(() => monthIncomes.reduce((s, i) => s + i.amount, 0) + store.financialConfig.monthlyIncome, [monthIncomes, store.financialConfig.monthlyIncome])
  const balance = totalIncome - totalExpenses

  const expensesByCategory = useMemo(() => {
    const map: Partial<Record<ExpenseCategory, number>> = {}
    monthExpenses.forEach(e => { map[e.category] = (map[e.category] ?? 0) + e.amount })
    return map
  }, [monthExpenses])

  const openNew = (type: 'expense' | 'bill' | 'income') => {
    setSheetType(type)
    setForm({ description: '', amount: '', category: 'outro', date: todayStr, source: '', dueDay: '1', kind: 'fixed' })
    setShowSheet(true)
  }

  const handleSave = () => {
    const amt = parseFloat(form.amount.replace(',', '.'))
    if (isNaN(amt) || amt <= 0) return
    if (sheetType === 'expense') {
      if (!form.description.trim()) return
      addExpense({ description: form.description, amount: amt, category: form.category, date: form.date, installments: 1, currentInstallment: 1, parentId: null, note: '', createdAt: now() })
    } else if (sheetType === 'bill') {
      if (!form.description.trim()) return
      addBill({ name: form.description, amount: amt, dueDay: parseInt(form.dueDay) || 1, category: form.category, recurrence: 'monthly', isPaid: false, paidDate: null, createdAt: now() })
    } else {
      if (!form.source.trim()) return
      addIncome({ source: form.source, amount: amt, date: form.date, kind: form.kind as 'fixed' | 'extra', recurrenceMonths: 1, recurrenceIndex: 1, recurrenceGroupId: null, note: '', createdAt: now() })
    }
    setShowSheet(false)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Visão Geral' },
    { key: 'expenses', label: 'Despesas' },
    { key: 'incomes', label: 'Receitas' },
    { key: 'bills', label: 'Contas' },
  ]

  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    tabRow: { flexDirection: 'row', backgroundColor: theme.surface, paddingHorizontal: 8 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabTxt: { fontSize: 12, color: theme.text + '60' },
    tabActive: { borderBottomWidth: 2, borderBottomColor: theme.primary },
    tabActiveTxt: { color: theme.primary, fontWeight: '700' },
    list: { flex: 1, padding: 12 },
    card: { backgroundColor: theme.surface, borderRadius: 10, padding: 14, marginBottom: 8 },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    catDot: { width: 10, height: 10, borderRadius: 5 },
    itemTitle: { flex: 1, color: theme.text, fontSize: 14 },
    amount: { fontWeight: '700' },
    amountExpense: { color: '#ef4444' },
    amountIncome: { color: '#22c55e' },
    meta: { color: theme.text + '60', fontSize: 11, marginTop: 4 },
    deleteBtn: { padding: 4 },
    overviewCard: { backgroundColor: theme.surface, borderRadius: 14, padding: 16, marginBottom: 12 },
    balanceLabel: { color: theme.text + '80', fontSize: 13, marginBottom: 4 },
    balanceValue: { fontSize: 28, fontWeight: '700' },
    row2: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    miniCard: { flex: 1, backgroundColor: theme.surface, borderRadius: 12, padding: 14 },
    miniLabel: { color: theme.text + '80', fontSize: 11, marginBottom: 4 },
    miniValue: { fontSize: 18, fontWeight: '700' },
    catList: { gap: 8 },
    catRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    catBar: { flex: 1, height: 6, backgroundColor: theme.text + '15', borderRadius: 3, overflow: 'hidden' },
    catFill: { height: 6, borderRadius: 3 },
    formRow: { marginBottom: 12 },
    rowLabel: { color: theme.text + '80', fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
    chips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
    chipTxt: { fontSize: 12 },
  })

  const renderOverview = () => (
    <ScrollView style={s.list}>
      <View style={s.overviewCard}>
        <Text style={s.balanceLabel}>Saldo do mês</Text>
        <Text style={[s.balanceValue, { color: balance >= 0 ? '#22c55e' : '#ef4444' }]}>{formatCurrency(balance)}</Text>
      </View>

      <View style={s.row2}>
        <View style={s.miniCard}>
          <Text style={s.miniLabel}>Renda</Text>
          <Text style={[s.miniValue, { color: '#22c55e' }]}>{formatCurrency(totalIncome)}</Text>
        </View>
        <View style={s.miniCard}>
          <Text style={s.miniLabel}>Gastos</Text>
          <Text style={[s.miniValue, { color: '#ef4444' }]}>{formatCurrency(totalExpenses)}</Text>
        </View>
      </View>

      <View style={s.overviewCard}>
        <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600', marginBottom: 12 }}>Por categoria</Text>
        <View style={s.catList}>
          {CATEGORIES.filter(c => (expensesByCategory[c] ?? 0) > 0).map(cat => {
            const val = expensesByCategory[cat] ?? 0
            const pct = totalExpenses > 0 ? val / totalExpenses : 0
            return (
              <View key={cat} style={s.catRow}>
                <View style={[s.catDot, { backgroundColor: EXPENSE_CATEGORY_COLORS[cat] }]} />
                <Text style={{ color: theme.text, fontSize: 12, width: 80 }}>{EXPENSE_CATEGORY_LABELS[cat]}</Text>
                <View style={s.catBar}>
                  <View style={[s.catFill, { width: `${pct * 100}%`, backgroundColor: EXPENSE_CATEGORY_COLORS[cat] }]} />
                </View>
                <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600', width: 70, textAlign: 'right' }}>{formatCurrency(val)}</Text>
              </View>
            )
          })}
        </View>
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  )

  const renderExpenses = () => (
    <ScrollView style={s.list}>
      {monthExpenses.length === 0 && <EmptyState icon="dollar-sign" title="Sem despesas este mês" />}
      {monthExpenses.map((expense: Expense) => (
        <View key={expense.id} style={s.card}>
          <View style={s.cardRow}>
            <View style={[s.catDot, { backgroundColor: EXPENSE_CATEGORY_COLORS[expense.category] }]} />
            <Text style={s.itemTitle} numberOfLines={1}>{expense.description}</Text>
            <Text style={[s.amount, s.amountExpense]}>{formatCurrency(expense.amount)}</Text>
            <TouchableOpacity style={s.deleteBtn} onPress={() => Alert.alert('Excluir', 'Excluir esta despesa?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteExpense(expense.id) }])}>
              <Feather name="trash-2" size={15} color={theme.text + '40'} />
            </TouchableOpacity>
          </View>
          <Text style={s.meta}>{EXPENSE_CATEGORY_LABELS[expense.category]} · {formatDate(expense.date)}</Text>
        </View>
      ))}
      <View style={{ height: 100 }} />
    </ScrollView>
  )

  const renderIncomes = () => (
    <ScrollView style={s.list}>
      {store.incomes.length === 0 && <EmptyState icon="trending-up" title="Sem receitas" subtitle="Toque no + para registrar" />}
      {store.incomes.map((income: IncomeEntry) => (
        <View key={income.id} style={s.card}>
          <View style={s.cardRow}>
            <Feather name="arrow-down-circle" size={18} color="#22c55e" />
            <Text style={s.itemTitle} numberOfLines={1}>{income.source}</Text>
            <Text style={[s.amount, s.amountIncome]}>{formatCurrency(income.amount)}</Text>
            <TouchableOpacity style={s.deleteBtn} onPress={() => Alert.alert('Excluir', 'Excluir receita?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteIncome(income.id) }])}>
              <Feather name="trash-2" size={15} color={theme.text + '40'} />
            </TouchableOpacity>
          </View>
          <Text style={s.meta}>{income.kind === 'fixed' ? 'Fixa' : 'Extra'} · {formatDate(income.date)}</Text>
        </View>
      ))}
      <View style={{ height: 100 }} />
    </ScrollView>
  )

  const renderBills = () => (
    <ScrollView style={s.list}>
      {store.bills.length === 0 && <EmptyState icon="credit-card" title="Sem contas cadastradas" />}
      {store.bills.map((bill: Bill) => (
        <View key={bill.id} style={[s.card, bill.isPaid && { opacity: 0.5 }]}>
          <View style={s.cardRow}>
            <View style={[s.catDot, { backgroundColor: EXPENSE_CATEGORY_COLORS[bill.category] }]} />
            <Text style={s.itemTitle} numberOfLines={1}>{bill.name}</Text>
            <Text style={[s.amount, s.amountExpense]}>{formatCurrency(bill.amount)}</Text>
            <TouchableOpacity style={s.deleteBtn} onPress={() => Alert.alert('Excluir', 'Excluir esta conta?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteBill(bill.id) }])}>
              <Feather name="trash-2" size={15} color={theme.text + '40'} />
            </TouchableOpacity>
          </View>
          <Text style={s.meta}>Vence dia {bill.dueDay} · {bill.recurrence === 'monthly' ? 'Mensal' : 'Anual'}</Text>
        </View>
      ))}
      <View style={{ height: 100 }} />
    </ScrollView>
  )

  const getFabAction = (): (() => void) => {
    if (tab === 'expenses') return () => openNew('expense')
    if (tab === 'incomes') return () => openNew('income')
    if (tab === 'bills') return () => openNew('bill')
    return () => openNew('expense')
  }

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Financeiro" />
      <View style={s.tabRow}>
        {tabs.map(({ key, label }) => (
          <TouchableOpacity key={key} style={[s.tab, tab === key && s.tabActive]} onPress={() => setTab(key)}>
            <Text style={[s.tabTxt, tab === key && s.tabActiveTxt]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'overview' && renderOverview()}
      {tab === 'expenses' && renderExpenses()}
      {tab === 'incomes' && renderIncomes()}
      {tab === 'bills' && renderBills()}

      {tab !== 'overview' && <FAB onPress={getFabAction()} />}

      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)} title={{ expense: 'Nova despesa', bill: 'Nova conta fixa', income: 'Nova receita' }[sheetType]} onSave={handleSave}>
        {sheetType === 'income'
          ? <FormInput label="Fonte" value={form.source} onChangeText={t => setForm(f => ({ ...f, source: t }))} placeholder="Ex: Salário" autoFocus />
          : <FormInput label="Descrição" value={form.description} onChangeText={t => setForm(f => ({ ...f, description: t }))} placeholder="Ex: Supermercado" autoFocus />
        }
        <FormInput label="Valor (R$)" value={form.amount} onChangeText={t => setForm(f => ({ ...f, amount: t }))} placeholder="0,00" keyboardType="decimal-pad" />
        {sheetType !== 'income' && (
          <View style={s.formRow}>
            <Text style={s.rowLabel}>Categoria</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={s.chips}>
                {CATEGORIES.map(cat => {
                  const active = form.category === cat
                  return (
                    <TouchableOpacity key={cat}
                      style={[s.chip, { borderColor: active ? EXPENSE_CATEGORY_COLORS[cat] : theme.text + '30', backgroundColor: active ? EXPENSE_CATEGORY_COLORS[cat] + '30' : 'transparent' }]}
                      onPress={() => setForm(f => ({ ...f, category: cat }))}>
                      <Text style={[s.chipTxt, { color: active ? EXPENSE_CATEGORY_COLORS[cat] : theme.text + '60' }]}>{EXPENSE_CATEGORY_LABELS[cat]}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </ScrollView>
          </View>
        )}
        {sheetType === 'bill'
          ? <FormInput label="Dia do vencimento" value={form.dueDay} onChangeText={t => setForm(f => ({ ...f, dueDay: t }))} placeholder="1-31" keyboardType="numeric" />
          : <FormInput label="Data (YYYY-MM-DD)" value={form.date} onChangeText={t => setForm(f => ({ ...f, date: t }))} placeholder={todayStr} />
        }
        <View style={{ height: 20 }} />
      </BottomSheet>
    </SafeAreaView>
  )
}
