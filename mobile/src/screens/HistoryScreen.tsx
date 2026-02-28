import React, { useMemo, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'

// ── Types ──────────────────────────────────────────────────────────────────────

type Domain = 'all' | 'cards' | 'notes' | 'events' | 'habits' | 'financial' | 'crm'

interface HistoryItem {
  id: string
  domain: Exclude<Domain, 'all'>
  title: string
  subtitle?: string
  timestamp: string
  color: string
  icon: string
}

// ── Domain config ──────────────────────────────────────────────────────────────

const DOMAIN_CONFIG: Record<Exclude<Domain, 'all'>, { label: string; color: string; icon: string }> = {
  cards:     { label: 'Tarefas',    color: '#6366f1', icon: 'check-square' },
  notes:     { label: 'Notas',      color: '#f59e0b', icon: 'file-text' },
  events:    { label: 'Eventos',    color: '#3b82f6', icon: 'calendar' },
  habits:    { label: 'Hábitos',    color: '#22c55e', icon: 'activity' },
  financial: { label: 'Financeiro', color: '#10b981', icon: 'dollar-sign' },
  crm:       { label: 'CRM',        color: '#ec4899', icon: 'users' },
}

const DOMAINS: Domain[] = ['all', 'cards', 'notes', 'events', 'habits', 'financial', 'crm']

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch { return iso }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function groupByDate(items: HistoryItem[]): { date: string; items: HistoryItem[] }[] {
  const map = new Map<string, HistoryItem[]>()
  for (const item of items) {
    const key = item.timestamp.slice(0, 10)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }))
}

// ── Component ──────────────────────────────────────────────────────────────────

