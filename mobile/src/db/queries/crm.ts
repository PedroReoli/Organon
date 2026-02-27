import { getDb } from '../schema'
import type { CRMContact, CRMInteraction, CRMTag } from '../../types'

export function getAllCRMContacts(): CRMContact[] {
  return getDb().getAllSync<{
    id: string; name: string; company: string | null; role: string | null
    phone: string | null; email: string | null; social_media: string | null
    context: string | null; interests: string | null; priority: string; tags: string
    stage_id: string; description: string; follow_up_date: string | null; links: string
    ord: number; created_at: string; updated_at: string
  }>('SELECT * FROM crm_contacts ORDER BY ord ASC').map(r => ({
    id: r.id, name: r.name, company: r.company, role: r.role,
    phone: r.phone, email: r.email, socialMedia: r.social_media,
    context: r.context, interests: r.interests,
    priority: r.priority as CRMContact['priority'],
    tags: JSON.parse(r.tags || '[]') as string[],
    stageId: r.stage_id as CRMContact['stageId'],
    description: r.description, followUpDate: r.follow_up_date,
    links: JSON.parse(r.links || '{"noteIds":[],"calendarEventIds":[],"cardIds":[]}'),
    order: r.ord, createdAt: r.created_at, updatedAt: r.updated_at,
  }))
}

export function upsertCRMContact(contact: CRMContact): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO crm_contacts
      (id, name, company, role, phone, email, social_media, context, interests, priority, tags, stage_id, description, follow_up_date, links, ord, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contact.id, contact.name, contact.company, contact.role,
      contact.phone, contact.email, contact.socialMedia,
      contact.context, contact.interests, contact.priority,
      JSON.stringify(contact.tags), contact.stageId, contact.description,
      contact.followUpDate, JSON.stringify(contact.links),
      contact.order, contact.createdAt, contact.updatedAt,
    ]
  )
}

export function deleteCRMContact(id: string): void {
  getDb().runSync('DELETE FROM crm_contacts WHERE id = ?', [id])
  getDb().runSync('DELETE FROM crm_interactions WHERE contact_id = ?', [id])
}

export function getInteractionsByContact(contactId: string): CRMInteraction[] {
  return getDb().getAllSync<{
    id: string; contact_id: string; type: string; content: string
    date: string; time: string; created_at: string
  }>('SELECT * FROM crm_interactions WHERE contact_id = ? ORDER BY date DESC, time DESC', [contactId])
    .map(r => ({
      id: r.id, contactId: r.contact_id, type: r.type as CRMInteraction['type'],
      content: r.content, date: r.date, time: r.time, createdAt: r.created_at,
    }))
}

export function upsertCRMInteraction(interaction: CRMInteraction): void {
  getDb().runSync(
    `INSERT OR REPLACE INTO crm_interactions (id, contact_id, type, content, date, time, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [interaction.id, interaction.contactId, interaction.type, interaction.content, interaction.date, interaction.time, interaction.createdAt]
  )
}

export function deleteCRMInteraction(id: string): void {
  getDb().runSync('DELETE FROM crm_interactions WHERE id = ?', [id])
}

export function getAllCRMTags(): CRMTag[] {
  return getDb().getAllSync<{ id: string; name: string; color: string; created_at: string }>('SELECT * FROM crm_tags')
    .map(r => ({ id: r.id, name: r.name, color: r.color, createdAt: r.created_at }))
}

export function upsertCRMTag(tag: CRMTag): void {
  getDb().runSync('INSERT OR REPLACE INTO crm_tags (id, name, color, created_at) VALUES (?, ?, ?, ?)',
    [tag.id, tag.name, tag.color, tag.createdAt])
}
