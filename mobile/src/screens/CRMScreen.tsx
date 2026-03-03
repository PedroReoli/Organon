import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  TextInput,
  Linking,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { FAB } from '../components/shared/FAB'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { EmptyState } from '../components/shared/EmptyState'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { formatDate, now, today } from '../utils/date'
import { uid } from '../utils/format'
import {
  CRM_STAGES,
  CRM_PRIORITY_COLORS,
  CRM_PRIORITY_LABELS,
  CRM_INTERACTION_TYPES,
  type CRMContact,
  type CRMStageId,
  type CRMPriority,
  type CRMInteractionType,
  type CRMContactLinks,
} from '../types'

type Tab = 'list' | 'pipeline'
type SheetTab = 'details' | 'timeline' | 'links'

interface ContactFormState {
  name: string
  company: string
  role: string
  phone: string
  email: string
  socialMedia: string
  context: string
  interests: string
  description: string
  followUpDate: string
  stageId: CRMStageId
  priority: CRMPriority
  tags: string[]
  links: CRMContactLinks
}

const PRIORITIES: CRMPriority[] = ['alta', 'media', 'baixa']
const SHEET_TABS: Array<{ id: SheetTab; label: string }> = [
  { id: 'details', label: 'Detalhes' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'links', label: 'Vinculos' },
]
const TAG_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899']

function emptyLinks(): CRMContactLinks {
  return { noteIds: [], calendarEventIds: [], cardIds: [] }
}

function createEmptyForm(): ContactFormState {
  return {
    name: '', company: '', role: '', phone: '', email: '', socialMedia: '',
    context: '', interests: '', description: '', followUpDate: '',
    stageId: 'prospeccao', priority: 'media', tags: [], links: emptyLinks(),
  }
}

function hhmmNow(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function interactionSortStamp(date: string, time: string): number {
  return new Date(`${date}T${time || '00:00'}`).getTime()
}

function chunkInteractions<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items]
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