export function HistoryScreen() {
  const theme = useTheme()
  const { store } = useStore()
  const [filter, setFilter] = useState<Domain>('all')

  const items = useMemo<HistoryItem[]>(() => {
    const list: HistoryItem[] = []

    store.cards.forEach(c => list.push({
      id: 'card-' + c.id,
      domain: 'cards',
      title: c.title || '(sem título)',
      subtitle: c.status.replace('_', ' '),
      timestamp: c.updatedAt,
      color: DOMAIN_CONFIG.cards.color,
      icon: 'check-square',
    }))

    store.notes.forEach(n => list.push({
      id: 'note-' + n.id,
      domain: 'notes',
      title: n.title || '(sem título)',
      subtitle: n.folderId
        ? store.noteFolders.find(f => f.id === n.folderId)?.name
        : undefined,
      timestamp: n.updatedAt,
      color: DOMAIN_CONFIG.notes.color,
      icon: 'file-text',
    }))

    store.calendarEvents.forEach(e => list.push({
      id: 'ev-' + e.id,
      domain: 'events',
      title: e.title || '(sem título)',
      subtitle: e.date + (e.time ? ' às ' + e.time : ''),
      timestamp: e.updatedAt,
      color: DOMAIN_CONFIG.events.color,
      icon: 'calendar',
    }))

    store.habits.forEach(h => list.push({
      id: 'habit-' + h.id,
      domain: 'habits',
      title: h.name,
      subtitle: h.frequency,
      timestamp: h.createdAt,
      color: DOMAIN_CONFIG.habits.color,
      icon: 'activity',
    }))

    store.habitEntries.forEach(e => list.push({
      id: 'hentry-' + e.id,
      domain: 'habits',
      title: store.habits.find(h => h.id === e.habitId)?.name ?? 'Hábito',
      subtitle: e.value != null ? String(e.value) : e.skipped ? 'pulado' : 'feito',
      timestamp: e.date + 'T12:00:00',
      color: DOMAIN_CONFIG.habits.color,
      icon: 'check-circle',
    }))

    store.expenses.forEach(e => list.push({
      id: 'exp-' + e.id,
      domain: 'financial',
      title: e.description || e.category,
      subtitle: `- R$ ${e.amount.toFixed(2)}`,
      timestamp: e.date + 'T12:00:00',
      color: '#ef4444',
      icon: 'trending-down',
    }))

    store.incomes.forEach(e => list.push({
      id: 'inc-' + e.id,
      domain: 'financial',
      title: e.source,
      subtitle: `+ R$ ${e.amount.toFixed(2)}`,
      timestamp: e.date + 'T12:00:00',
      color: DOMAIN_CONFIG.financial.color,
      icon: 'trending-up',
    }))

    store.crmContacts.forEach(c => list.push({
      id: 'crm-' + c.id,
      domain: 'crm',
      title: c.name,
      subtitle: c.company ?? c.stage,
      timestamp: c.createdAt,
      color: DOMAIN_CONFIG.crm.color,
      icon: 'users',
    }))

    store.crmInteractions.forEach(i => list.push({
      id: 'crmi-' + i.id,
      domain: 'crm',
      title: store.crmContacts.find(c => c.id === i.contactId)?.name ?? 'Contato',
      subtitle: i.type + (i.date ? ' · ' + i.date : ''),
      timestamp: i.date + 'T12:00:00',
      color: DOMAIN_CONFIG.crm.color,
      icon: 'message-circle',
    }))

    return list
      .filter(i => filter === 'all' || i.domain === filter)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 200)
  }, [store, filter])

  const groups = useMemo(() => groupByDate(items), [items])

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.text + '12' }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Histórico</Text>
        <Text style={[styles.headerCount, { color: theme.text + '45' }]}>{items.length} registros</Text>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {DOMAINS.map(d => {
          const isAll  = d === 'all'
          const cfg    = isAll ? null : DOMAIN_CONFIG[d]
          const color  = cfg?.color ?? theme.primary
          const active = filter === d
          return (
            <TouchableOpacity
              key={d}
              style={[
                styles.filterChip,
                active
                  ? { backgroundColor: color, borderColor: color }
                  : { backgroundColor: theme.text + '08', borderColor: theme.text + '15' },
              ]}
              onPress={() => setFilter(d)}
            >
              {cfg && (
                <Feather name={cfg.icon as any} size={11} color={active ? '#fff' : color} />
              )}
              <Text style={[styles.filterLabel, { color: active ? '#fff' : theme.text + '80' }]}>
                {isAll ? 'Todos' : cfg!.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Timeline */}
      <ScrollView contentContainerStyle={styles.timelineContent} showsVerticalScrollIndicator={false}>

        {groups.length === 0 && (
          <View style={styles.empty}>
            <Feather name="clock" size={44} color={theme.text + '20'} />
            <Text style={[styles.emptyText, { color: theme.text + '35' }]}>Nenhum registro ainda</Text>
          </View>
        )}

        {groups.map(group => (
          <View key={group.date}>

            {/* Date divider */}
            <View style={styles.dateDivider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.text + '12' }]} />
              <View style={[styles.dividerPill, { backgroundColor: theme.surface }]}>
                <Text style={[styles.dividerText, { color: theme.text + '55' }]}>
                  {formatDate(group.date + 'T12:00:00')}
                </Text>
              </View>
              <View style={[styles.dividerLine, { backgroundColor: theme.text + '12' }]} />
            </View>

            {/* Items with timeline */}
            <View style={styles.groupRows}>
              <View style={[styles.verticalLine, { backgroundColor: theme.text + '10' }]} />

              <View style={styles.groupItems}>
                {group.items.map(item => (
                  <View key={item.id} style={styles.itemRow}>
                    {/* Dot */}
                    <View style={[styles.dot, { backgroundColor: item.color }]}>
                      <Feather name={item.icon as any} size={10} color="#fff" />
                    </View>

                    {/* Card */}
                    <View style={[styles.itemCard, { backgroundColor: theme.surface }]}>
                      <View style={styles.cardTop}>
                        <View style={[styles.domainTag, { backgroundColor: item.color + '18' }]}>
                          <Text style={[styles.domainTagText, { color: item.color }]}>
                            {DOMAIN_CONFIG[item.domain].label}
                          </Text>
                        </View>
                        <Text style={[styles.timeText, { color: theme.text + '40' }]}>
                          {formatTime(item.timestamp)}
                        </Text>
                      </View>
                      <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {item.subtitle ? (
                        <Text style={[styles.itemSub, { color: theme.text + '50' }]} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:         { flex: 1 },

  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1 },
  headerTitle:  { fontSize: 18, fontWeight: '700' },
  headerCount:  { fontSize: 13, fontWeight: '500' },

  filterScroll:  { flexGrow: 0, maxHeight: 52 },
  filterContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 7, flexDirection: 'row', alignItems: 'center' },
  filterChip:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, gap: 5 },
  filterLabel:   { fontSize: 12, fontWeight: '600' },

  timelineContent: { paddingTop: 8, paddingBottom: 32 },

  dateDivider:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 16, marginBottom: 10 },
  dividerLine:  { flex: 1, height: 1 },
  dividerPill:  { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginHorizontal: 8 },
  dividerText:  { fontSize: 12, fontWeight: '600' },

  groupRows:    { flexDirection: 'row', paddingLeft: 28, paddingRight: 16 },
  verticalLine: { width: 2, borderRadius: 1, marginRight: 0 },
  groupItems:   { flex: 1, paddingLeft: 16, gap: 8 },

  itemRow:      { flexDirection: 'row', alignItems: 'flex-start', marginLeft: -29 },
  dot:          { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 10, flexShrink: 0 },

  itemCard:     { flex: 1, borderRadius: 12, padding: 12, marginBottom: 2 },
  cardTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  domainTag:    { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  domainTagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  timeText:     { fontSize: 11, fontWeight: '500' },
  itemTitle:    { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  itemSub:      { fontSize: 12, marginTop: 3 },

  empty:        { alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: 14 },
  emptyText:    { fontSize: 15, fontWeight: '500' },
})
