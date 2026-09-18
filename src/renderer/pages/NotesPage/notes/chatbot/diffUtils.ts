import { DiffResult, DiffChange } from './chatbot.types'

const NOTE_SNIPPET_CHARS = 200

export function extractSnippet(content: string, query: string, maxChars: number = NOTE_SNIPPET_CHARS): string {
  const lowerContent = content.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const words = lowerQuery.split(/\s+/).filter(w => w.length > 2)
  let bestIndex = 0
  let bestScore = 0

  for (const word of words) {
    const idx = lowerContent.indexOf(word)
    if (idx !== -1 && idx > bestScore) {
      bestIndex = Math.max(0, idx - 100)
      bestScore = idx
    }
  }

  const start = bestIndex
  const end = Math.min(start + maxChars, content.length)
  let snippet = content.slice(start, end)
  if (start > 0) snippet = '...' + snippet
  if (end < content.length) snippet = snippet + '...'
  return snippet
}

export function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2))
  let intersection = 0
  for (const word of words1) {
    if (words2.has(word)) intersection++
  }
  const union = words1.size + words2.size - intersection
  return union > 0 ? intersection / union : 0
}

export function diffTexts(original: string, rewritten: string): DiffResult {
  const origWords = original.split(/\s+/)
  const rewWords = rewritten.split(/\s+/)
  const changes: DiffChange[] = []

  let i = 0
  let j = 0

  while (i < origWords.length || j < rewWords.length) {
    if (i < origWords.length && j < rewWords.length && origWords[i] === rewWords[j]) {
      changes.push({ type: 'equal', text: origWords[i] + ' ' })
      i++
      j++
    } else if (j < rewWords.length && (i >= origWords.length || !origWords.slice(i).includes(rewWords[j]))) {
      changes.push({ type: 'add', text: rewWords[j] + ' ' })
      j++
    } else if (i < origWords.length) {
      changes.push({ type: 'remove', text: origWords[i] + ' ' })
      i++
    }
  }

  return { original, rewritten, changes }
}