export function CRMScreen() {
  const theme = useTheme()
  const { width: viewportWidth } = useWindowDimensions()
  const {
    store,
    addCRMContact,
    updateCRMContact,
    deleteCRMContact,
    addCRMInteraction,
    deleteCRMInteraction,
    addCRMTag,
  } = useStore()

  const [tab, setTab] = useState<Tab>('list')
  const [search, setSearch] = useState('')
  const [showSheet, setShowSheet] = useState(false)
  const [sheetTab, setSheetTab] = useState<SheetTab>('details')
  const [pipelinePage, setPipelinePage] = useState(0)
  const [timelinePage, setTimelinePage] = useState(0)
  const [editingContact, setEditingContact] = useState<CRMContact | null>(null)
  const [tagDraft, setTagDraft] = useState('')
  const [interactionForm, setInteractionForm] = useState({
    type: 'nota' as CRMInteractionType,
    content: '',
    date: today(),
    time: hhmmNow(),
  })
  const [form, setForm] = useState<ContactFormState>(createEmptyForm())

  const normalizedSearch = search.trim().toLowerCase()

  const interactionsByContact = useMemo(() => {
    const map = new Map<string, typeof store.crmInteractions>()
    for (const interaction of store.crmInteractions) {
      const current = map.get(interaction.contactId) ?? []
      current.push(interaction)
      map.set(interaction.contactId, current)
    }

    for (const [contactId, interactions] of map.entries()) {
      interactions.sort((a, b) => interactionSortStamp(b.date, b.time) - interactionSortStamp(a.date, a.time))
      map.set(contactId, interactions)
    }

    return map
  }, [store.crmInteractions])

  const filteredContacts = useMemo(() => {
    return store.crmContacts
      .filter(contact => {
        if (!normalizedSearch) return true
        const fields = [
          contact.name,
          contact.company ?? '',
          contact.role ?? '',
          contact.email ?? '',
          contact.phone ?? '',
        ]
        return fields.some(value => value.toLowerCase().includes(normalizedSearch))
      })
      .sort((a, b) => a.order - b.order)
  }, [normalizedSearch, store.crmContacts])

  const contactsByStage = useMemo(() => {
    const grouped: Record<string, CRMContact[]> = {}
    for (const stage of CRM_STAGES) grouped[stage.id] = []
    for (const contact of filteredContacts) {
      if (grouped[contact.stageId]) grouped[contact.stageId].push(contact)
    }
    for (const stage of CRM_STAGES) grouped[stage.id].sort((a, b) => a.order - b.order)
    return grouped
  }, [filteredContacts])

  const overdueCount = useMemo(() => {
    const todayIso = today()
    return store.crmContacts.filter(contact => contact.followUpDate && contact.followUpDate < todayIso).length
  }, [store.crmContacts])

  const activeContactInteractions = useMemo(() => {
    if (!editingContact) return []
    return interactionsByContact.get(editingContact.id) ?? []
  }, [editingContact, interactionsByContact])

  const timelinePages = useMemo(
    () => chunkInteractions(activeContactInteractions, 2),
    [activeContactInteractions],
  )
  const pipelineStagePages = useMemo(
    () => chunkInteractions(CRM_STAGES, 2),
    [],
  )

  const timelinePageWidth = Math.max(240, viewportWidth - 72)
  const pipelinePageWidth = Math.max(240, viewportWidth - 24)
  const activeTimelinePage = Math.min(timelinePage, Math.max(0, timelinePages.length - 1))
  const activePipelinePage = Math.min(pipelinePage, Math.max(0, pipelineStagePages.length - 1))

  const allTags = useMemo(() => [...store.crmTags].sort((a, b) => a.name.localeCompare(b.name)), [store.crmTags])

  const openNew = () => {
    setEditingContact(null)
    setSheetTab('details')
    setTimelinePage(0)
    setTagDraft('')
    setInteractionForm({ type: 'nota', content: '', date: today(), time: hhmmNow() })
    setForm(createEmptyForm())
    setShowSheet(true)
  }

  const closeSheet = () => setShowSheet(false)

  const askCloseSheet = () => {
    Alert.alert('Fechar formulario', 'Deseja sair sem salvar as alteracoes?', [
      { text: 'Continuar editando', style: 'cancel' },
      { text: 'Sair sem salvar', style: 'destructive', onPress: closeSheet },
    ])
  }

  const openEdit = (contact: CRMContact, nextTab: SheetTab = 'details') => {
    setEditingContact(contact)
    setSheetTab(nextTab)
    setTimelinePage(0)
    setTagDraft('')
    setInteractionForm({ type: 'nota', content: '', date: today(), time: hhmmNow() })
    setForm({
      name: contact.name,
      company: contact.company ?? '',
      role: contact.role ?? '',
      phone: contact.phone ?? '',
      email: contact.email ?? '',
      socialMedia: contact.socialMedia ?? '',
      context: contact.context ?? '',
      interests: contact.interests ?? '',
      description: contact.description ?? '',
      followUpDate: contact.followUpDate ?? '',
      stageId: contact.stageId,
      priority: contact.priority,
      tags: [...contact.tags],
      links: {
        noteIds: [...contact.links.noteIds],
        calendarEventIds: [...contact.links.calendarEventIds],
        cardIds: [...contact.links.cardIds],
      },
    })
    setShowSheet(true)
  }

  const saveContact = () => {
    const name = form.name.trim()
    if (!name) {
      Alert.alert('Contato invalido', 'Informe o nome do contato.')
      return
    }

    const payload = {
      name,
      company: form.company.trim() || null,
      role: form.role.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      socialMedia: form.socialMedia.trim() || null,
      context: form.context.trim() || null,
      interests: form.interests.trim() || null,
      description: form.description.trim(),
      followUpDate: form.followUpDate.trim() || null,
      stageId: form.stageId,
      priority: form.priority,
      tags: form.tags,
      links: form.links,
      updatedAt: now(),
    }

    if (editingContact) {
      updateCRMContact(editingContact.id, payload)
    } else {
      addCRMContact({ ...payload, order: store.crmContacts.length, createdAt: now() })
    }

    setShowSheet(false)
  }

  const askDeleteContact = () => {
    if (!editingContact) return
    Alert.alert('Excluir contato', `Excluir "${editingContact.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => { deleteCRMContact(editingContact.id); setShowSheet(false) } },
    ])
  }

  const toggleTag = (tagId: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId) ? prev.tags.filter(id => id !== tagId) : [...prev.tags, tagId],
    }))
  }

  const addTagFromDraft = () => {
    const label = tagDraft.trim()
    if (!label) return
    const existing = store.crmTags.find(tag => tag.name.toLowerCase() === label.toLowerCase())
    const tag = existing ?? addCRMTag({ name: label, color: TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)], createdAt: now() })
    setForm(prev => ({ ...prev, tags: prev.tags.includes(tag.id) ? prev.tags : [...prev.tags, tag.id] }))
    setTagDraft('')
  }

  const toggleLink = (kind: keyof CRMContactLinks, entityId: string) => {
    setForm(prev => {
      const list = prev.links[kind]
      const next = list.includes(entityId) ? list.filter(id => id !== entityId) : [...list, entityId]
      return { ...prev, links: { ...prev.links, [kind]: next } }
    })
  }

  const addInteraction = () => {
    if (!editingContact) {
      Alert.alert('Salvar primeiro', 'Salve o contato antes de adicionar interacoes.')
      return
    }
    const content = interactionForm.content.trim()
    if (!content) {
      Alert.alert('Interacao invalida', 'Informe o conteudo da interacao.')
      return
    }

    addCRMInteraction({
      id: uid(),
      contactId: editingContact.id,
      type: interactionForm.type,
      content,
      date: interactionForm.date,
      time: interactionForm.time,
      createdAt: now(),
    })

    setInteractionForm(prev => ({ ...prev, content: '' }))
  }

  const removeInteraction = (interactionId: string) => {
    Alert.alert('Excluir interacao', 'Deseja remover esta interacao?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteCRMInteraction(interactionId) },
    ])
  }

  const handleTimelineMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (timelinePages.length <= 1) {
      setTimelinePage(0)
      return
    }
    const offsetX = event.nativeEvent.contentOffset.x
    const index = Math.round(offsetX / timelinePageWidth)
    const safeIndex = Math.max(0, Math.min(timelinePages.length - 1, index))
    setTimelinePage(safeIndex)
  }

  const handlePipelineMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pipelineStagePages.length <= 1) {
      setPipelinePage(0)
      return
    }
    const offsetX = event.nativeEvent.contentOffset.x
    const index = Math.round(offsetX / pipelinePageWidth)
    const safeIndex = Math.max(0, Math.min(pipelineStagePages.length - 1, index))
    setPipelinePage(safeIndex)
  }

  const openWhatsApp = async (phone: string | null) => {
    const digits = (phone ?? '').replace(/\D/g, '')
    if (!digits) {
      Alert.alert('Sem telefone', 'Adicione o telefone para abrir o WhatsApp.')
      return
    }
    try {
      await Linking.openURL(`https://wa.me/${digits}`)
    } catch {
      Alert.alert('Falha', 'Nao foi possivel abrir o WhatsApp.')
    }
  }

  const makeCall = async (phone: string | null) => {
    const raw = (phone ?? '').trim().replace(/[^\d+]/g, '')
    if (!raw) {
      Alert.alert('Sem telefone', 'Adicione o telefone para fazer ligacao.')
      return
    }
    try {
      await Linking.openURL(`tel:${raw}`)
    } catch {
      Alert.alert('Falha', 'Nao foi possivel iniciar a ligacao.')
    }
  }

  const renderContactCard = (contact: CRMContact) => {
    const stageLabel = CRM_STAGES.find(stage => stage.id === contact.stageId)?.label ?? contact.stageId
    const priColor = CRM_PRIORITY_COLORS[contact.priority]
    const lastInteraction = (interactionsByContact.get(contact.id) ?? [])[0]
    const isOverdue = Boolean(contact.followUpDate && contact.followUpDate < today())

    return (
      <View key={contact.id} style={[s.itemCard, { borderColor: theme.text + '14', backgroundColor: theme.surface }]}> 
        <View style={s.itemTop}>
          <View style={[s.avatar, { backgroundColor: priColor + '22', borderColor: priColor + '55' }]}>
            <Text style={[s.avatarTxt, { color: priColor }]}>{contact.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.itemTitle, { color: theme.text }]} numberOfLines={1}>{contact.name}</Text>
            <Text style={[s.itemMeta, { color: theme.text + '80' }]} numberOfLines={1}>
              {(contact.company ?? 'Sem empresa')}{contact.role ? ` • ${contact.role}` : ''}
            </Text>
          </View>
          <View style={[s.badge, { borderColor: priColor + '66', backgroundColor: priColor + '16' }]}>
            <Text style={[s.badgeTxt, { color: priColor }]}>{CRM_PRIORITY_LABELS[contact.priority]}</Text>
          </View>
        </View>

        <View style={s.itemRow}>
          <View style={[s.badge, { borderColor: theme.primary + '66', backgroundColor: theme.primary + '14' }]}>
            <Text style={[s.badgeTxt, { color: theme.primary }]}>{stageLabel}</Text>
          </View>
          {contact.followUpDate && (
            <View style={[s.badge, isOverdue ? { borderColor: '#ef444466', backgroundColor: '#ef444418' } : { borderColor: theme.text + '25', backgroundColor: theme.text + '08' }]}>
              <Text style={[s.badgeTxt, { color: isOverdue ? '#ef4444' : theme.text + '90' }]}>Follow-up {formatDate(contact.followUpDate)}</Text>
            </View>
          )}
        </View>

        {!!contact.tags.length && (
          <View style={s.tagRow}>
            {contact.tags.map(tagId => {
              const tag = store.crmTags.find(item => item.id === tagId)
              if (!tag) return null
              return (
                <View key={`${contact.id}-${tagId}`} style={[s.tagChip, { backgroundColor: tag.color + '22', borderColor: tag.color + '66' }]}>
                  <Text style={[s.tagChipTxt, { color: tag.color }]}>{tag.name}</Text>
                </View>
              )
            })}
          </View>
        )}

        {lastInteraction && (
          <Text style={[s.itemMeta, { color: theme.text + '78', marginTop: 8 }]} numberOfLines={2}>
            Ultima interacao: {CRM_INTERACTION_TYPES[lastInteraction.type]} • {lastInteraction.content}
          </Text>
        )}

        <View style={s.actionRow}>
          <TouchableOpacity style={[s.actionBtn, { borderColor: '#22c55e66', backgroundColor: '#22c55e14' }]} onPress={() => void openWhatsApp(contact.phone)}>
            <Feather name="message-circle" size={13} color="#22c55e" />
            <Text style={[s.actionBtnTxt, { color: '#22c55e' }]}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { borderColor: '#60a5fa66', backgroundColor: '#60a5fa14' }]} onPress={() => void makeCall(contact.phone)}>
            <Feather name="phone" size={13} color="#60a5fa" />
            <Text style={[s.actionBtnTxt, { color: '#60a5fa' }]}>Ligar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { borderColor: theme.text + '22', backgroundColor: theme.text + '08' }]} onPress={() => openEdit(contact, 'timeline')}>
            <Feather name="clock" size={13} color={theme.text + 'c0'} />
            <Text style={[s.actionBtnTxt, { color: theme.text + 'c0' }]}>Interacao</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { borderColor: theme.primary + '66', backgroundColor: theme.primary + '14' }]} onPress={() => openEdit(contact)}>
            <Feather name="edit-2" size={13} color={theme.primary} />
            <Text style={[s.actionBtnTxt, { color: theme.primary }]}>Detalhes</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderList = () => (
    <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
      <View style={[s.panel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}> 
        <Text style={[s.panelTitle, { color: theme.text }]}>Contatos</Text>
        <View style={[s.searchWrap, { borderColor: theme.text + '14', backgroundColor: theme.background }]}> 
          <Feather name="search" size={16} color={theme.text + '70'} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nome, empresa, cargo, e-mail"
            placeholderTextColor={theme.text + '55'}
            style={[s.searchInput, { color: theme.text }]}
          />
        </View>

        <View style={s.statsRow}>
          <View style={[s.statChip, { borderColor: theme.text + '16', backgroundColor: theme.background }]}>
            <Text style={[s.statChipVal, { color: theme.text }]}>{store.crmContacts.length}</Text>
            <Text style={[s.statChipLabel, { color: theme.text + '70' }]}>Total</Text>
          </View>
          <View style={[s.statChip, { borderColor: overdueCount > 0 ? '#ef444466' : theme.text + '16', backgroundColor: overdueCount > 0 ? '#ef444412' : theme.background }]}>
            <Text style={[s.statChipVal, { color: overdueCount > 0 ? '#ef4444' : theme.text }]}>{overdueCount}</Text>
            <Text style={[s.statChipLabel, { color: overdueCount > 0 ? '#ef4444' : theme.text + '70' }]}>Atrasado</Text>
          </View>
          <View style={[s.statChip, { borderColor: theme.primary + '30', backgroundColor: theme.primary + '12' }]}>
            <Text style={[s.statChipVal, { color: theme.primary }]}>{filteredContacts.length}</Text>
            <Text style={[s.statChipLabel, { color: theme.primary }]}>{search.trim() ? 'Filtro' : 'Visiveis'}</Text>
          </View>
        </View>
      </View>

      {filteredContacts.length === 0 && <EmptyState icon="users" title="Nenhum contato" subtitle="Toque no + para adicionar" />}
      {filteredContacts.map(renderContactCard)}
      <View style={{ height: 96 }} />
    </ScrollView>
  )

  const renderPipeline = () => (
    <View style={s.pipelineWrap}>
      <ScrollView
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handlePipelineMomentumEnd}
        style={s.pipelinePager}
      >
        {pipelineStagePages.map((stagePair, pageIndex) => (
          <ScrollView
            key={`pipeline-page-${pageIndex}`}
            style={[s.pipelinePage, { width: pipelinePageWidth }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 96 }}
          >
            {stagePair.map(stage => {
              const contacts = contactsByStage[stage.id] ?? []
              return (
                <View key={stage.id} style={[s.panel, { backgroundColor: theme.surface, borderColor: theme.text + '14' }]}>
                  <View style={s.pipelineHeader}>
                    <Text style={[s.panelTitle, { color: theme.text }]}>{stage.label}</Text>
                    <View style={[s.badge, { borderColor: theme.text + '25', backgroundColor: theme.text + '08' }]}>
                      <Text style={[s.badgeTxt, { color: theme.text + '85' }]}>{contacts.length}</Text>
                    </View>
                  </View>
                  {contacts.length === 0 ? (
                    <Text style={[s.itemMeta, { color: theme.text + '65' }]}>Sem contatos neste estagio.</Text>
                  ) : (
                    contacts.map(contact => {
                      const priColor = CRM_PRIORITY_COLORS[contact.priority]
                      return (
                        <TouchableOpacity
                          key={contact.id}
                          style={[s.pipelineCard, { borderColor: theme.text + '14', backgroundColor: theme.background }]}
                          onPress={() => openEdit(contact)}
                          activeOpacity={0.92}
                        >
                          <View style={s.itemTop}>
                            <Text style={[s.itemTitle, { color: theme.text }]} numberOfLines={1}>{contact.name}</Text>
                            <View style={[s.priDot, { backgroundColor: priColor }]} />
                          </View>
                          {!!contact.company && <Text style={[s.itemMeta, { color: theme.text + '75' }]} numberOfLines={1}>{contact.company}</Text>}
                          <View style={s.actionRow}>
                            <TouchableOpacity style={[s.iconBtn, { borderColor: '#22c55e66', backgroundColor: '#22c55e14' }]} onPress={() => void openWhatsApp(contact.phone)}>
                              <Feather name="message-circle" size={13} color="#22c55e" />
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.iconBtn, { borderColor: '#60a5fa66', backgroundColor: '#60a5fa14' }]} onPress={() => void makeCall(contact.phone)}>
                              <Feather name="phone" size={13} color="#60a5fa" />
                            </TouchableOpacity>
                          </View>
                        </TouchableOpacity>
                      )
                    })
                  )}
                </View>
              )
            })}
          </ScrollView>
        ))}
      </ScrollView>

      {pipelineStagePages.length > 1 && (
        <View style={s.pipelineDotsRow}>
          {pipelineStagePages.map((_, index) => (
            <View
              key={`pipeline-dot-${index}`}
              style={[
                s.pipelineDot,
                index === activePipelinePage
                  ? { backgroundColor: theme.primary, width: 18 }
                  : { backgroundColor: theme.text + '35', width: 7 },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  )

  const renderSheetDetails = () => (
    <>
      <FormInput label="Nome *" value={form.name} onChangeText={value => setForm(prev => ({ ...prev, name: value }))} placeholder="Nome completo" autoFocus />
      <FormInput label="Empresa" value={form.company} onChangeText={value => setForm(prev => ({ ...prev, company: value }))} placeholder="Empresa" />
      <FormInput label="Cargo" value={form.role} onChangeText={value => setForm(prev => ({ ...prev, role: value }))} placeholder="Ex: Gerente comercial" />
      <FormInput label="Telefone" value={form.phone} onChangeText={value => setForm(prev => ({ ...prev, phone: value }))} placeholder="+55 11 99999-0000" keyboardType="phone-pad" />
      <FormInput label="E-mail" value={form.email} onChangeText={value => setForm(prev => ({ ...prev, email: value }))} placeholder="email@exemplo.com" keyboardType="email-address" />
      <FormInput label="Rede social" value={form.socialMedia} onChangeText={value => setForm(prev => ({ ...prev, socialMedia: value }))} placeholder="@usuario ou perfil" />
      <FormInput label="Contexto" value={form.context} onChangeText={value => setForm(prev => ({ ...prev, context: value }))} placeholder="Onde conheceu esse contato" multiline numberOfLines={2} />
      <FormInput label="Interesses" value={form.interests} onChangeText={value => setForm(prev => ({ ...prev, interests: value }))} placeholder="Produtos, servicos, dores" multiline numberOfLines={2} />
      <FormInput label="Follow-up (YYYY-MM-DD)" value={form.followUpDate} onChangeText={value => setForm(prev => ({ ...prev, followUpDate: value }))} placeholder="2026-03-15" />

      <Text style={[s.sectionLabel, { color: theme.text + '72' }]}>Estagio</Text>
      <View style={s.chips}>
        {CRM_STAGES.map(stage => {
          const active = form.stageId === stage.id
          return (
            <TouchableOpacity key={stage.id} style={[s.chip, active ? { borderColor: theme.primary, backgroundColor: theme.primary + '1a' } : { borderColor: theme.text + '24', backgroundColor: theme.text + '08' }]} onPress={() => setForm(prev => ({ ...prev, stageId: stage.id }))}>
              <Text style={[s.chipTxt, { color: active ? theme.primary : theme.text + '86' }]}>{stage.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <Text style={[s.sectionLabel, { color: theme.text + '72' }]}>Prioridade</Text>
      <View style={s.chips}>
        {PRIORITIES.map(priority => {
          const active = form.priority === priority
          const color = CRM_PRIORITY_COLORS[priority]
          return (
            <TouchableOpacity key={priority} style={[s.chip, active ? { borderColor: color, backgroundColor: color + '20' } : { borderColor: theme.text + '24', backgroundColor: theme.text + '08' }]} onPress={() => setForm(prev => ({ ...prev, priority }))}>
              <Text style={[s.chipTxt, { color: active ? color : theme.text + '86' }]}>{CRM_PRIORITY_LABELS[priority]}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <Text style={[s.sectionLabel, { color: theme.text + '72' }]}>Tags</Text>
      <View style={s.rowInline}>
        <TextInput value={tagDraft} onChangeText={setTagDraft} placeholder="Nova tag" placeholderTextColor={theme.text + '55'} style={[s.inlineInput, { color: theme.text, borderColor: theme.text + '24', backgroundColor: theme.text + '08' }]} />
        <TouchableOpacity style={[s.inlineBtn, { backgroundColor: theme.primary }]} onPress={addTagFromDraft}><Feather name="plus" size={14} color="#fff" /><Text style={s.inlineBtnTxt}>Tag</Text></TouchableOpacity>
      </View>

      {allTags.length > 0 && (
        <View style={s.chips}>
          {allTags.map(tag => {
            const active = form.tags.includes(tag.id)
            return (
              <TouchableOpacity key={tag.id} style={[s.chip, active ? { borderColor: tag.color, backgroundColor: tag.color + '22' } : { borderColor: theme.text + '24', backgroundColor: theme.text + '08' }]} onPress={() => toggleTag(tag.id)}>
                <Text style={[s.chipTxt, { color: active ? tag.color : theme.text + '86' }]}>{tag.name}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      <FormInput label="Notas" value={form.description} onChangeText={value => setForm(prev => ({ ...prev, description: value }))} placeholder="Contexto comercial, observacoes" multiline numberOfLines={4} />

      {editingContact && (<TouchableOpacity style={[s.deleteBtn, { backgroundColor: '#ef444420' }]} onPress={askDeleteContact}><Text style={{ color: '#ef4444', fontWeight: '700' }}>Excluir contato</Text></TouchableOpacity>)}
      <View style={{ height: 20 }} />
    </>
  )

  const renderSheetTimeline = () => {
    if (!editingContact) return <View style={{ paddingVertical: 18 }}><Text style={{ color: theme.text + '70' }}>Salve o contato para registrar interacoes.</Text></View>

    return (
      <>
        <Text style={[s.sectionLabel, { color: theme.text + '72' }]}>Nova interacao</Text>
        <View style={s.chips}>
          {(Object.keys(CRM_INTERACTION_TYPES) as CRMInteractionType[]).map(type => {
            const active = interactionForm.type === type
            return (
              <TouchableOpacity key={type} style={[s.chip, active ? { borderColor: theme.primary, backgroundColor: theme.primary + '1a' } : { borderColor: theme.text + '24', backgroundColor: theme.text + '08' }]} onPress={() => setInteractionForm(prev => ({ ...prev, type }))}>
                <Text style={[s.chipTxt, { color: active ? theme.primary : theme.text + '86' }]}>{CRM_INTERACTION_TYPES[type]}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <FormInput label="Descricao" value={interactionForm.content} onChangeText={value => setInteractionForm(prev => ({ ...prev, content: value }))} placeholder="Resumo da conversa" multiline numberOfLines={3} />

        <View style={s.rowInline}>
          <View style={{ flex: 1 }}><FormInput label="Data" value={interactionForm.date} onChangeText={value => setInteractionForm(prev => ({ ...prev, date: value }))} placeholder="YYYY-MM-DD" /></View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}><FormInput label="Hora" value={interactionForm.time} onChangeText={value => setInteractionForm(prev => ({ ...prev, time: value }))} placeholder="HH:mm" /></View>
        </View>

        <TouchableOpacity style={[s.addBtn, { backgroundColor: theme.primary }]} onPress={addInteraction}><Feather name="plus" size={14} color="#fff" /><Text style={s.addBtnTxt}>Adicionar interacao</Text></TouchableOpacity>

        <Text style={[s.sectionLabel, { color: theme.text + '72', marginTop: 14 }]}>Historico</Text>
        {activeContactInteractions.length === 0 && <Text style={{ color: theme.text + '70' }}>Nenhuma interacao registrada.</Text>}
        {timelinePages.length > 0 && (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleTimelineMomentumEnd}
              style={s.timelinePager}
            >
              {timelinePages.map((page, pageIndex) => (
                <View key={`timeline-page-${pageIndex}`} style={[s.timelinePage, { width: timelinePageWidth }]}>
                  {page.map(interaction => (
                    <View key={interaction.id} style={[s.timelineCard, { borderColor: theme.text + '16', backgroundColor: theme.text + '08' }]}>
                      <View style={s.itemTop}>
                        <Text style={[s.itemTitle, { color: theme.text }]}>{CRM_INTERACTION_TYPES[interaction.type]}</Text>
                        <TouchableOpacity onPress={() => removeInteraction(interaction.id)}><Feather name="trash-2" size={13} color="#ef4444" /></TouchableOpacity>
                      </View>
                      <Text style={[s.itemMeta, { color: theme.text + '75' }]}>{formatDate(interaction.date)} {interaction.time}</Text>
                      <Text style={[s.itemMeta, { color: theme.text + 'c0', marginTop: 6 }]}>{interaction.content}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>

            {timelinePages.length > 1 && (
              <View style={s.timelineDotsRow}>
                {timelinePages.map((_, index) => (
                  <View
                    key={`timeline-dot-${index}`}
                    style={[
                      s.timelineDot,
                      index === activeTimelinePage
                        ? { backgroundColor: theme.primary, width: 18 }
                        : { backgroundColor: theme.text + '35', width: 7 },
                    ]}
                  />
                ))}
              </View>
            )}
          </>
        )}
        <View style={{ height: 20 }} />
      </>
    )
  }

  const renderLinkSection = (title: string, kind: keyof CRMContactLinks, options: Array<{ id: string; label: string }>) => {
    const linkedIds = form.links[kind]

    return (
      <View style={[s.linkSection, { borderColor: theme.text + '16', backgroundColor: theme.text + '08' }]}> 
        <Text style={[s.sectionLabel, { color: theme.text + '72', marginBottom: 8 }]}>{title}</Text>

        {linkedIds.length === 0 ? (
          <Text style={[s.itemMeta, { color: theme.text + '70' }]}>Nenhum vinculo.</Text>
        ) : (
          <View style={s.chips}>
            {linkedIds.map(id => {
              const item = options.find(option => option.id === id)
              if (!item) return null
              return (
                <TouchableOpacity key={`${kind}-active-${id}`} style={[s.chip, { borderColor: theme.primary + '55', backgroundColor: theme.primary + '14' }]} onPress={() => toggleLink(kind, id)}>
                  <Text style={[s.chipTxt, { color: theme.primary }]}>{item.label} • Remover</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        <Text style={[s.itemMeta, { color: theme.text + '72', marginTop: 6, marginBottom: 6 }]}>Disponiveis</Text>
        {options.length === 0 ? (
          <Text style={[s.itemMeta, { color: theme.text + '62' }]}>Sem itens para vincular.</Text>
        ) : (
          <View style={s.chips}>
            {options.map(item => {
              const active = linkedIds.includes(item.id)
              return (
                <TouchableOpacity key={`${kind}-option-${item.id}`} style={[s.chip, active ? { borderColor: theme.primary + '55', backgroundColor: theme.primary + '14' } : { borderColor: theme.text + '24', backgroundColor: theme.text + '06' }]} onPress={() => toggleLink(kind, item.id)}>
                  <Text style={[s.chipTxt, { color: active ? theme.primary : theme.text + '86' }]} numberOfLines={1}>{item.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </View>
    )
  }

  const renderSheetLinks = () => {
    if (!editingContact) return <View style={{ paddingVertical: 18 }}><Text style={{ color: theme.text + '70' }}>Salve o contato para gerenciar vinculos.</Text></View>

    const noteOptions = store.notes.map(note => ({ id: note.id, label: note.title || 'Nota sem titulo' }))
    const eventOptions = store.calendarEvents.map(event => ({ id: event.id, label: `${event.title} (${formatDate(event.date)})` }))
    const cardOptions = store.cards.map(card => ({ id: card.id, label: card.title || 'Card sem titulo' }))

    return (
      <>
        {renderLinkSection('Notas', 'noteIds', noteOptions)}
        {renderLinkSection('Eventos', 'calendarEventIds', eventOptions)}
        {renderLinkSection('Cards', 'cardIds', cardOptions)}
        <View style={{ height: 20 }} />
      </>
    )
  }

  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    tabRow: { height: 46, borderBottomWidth: 1, borderBottomColor: theme.text + '10', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.surface, paddingHorizontal: 12 },
    tabBtn: { minHeight: 32, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
    tabTxt: { fontSize: 12.5, fontWeight: '700' },
    list: { flex: 1, paddingHorizontal: 12, paddingTop: 10 },
    panel: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
    panelTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
    searchWrap: { height: 44, borderRadius: 11, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
    searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
    statsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    statChip: { flex: 1, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
    statChipVal: { fontSize: 16, fontWeight: '800' },
    statChipLabel: { fontSize: 11.5, fontWeight: '600', marginTop: 2 },
    itemCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
    itemTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    itemTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
    itemMeta: { fontSize: 12.5 },
    avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    avatarTxt: { fontSize: 15, fontWeight: '800' },
    priDot: { width: 9, height: 9, borderRadius: 99 },
    itemRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
    badgeTxt: { fontSize: 11, fontWeight: '700' },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    tagChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
    tagChipTxt: { fontSize: 11, fontWeight: '700' },
    actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
    actionBtn: { borderWidth: 1, borderRadius: 9, minHeight: 34, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
    actionBtnTxt: { fontSize: 12, fontWeight: '700' },
    iconBtn: { width: 32, height: 32, borderWidth: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    pipelineWrap: { flex: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 },
    pipelinePager: { flex: 1 },
    pipelinePage: { paddingRight: 10 },
    pipelineHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    pipelineCard: { borderWidth: 1, borderRadius: 10, padding: 11, marginBottom: 7 },
    pipelineDotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
    pipelineDot: { height: 7, borderRadius: 99 },
    sheetTopActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
    sheetHint: { flex: 1, fontSize: 12.5, fontWeight: '600' },
    sheetCancelBtn: {
      minHeight: 34,
      borderRadius: 9,
      borderWidth: 1,
      paddingHorizontal: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    sheetCancelBtnTxt: { fontSize: 12, fontWeight: '700' },
    sheetTabs: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginBottom: 12 },
    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8, marginBottom: 10 },
    chip: { borderWidth: 1, borderRadius: 16, minHeight: 32, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
    chipTxt: { fontSize: 12, fontWeight: '600' },
    rowInline: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    inlineInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
    inlineBtn: { minHeight: 40, borderRadius: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginLeft: 8, gap: 6 },
    inlineBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
    addBtn: { minHeight: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
    addBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '700' },
    timelinePager: { marginTop: 8 },
    timelinePage: { paddingRight: 10 },
    timelineCard: { borderWidth: 1, borderRadius: 10, padding: 11, marginBottom: 8 },
    timelineDotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
    timelineDot: { height: 7, borderRadius: 99 },
    linkSection: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10 },
    sheetBottomActions: { flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 14 },
    sheetBottomBtn: {
      flex: 1,
      minHeight: 42,
      borderRadius: 11,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetBottomBtnTxt: { fontSize: 13, fontWeight: '700' },
    deleteBtn: { marginTop: 6, paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  })

  return (
    <SafeAreaView style={s.screen}>
      <Header title="CRM" />

      <View style={s.tabRow}>
        {(['list', 'pipeline'] as Tab[]).map(item => {
          const active = tab === item
          return (
            <TouchableOpacity
              key={item}
              style={[s.tabBtn, active ? { borderColor: theme.primary + '55', backgroundColor: theme.primary + '18' } : { borderColor: theme.text + '22', backgroundColor: theme.text + '08' }]}
              onPress={() => {
                setTab(item)
                if (item === 'pipeline') setPipelinePage(0)
              }}
            >
              <Text style={[s.tabTxt, { color: active ? theme.primary : theme.text + '85' }]}>{item === 'list' ? 'Lista' : 'Pipeline'}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {tab === 'list' ? renderList() : renderPipeline()}

      <FAB onPress={openNew} />

      <BottomSheet
        visible={showSheet}
        onClose={askCloseSheet}
        title={editingContact ? 'Contato CRM' : 'Novo contato'}
        onSave={saveContact}
        maxHeight={editingContact ? '90%' : '100%'}
      >
        <View style={s.sheetTopActions}>
          <Text style={[s.sheetHint, { color: theme.text + '74' }]}>
            {editingContact ? 'Edite os dados nas abas abaixo.' : 'Preencha os dados e salve para criar o contato.'}
          </Text>
          <TouchableOpacity
            style={[s.sheetCancelBtn, { borderColor: '#ef444466', backgroundColor: '#ef444416' }]}
            onPress={askCloseSheet}
          >
            <Feather name="x-circle" size={14} color="#ef4444" />
            <Text style={[s.sheetCancelBtnTxt, { color: '#ef4444' }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>

        <View style={s.sheetTabs}>
          {SHEET_TABS.map(item => {
            const active = sheetTab === item.id
            return (
              <TouchableOpacity key={item.id} style={[s.chip, active ? { borderColor: theme.primary, backgroundColor: theme.primary + '1a' } : { borderColor: theme.text + '24', backgroundColor: theme.text + '08' }]} onPress={() => setSheetTab(item.id)}>
                <Text style={[s.chipTxt, { color: active ? theme.primary : theme.text + '86' }]}>{item.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {sheetTab === 'details' && renderSheetDetails()}
        {sheetTab === 'timeline' && renderSheetTimeline()}
        {sheetTab === 'links' && renderSheetLinks()}

        <View style={s.sheetBottomActions}>
          <TouchableOpacity
            style={[s.sheetBottomBtn, { borderColor: '#ef444466', backgroundColor: '#ef444416' }]}
            onPress={askCloseSheet}
          >
            <Text style={[s.sheetBottomBtnTxt, { color: '#ef4444' }]}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.sheetBottomBtn, { borderColor: theme.primary, backgroundColor: theme.primary }]}
            onPress={saveContact}
          >
            <Text style={[s.sheetBottomBtnTxt, { color: '#fff' }]}>Salvar</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </SafeAreaView>
  )
}
