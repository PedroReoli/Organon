/**
 * Helpers puros para destacar termos de busca dentro de um texto.
 *
 * Independente de React — retorna segmentos que o consumidor renderiza
 * como quiser. Usado pelo resultado de useNotesFullTextSearch e por
 * buscas futuras (CRM, financial, etc).
 *
 * Definido no upgrade 10a (foundations).
 */

export interface HighlightSegment {
  text: string
  isMatch: boolean
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Divide `text` em segmentos marcando quais batem com algum termo de
 * `terms`. Matching case-insensitive e ignora diacriticos.
 */
export function highlightTerms(
  text: string,
  terms: string[],
): HighlightSegment[] {
  const normalizedTerms = terms
    .map((t) => normalize(t))
    .filter((t) => t.length > 0)
  if (normalizedTerms.length === 0) return [{ text, isMatch: false }]

  const textLower = normalize(text)
  const hits: Array<{ start: number; end: number }> = []

  for (const term of normalizedTerms) {
    let offset = 0
    while (offset < textLower.length) {
      const idx = textLower.indexOf(term, offset)
      if (idx < 0) break
      hits.push({ start: idx, end: idx + term.length })
      offset = idx + term.length
    }
  }

  if (hits.length === 0) return [{ text, isMatch: false }]

  hits.sort((a, b) => a.start - b.start)

  const merged: Array<{ start: number; end: number }> = []
  for (const hit of hits) {
    const last = merged[merged.length - 1]
    if (last && hit.start <= last.end) {
      last.end = Math.max(last.end, hit.end)
    } else {
      merged.push({ ...hit })
    }
  }

  const segments: HighlightSegment[] = []
  let cursor = 0
  for (const hit of merged) {
    if (hit.start > cursor) {
      segments.push({ text: text.slice(cursor, hit.start), isMatch: false })
    }
    segments.push({ text: text.slice(hit.start, hit.end), isMatch: true })
    cursor = hit.end
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), isMatch: false })
  }

  return segments
}

/**
 * Tokeniza uma query de usuario da mesma forma que useNotesFullTextSearch,
 * para uso com highlightTerms.
 */
export function tokenizeSearchQuery(query: string): string[] {
  return normalize(query)
    .split(/\s+/)
    .filter((t) => t.length > 0)
}
