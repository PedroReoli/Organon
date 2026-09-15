/**
 * useNotesLinkIndex — extrai e indexa wiki-links [[...]] de todas as notas.
 *
 * Cria mapas bidirecionais: outgoing (de uma nota pra outras) e
 * incoming (notas que linkam pra essa). Resolvido por titulo case-insensitive.
 *
 * Upgrade 10b.
 */

import { useMemo } from 'react'
import type { Note, NoteLinkRef } from '@types'

const WIKI_LINK_RE = /\[\[([^\]]+)\]\]/g

export interface NotesLinkIndex {
  outgoing: Map<string, NoteLinkRef[]>
  incoming: Map<string, NoteLinkRef[]>
  brokenCount: number
}

function extractTextFromHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return html.replace(/<[^>]+>/g, ' ')
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return doc.body.textContent ?? ''
  } catch {
    return html.replace(/<[^>]+>/g, ' ')
  }
}

function snippetAround(text: string, idx: number, len = 60): string {
  const start = Math.max(0, idx - len)
  const end = Math.min(text.length, idx + len)
  return (start > 0 ? '…' : '') + text.slice(start, end).replace(/\s+/g, ' ').trim() + (end < text.length ? '…' : '')
}

interface UseNotesLinkIndexOptions {
  notes: Note[]
  /** Map de noteId -> conteudo HTML carregado. Notas nao carregadas sao ignoradas. */
  contentByNoteId: Record<string, string>
}

export function useNotesLinkIndex({ notes, contentByNoteId }: UseNotesLinkIndexOptions): NotesLinkIndex {
  return useMemo(() => {
    const titleMap = new Map<string, string>()
    for (const n of notes) {
      if (n.deletedAt) continue
      titleMap.set(n.title.toLowerCase().trim(), n.id)
    }

    const outgoing = new Map<string, NoteLinkRef[]>()
    const incoming = new Map<string, NoteLinkRef[]>()
    let brokenCount = 0

    for (const note of notes) {
      if (note.deletedAt) continue
      const html = contentByNoteId[note.id]
      if (!html) continue
      const text = extractTextFromHtml(html)
      const refs: NoteLinkRef[] = []
      let match: RegExpExecArray | null
      const re = new RegExp(WIKI_LINK_RE.source, 'g')
      while ((match = re.exec(text)) !== null) {
        const targetTitle = match[1].trim()
        const targetId = titleMap.get(targetTitle.toLowerCase()) ?? null
        if (targetId === null) brokenCount++
        const ref: NoteLinkRef = {
          sourceNoteId: note.id,
          targetTitle,
          targetNoteId: targetId,
          contextSnippet: snippetAround(text, match.index),
        }
        refs.push(ref)
        if (targetId) {
          const incomingArr = incoming.get(targetId) ?? []
          incomingArr.push(ref)
          incoming.set(targetId, incomingArr)
        }
      }
      if (refs.length > 0) outgoing.set(note.id, refs)
    }

    return { outgoing, incoming, brokenCount }
  }, [notes, contentByNoteId])
}
