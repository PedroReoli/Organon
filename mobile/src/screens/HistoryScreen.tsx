import React, { useMemo, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { EmptyState } from '../components/shared/EmptyState'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { formatDate } from '../utils/date'

type Domain = 'all' | 'cards' | 'notes' | 'events' | 'habits' | 'financial' | 'crm'

interface ActivityItem {
  id: string
  domain: Exclude<Domain, 'all'>
  icon: string
  title: string
  subtitle: string
  date: string
}

const DOMAIN_FILTERS: { id: Domain; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'cards', label: 'Cards' },
  { id: 'notes', label: 'Notas' },
  { id: 'events', label: 'Eventos' },
  { id: 'habits', label: 'Hábitos' },
  { id: 'financial', label: 'Financeiro' },
  { id: 'crm', label: 'CRM' },
]

const DOMAIN_COLORS: Record<Exclude<Domain, 'all'>, string> = {
  cards: '#6366f1',
  notes: '#22c55e',
  events: '#3b82f6',
  habits: '#f97316',
  financial: '#eab308',
  crm: '#ec4899',
}

export function HistoryScreen() {
  const theme = useTheme()
  const { store } = useStore()
  const [domain, setDomain] = useState<Domain>('all')

  const activities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = []

    // Cards
    store.cards.forEach(c => {
      items.push({
        id: c.id,
        domain: 'cards',
        icon: 'check-square',
        title: c.title || 'Card sem título',
        subtitle: c.status === 'done' ? 'Concluído' : c.status === 'in_progress' ? 'Em andamento' : 'A fazer',
        date: c.updatedAt,
      })
    })

    // Notes
    store.notes.forEach(n => {
      items.push({
        id: n.id,
        domain: 'notes',
        icon: 'file-text',
        title: n.title || 'Nota sem título',
        subtitle: n.folderId
          ? (store.noteFolders.find(f => f.id === n.folderId)?.name ?? 'Pasta')
          : 'Sem pasta',
        date: n.updatedAt,
      })
    })

    // Events
    store.calendarEvents.forEach(e => {
      items.push({
        id: e.id,
        domain: 'events',
        icon: 'calendar',
        title: e.title,
        subtitle: formatDate(e.date) + (e.time ? ` às ${e.time}` : ''),
        date: e.updatedAt,
      })
    })

    // Habits
    store.habits.forEach(h => {
      items.push({
        id: h.id,
        domain: 'habits',
        icon: 'activity',
        title: h.name,
        subtitle: h.frequency === 'daily' ? 'Diário' : 'Semanal',
        date: h.createdAt,
      })
    })

    // Habit entries (recent)
    store.habitEntries.slice(0, 50).forEach(e => {
      const habit = store.habits.find(h => h.id === e.habitId)
      if (!habit) return
      items.push({
        id: e.id,
        domain: 'habits',
        icon: 'check-circle',
        title: `${habit.name} — ${formatDate(e.date)}`,
        subtitle: e.skipped ? `Pulado: ${e.skipReason || 'sem motivo'}` : `Valor: ${e.value}`,
        date: e.date + 'T12:00:00.000Z',
      })
    })

    // Financial - Expenses
    store.expenses.forEach(exp => {
      items.push({
        id: exp.id,
        domain: 'financial',
        icon: 'arrow-down',
        title: exp.description || 'Despesa',
        subtitle: `R$ ${exp.amount.toFixed(2).replace('.', ',')} · ${exp.category}`,
        date: exp.date + 'T12:00:00.000Z',
      })
    })

    // Financial - Incomes
    store.incomes.forEach(inc => {
      items.push({
        id: inc.id,
        domain: 'financial',
        icon: 'arrow-up',
        title: inc.source || 'Receita',
        subtitle: `R$ ${inc.amount.toFixed(2).replace('.', ',')} · ${formatDate(inc.date)}`,
        date: inc.date + 'T12:00:00.000Z',
      })
    })

    // CRM Contacts
    store.crmContacts.forEach(c => {
      items.push({
        id: c.id,
        domain: 'crm',
        icon: 'user',
        title: c.name,
        subtitle: c.company ? `${c.company} · ${c.stageId}` : c.stageId,
        date: c.updatedAt,
      })
    })

    // CRM Interactions
    store.crmInteractions.forEach(i => {
      const contact = store.crmContacts.find(c => c.id === i.contactId)
      items.push({
        id: i.id,
        domain: 'crm',
        icon: 'message-circle',
        title: contact?.name ?? 'Contato',
        subtitle: `${i.type} · ${formatDate(i.date)}`,
        date: i.createdAt,
      })
    })

    // Sort by date desc, take top 200
    return items
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 200)
  }, [store])

  const filtered = useMemo(() =>
    domain === 'all' ? activities : activities.filter(a => a.domain === domain),
    [activities, domain]
  )

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, ActivityItem[]> = {}
    filtered.forEach(item => {
      const dateKey = item.date.slice(0, 10)
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(item)
    })
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    filterRow: { paddingHorizontal: 12, paddingVertical: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 6, borderWidth: 1 },
    chipTxt: { fontSize: 12, fontWeight: '600' },
    list: { flex: 1, paddingHorizontal: 12 },
    dateHeader: { color: theme.text + '50', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 8, padding: 12, marginBottom: 4, gap: 10 },
    iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    rowTitle: { flex: 1, color: theme.text, fontSize: 14 },
    rowSub: { color: theme.text + '60', fontSize: 12, marginTop: 1 },
  })

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Histórico" />

      {/* Domain filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
        {DOMAIN_FILTERS.map(f => {
          const active = domain === f.id
          const color = f.id === 'all' ? theme.primary : DOMAIN_COLORS[f.id as Exclude<Domain, 'all'>]
          return (
            <TouchableOpacity
              key={f.id}
              style={[s.chip, { borderColor: active ? color : theme.text + '25', backgroundColor: active ? color + '20' : 'transparent' }]}
              onPress={() => setDomain(f.id)}
            >
              <Text style={[s.chipTxt, { color: active ? color : theme.text + '60' }]}>{f.label}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <ScrollView style={s.list}>
        {filtered.length === 0 && (
          <EmptyState icon="clock" title="Nenhuma atividade" subtitle="Suas ações recentes aparecerão aqui" />
        )}

        {grouped.map(([dateKey, items]) => (
          <View key={dateKey}>
            <Text style={s.dateHeader}>{formatDate(dateKey)}</Text>
            {items.map(item => {
              const color = DOMAIN_COLORS[item.domain]
              return (
                <View key={item.id + item.date} style={s.row}>
                  <View style={[s.iconWrap, { backgroundColor: color + '20' }]}>
                    <Feather name={item.icon as any} size={15} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={s.rowSub} numberOfLines={1}>{item.subtitle}</Text>
                  </View>
                </View>
              )
            })}
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}
