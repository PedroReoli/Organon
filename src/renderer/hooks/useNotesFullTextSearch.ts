/**
 * Hook de busca full-text in-memory nas notas.
 *
 * Indexa titulo + conteudo por nota. Busca case-insensitive, multi-termo
 * (AND), com score simples (titulo vale mais que corpo, matches no inicio
 * valem mais). Sem dependencias externas (Fuse.js pode vir depois).
 *
 * Definido no upgrade 10a (foundations). Zero side effects.
 */

import { useMemo } from 'react'
import type { Note } from '../types'

export interface FullTextSearchResult {
  note: Note
  score: number
  /** Pequeno trecho do corpo onde o primeiro termo aparece. */
  snippet: string
  /** Indices [start, end] das posicoes dos termos no snippet (pra highlight). */
  matches: Array<{ start: number; end: number }>
}

interface IndexedNote {
  noteId: string
  titleLower: string
  bodyLower: string
  bodyOriginal: string
}

interface UseNotesFullTextSearchOptions {
  notes: Note[]
  /** Mapa noteId -> conteudo markdown (texto puro, sem frontmatter). */
  contentsByNoteId: Record<string, string>
  /** Query bruta do usuario. Vazio retorna []. */
  query: string
  /** Maximo de resultados. Default: 50. */
  limit?: number
  /** Ignora notas com deletedAt != null. Default: true. */
  excludeTrashed?: boolean
}

const SNIPPET_RADIUS = 60

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function tokenizeQuery(query: string): string[] {
  return normalize(query)
    .split(/\s+/)
    .filter((t) => t.length > 0)
}

function scoreNote(indexed: IndexedNote, terms: string[]): number {
  let score = 0
  for (const term of terms) {
    const titleIdx = indexed.titleLower.indexOf(term)
    if (titleIdx === 0) score += 20
    else if (titleIdx > 0) score += 10
    else if (indexed.bodyLower.includes(term)) score += 3
    else return 0 // AND: falta um termo = fora
  }
  return score
}

function buildSnippet(
  body: string,
  bodyLower: string,
  firstTerm: string,
): { snippet: string; matches: Array<{ start: number; end: number }> } {
  const idx = bodyLower.indexOf(firstTerm)
  if (idx < 0) return { snippet: body.slice(0, SNIPPET_RADIUS * 2), matches: [] }

  const start = Math.max(0, idx - SNIPPET_RADIUS)
  const end = Math.min(body.length, idx + firstTerm.length + SNIPPET_RADIUS)
  const snippet = body.slice(start, end)
  const matchStart = idx - start
  return {
    snippet: (start > 0 ? '…' : '') + snippet + (end < body.length ? '…' : ''),
    matches: [
      {
        start: matchStart + (start > 0 ? 1 : 0),
        end: matchStart + firstTerm.length + (start > 0 ? 1 : 0),
      },
    ],
  }
}

/**
 * Helper puro (exportado para testes e reuso em outros hooks).
 */
export function searchNotes(
  index: IndexedNote[],
  notesById: Record<string, Note>,
  query: string,
  limit: number,
): FullTextSearchResult[] {
  const terms = tokenizeQuery(query)
  if (terms.length === 0) return []

  const results: FullTextSearchResult[] = []

  for (const indexed of index) {
    const score = scoreNote(indexed, terms)
    if (score === 0) continue
    const note = notesById[indexed.noteId]
    if (!note) continue
    const { snippet, matches } = buildSnippet(
      indexed.bodyOriginal,
      indexed.bodyLower,
      terms[0],
    )
    results.push({ note, score, snippet, matches })
  }

  results.sort((a, b) => b.score - a.score)
  return results.slice(0, limit)
}

export function useNotesFullTextSearch(
  options: UseNotesFullTextSearchOptions,
): FullTextSearchResult[] {
  const {
    notes,
    contentsByNoteId,
    query,
    limit = 50,
    excludeTrashed = true,
  } = options

  const index = useMemo<IndexedNote[]>(() => {
    return notes
      .filter((n) => !excludeTrashed || !n.deletedAt)
      .map((n) => {
        const body = contentsByNoteId[n.id] ?? ''
        return {
          noteId: n.id,
          titleLower: normalize(n.title),
          bodyLower: normalize(body),
          bodyOriginal: body,
        }
      })
  }, [notes, contentsByNoteId, excludeTrashed])

  const notesById = useMemo(() => {
    const map: Record<string, Note> = {}
    for (const n of notes) map[n.id] = n
    return map
  }, [notes])

  return useMemo(
    () => searchNotes(index, notesById, query, limit),
    [index, notesById, query, limit],
  )
}
