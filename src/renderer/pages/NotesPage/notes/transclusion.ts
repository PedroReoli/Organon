/**
 * transclusion — helpers para sintaxe ![[Nome da Nota]] e ![[Nome#Secao]].
 *
 * Faz parse de matches no texto, resolve para noteId, extrai secao por
 * heading title (primeira ocorrencia case-insensitive).
 *
 * Renderizacao: pos-processamento do HTML para substituir os tokens
 * por blocos visuais. Read-only por design.
 *
 * Upgrade 10d.
 */

import type { Note } from '@types'

const TRANSCLUSION_RE = /!\[\[([^\]]+)\]\]/g

export interface TransclusionRef {
  fullToken: string
  targetTitle: string
  /** Heading especifico (apos #), se presente. */
  section?: string
}

export function findTransclusions(text: string): TransclusionRef[] {
  const refs: TransclusionRef[] = []
  let match: RegExpExecArray | null
  const re = new RegExp(TRANSCLUSION_RE.source, 'g')
  while ((match = re.exec(text)) !== null) {
    const inner = match[1].trim()
    const [titlePart, sectionPart] = inner.split('#')
    refs.push({
      fullToken: match[0],
      targetTitle: titlePart.trim(),
      section: sectionPart?.trim(),
    })
  }
  return refs
}

/** Busca uma nota pelo titulo case-insensitive (primeira match). */
export function resolveNoteByTitle(notes: Note[], title: string): Note | null {
  const lower = title.toLowerCase().trim()
  return notes.find((n) => !n.deletedAt && n.title.toLowerCase().trim() === lower) ?? null
}

/** Extrai o conteudo HTML de uma secao especifica (a partir do heading match). */
export function extractSection(html: string, section: string): string {
  if (typeof DOMParser === 'undefined') return html
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const headings = Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6'))
    const sectionLower = section.toLowerCase().trim()
    const startIdx = headings.findIndex((h) => (h.textContent ?? '').toLowerCase().trim() === sectionLower)
    if (startIdx === -1) return ''
    const startEl = headings[startIdx]
    const startLevel = Number(startEl.tagName.slice(1))
    // Coleta nos seguintes ate o proximo heading do mesmo ou maior nivel
    const collected: Element[] = [startEl]
    let cur: Element | null = startEl.nextElementSibling
    while (cur) {
      const tag = cur.tagName
      if (tag.match(/^H[1-6]$/)) {
        const lvl = Number(tag.slice(1))
        if (lvl <= startLevel) break
      }
      collected.push(cur)
      cur = cur.nextElementSibling
    }
    return collected.map((el) => el.outerHTML).join('')
  } catch {
    return html
  }
}

/**
 * Pos-processa HTML substituindo `![[Nome]]` ou `![[Nome#Secao]]` por blocos
 * visuais com o conteudo embutido. Receptor read-only.
 *
 * Mantem `![[broken]]` como token nao-resolvido com classe broken.
 */
export function applyTransclusions(
  html: string,
  notes: Note[],
  contentByNoteId: Record<string, string>,
): string {
  return html.replace(TRANSCLUSION_RE, (full, inner: string) => {
    const trimmed = inner.trim()
    const [titlePart, sectionPart] = trimmed.split('#')
    const target = resolveNoteByTitle(notes, titlePart.trim())
    if (!target) {
      return `<div class="note-transclusion is-broken">Transclusão não resolvida: ${escapeHtml(full)}</div>`
    }
    const sourceHtml = contentByNoteId[target.id]
    if (!sourceHtml) {
      // Conteudo nao carregado — placeholder com link
      return `<div class="note-transclusion">
        <div class="note-transclusion-header">De: ${escapeHtml(target.title)}${sectionPart ? ` · ${escapeHtml(sectionPart)}` : ''}</div>
        <div class="note-transclusion-body">(conteúdo carregado dinamicamente)</div>
      </div>`
    }
    const finalHtml = sectionPart ? extractSection(sourceHtml, sectionPart.trim()) : sourceHtml
    return `<div class="note-transclusion">
      <div class="note-transclusion-header">De: ${escapeHtml(target.title)}${sectionPart ? ` · ${escapeHtml(sectionPart)}` : ''}</div>
      <div class="note-transclusion-body">${finalHtml || '<em>(seção vazia)</em>'}</div>
    </div>`
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
