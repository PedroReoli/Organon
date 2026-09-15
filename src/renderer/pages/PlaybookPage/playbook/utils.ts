import type { Playbook } from '@types'
import type { PlaybookForm } from '@types'

export const normalize = (value: string): string =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

export const stripHtml = (html: string): string =>
  html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

export const processDialogText = (text: string): string =>
  text.replace(/\\n/g, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<\/br>/gi, '\n')

export const extractDialogVariables = (text: string): string[] => {
  const found = new Set<string>()
  for (const match of text.matchAll(/{([^{}]+)}/g)) {
    const name = (match[1] ?? '').trim()
    if (name) found.add(name)
  }
  return Array.from(found)
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export const applyDialogVariables = (
  text: string,
  values: Record<string, string>,
  boldMap: Record<string, boolean>,
): string =>
  text.replace(/{([^{}]+)}/g, (_, variable) => {
    const name = String(variable ?? '').trim()
    if (!name) return '{}'
    const rawValue = values[name]?.trim() ?? ''
    if (!rawValue) return `{${name}}`
    const safeValue = escapeHtml(rawValue)
    return boldMap[name] ? `<strong>${safeValue}</strong>` : safeValue
  })

export const toForm = (playbook: Playbook): PlaybookForm => ({
  title: playbook.title, sector: playbook.sector,
  category: playbook.category, summary: playbook.summary, content: playbook.content,
})
