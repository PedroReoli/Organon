import type { CRMInteraction, CRMTag, CRMContactLinks, CRMInteractionType } from '../../types'
import type { UpdateStoreFn } from './types'
import { generateId } from '../../utils'

export const createCRMExtrasSlice = (updateStore: UpdateStoreFn) => {
  const addCRMInteraction = (input: {
    contactId: string
    type: CRMInteractionType
    content: string
    date: string
    time: string
  }) => {
    const newInteraction: CRMInteraction = {
      id: generateId(),
      contactId: input.contactId,
      type: input.type,
      content: input.content,
      date: input.date,
      time: input.time,
      createdAt: new Date().toISOString(),
    }
    updateStore(prev => ({
      ...prev,
      crmInteractions: [...prev.crmInteractions, newInteraction],
    }))
    return newInteraction.id
  }

  const updateCRMInteraction = (interactionId: string, updates: Partial<Pick<CRMInteraction, 'type' | 'content' | 'date' | 'time'>>) => {
    updateStore(prev => ({
      ...prev,
      crmInteractions: prev.crmInteractions.map(interaction =>
        interaction.id === interactionId
          ? { ...interaction, ...updates }
          : interaction
      ),
    }))
  }

  const removeCRMInteraction = (interactionId: string) => {
    updateStore(prev => ({
      ...prev,
      crmInteractions: prev.crmInteractions.filter(i => i.id !== interactionId),
    }))
  }

  const addCRMTag = (name: string, color?: string) => {
    const newTag: CRMTag = {
      id: generateId(),
      name: name.trim(),
      color: color ?? 'var(--color-primary)',
      createdAt: new Date().toISOString(),
    }
    updateStore(prev => ({
      ...prev,
      crmTags: [...prev.crmTags, newTag],
    }))
    return newTag.id
  }

  const updateCRMTag = (tagId: string, updates: Partial<Pick<CRMTag, 'name' | 'color'>>) => {
    updateStore(prev => ({
      ...prev,
      crmTags: prev.crmTags.map(tag =>
        tag.id === tagId ? { ...tag, ...updates } : tag
      ),
    }))
  }

  const removeCRMTag = (tagId: string) => {
    updateStore(prev => ({
      ...prev,
      crmTags: prev.crmTags.filter(t => t.id !== tagId),
      crmContacts: prev.crmContacts.map(c => ({
        ...c,
        tags: c.tags.filter(t => t !== tagId),
      })),
    }))
  }

  const addCRMContactLink = (contactId: string, linkType: keyof CRMContactLinks, entityId: string) => {
    updateStore(prev => ({
      ...prev,
      crmContacts: prev.crmContacts.map(contact => {
        if (contact.id !== contactId) return contact
        const currentLinks = contact.links[linkType]
        if (currentLinks.includes(entityId)) return contact
        return {
          ...contact,
          links: {
            ...contact.links,
            [linkType]: [...currentLinks, entityId],
          },
          updatedAt: new Date().toISOString(),
        }
      }),
    }))
  }

  const removeCRMContactLink = (contactId: string, linkType: keyof CRMContactLinks, entityId: string) => {
    updateStore(prev => ({
      ...prev,
      crmContacts: prev.crmContacts.map(contact => {
        if (contact.id !== contactId) return contact
        return {
          ...contact,
          links: {
            ...contact.links,
            [linkType]: contact.links[linkType].filter(id => id !== entityId),
          },
          updatedAt: new Date().toISOString(),
        }
      }),
    }))
  }

  const moveCRMContactToStage = (contactId: string, stageId: string) => {
    updateStore(prev => ({
      ...prev,
      crmContacts: prev.crmContacts.map(contact =>
        contact.id === contactId
          ? { ...contact, stageId: stageId as any, updatedAt: new Date().toISOString() }
          : contact
      ),
    }))
  }

  const reorderCRMContacts = (stageId: any, orderedIds: string[]) => {
    updateStore(prev => {
      const otherContacts = prev.crmContacts.filter(c => c.stageId !== stageId)
      const stageContacts = prev.crmContacts.filter(c => c.stageId === stageId)
      const reorderedStageContacts = orderedIds.map((id, idx) => {
        const contact = stageContacts.find(c => c.id === id)
        return contact ? { ...contact, order: idx } : null
      }).filter((c): c is any => c !== null)
      return {
        ...prev,
        crmContacts: [...otherContacts, ...reorderedStageContacts],
      }
    })
  }

  return {
    addCRMInteraction,
    updateCRMInteraction,
    removeCRMInteraction,
    addCRMTag,
    updateCRMTag,
    removeCRMTag,
    addCRMContactLink,
    removeCRMContactLink,
    moveCRMContactToStage,
    reorderCRMContacts,
  }
}
