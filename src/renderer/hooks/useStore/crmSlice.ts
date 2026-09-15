import type { CRMContact, CRMPriority, CRMStageId, CRMSnapshot } from '../../types'
import type { UpdateStoreFn } from './types'
import { generateId } from '../../utils'

const STAGE_MIGRATION_MAP: Record<string, CRMStageId> = {
  'prospeccao': 'prospeccao',
  'qualificado': 'contato',
  'primeiro-contato': 'contato',
  'analise': 'proposta',
  'proposta-enviada': 'proposta',
  'negociacao': 'proposta',
  'contato': 'contato',
  'proposta': 'proposta',
  'cliente-ativo': 'cliente-ativo',
  'perdeu': 'perdeu',
}

export const migrateCRMStageId = (stageId: string): CRMStageId => {
  return STAGE_MIGRATION_MAP[stageId] ?? 'prospeccao'
}

export const createCRMSlice = (updateStore: UpdateStoreFn) => {
  const addCRMContact = (input: {
    name: string
    company?: string | null
    role?: string | null
    phone?: string | null
    email?: string | null
    socialMedia?: string | null
    context?: string | null
    interests?: string | null
    priority?: CRMPriority
    description?: string
  }) => {
    const now = new Date().toISOString()
    const newContact: CRMContact = {
      id: generateId(),
      name: input.name.trim(),
      company: input.company ?? null,
      role: input.role ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      socialMedia: input.socialMedia ?? null,
      context: input.context ?? null,
      interests: input.interests ?? null,
      priority: input.priority ?? 'media',
      tags: [],
      stageId: 'prospeccao',
      description: input.description ?? '',
      followUpDate: null,
      links: {
        noteIds: [],
        calendarEventIds: [],
        fileIds: [],
        cardIds: [],
        projectIds: [],
      },
      createdAt: now,
      updatedAt: now,
      order: Date.now(),
    }
    updateStore(prev => ({
      ...prev,
      crmContacts: [...prev.crmContacts, newContact],
    }))
    return newContact.id
  }

  const updateCRMContact = (contactId: string, updates: Partial<Pick<CRMContact, 'name' | 'company' | 'role' | 'phone' | 'email' | 'socialMedia' | 'context' | 'interests' | 'priority' | 'tags' | 'stageId' | 'description' | 'followUpDate' | 'links'>>) => {
    const now = new Date().toISOString()
    updateStore(prev => ({
      ...prev,
      crmContacts: prev.crmContacts.map((c: CRMContact) =>
        c.id === contactId ? { ...c, ...updates, updatedAt: now } : c
      ),
    }))
  }

  const removeCRMContact = (contactId: string) => {
    updateStore(prev => ({
      ...prev,
      crmContacts: prev.crmContacts.filter((c: CRMContact) => c.id !== contactId),
      pendingDeletes: [...(prev.pendingDeletes ?? []), { resource: 'crm_contacts', id: contactId }],
    }))
  }

  const reorderCRMContacts = (orderedIds: string[]) => {
    updateStore(prev => ({
      ...prev,
      crmContacts: prev.crmContacts.map((c: CRMContact) => {
        const idx = orderedIds.indexOf(c.id)
        if (idx === -1) return c
        return { ...c, order: idx }
      }),
    }))
  }

  const migrateCRMContactStages = () => {
    updateStore(prev => ({
      ...prev,
      crmContacts: prev.crmContacts.map((c: CRMContact) => ({
        ...c,
        stageId: migrateCRMStageId(c.stageId),
      })),
    }))
  }

  const upsertCRMSnapshot = (snapshot: CRMSnapshot) => {
    updateStore(prev => {
      const snapshots = prev.crmSnapshots ?? []
      const exists = snapshots.find((s: CRMSnapshot) => s.id === snapshot.id)
      if (exists) {
        return {
          ...prev,
          crmSnapshots: snapshots.map((s: CRMSnapshot) => s.id === snapshot.id ? snapshot : s),
        }
      }
      return { ...prev, crmSnapshots: [...snapshots, snapshot] }
    })
  }

  return {
    addCRMContact,
    updateCRMContact,
    removeCRMContact,
    reorderCRMContacts,
    migrateCRMContactStages,
    upsertCRMSnapshot,
  }
}
