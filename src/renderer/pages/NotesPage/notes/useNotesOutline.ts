/**
 * useNotesOutline — extrai headings (h1-h6) de um HTML para gerar outline.
 *
 * Parser leve via DOMParser do navegador. Retorna lista flat com nivel + texto + id.
 * Upgrade 10d.
 */

import { useMemo } from 'react'

export interface OutlineItem {
  id: string
  level: number
  text: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function useNotesOutline(html: string): OutlineItem[] {
  return useMemo(() => {
    if (!html || typeof DOMParser === 'undefined') return []
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      const counts = new Map<string, number>()
      return headings.map((h, idx) => {
        const text = (h.textContent ?? '').trim()
        const baseSlug = slugify(text) || `heading-${idx}`
        const count = counts.get(baseSlug) ?? 0
        counts.set(baseSlug, count + 1)
        const id = count === 0 ? baseSlug : `${baseSlug}-${count}`
        const level = Number(h.tagName.slice(1))
        return { id, level, text }
      })
    } catch {
      return []
    }
  }, [html])
}
