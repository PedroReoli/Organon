const EMOJI_REGEX = /^(\p{Extended_Pictographic}|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF]|\u2600-\u26FF|\u2700-\u27BF)\s*/u

export function extractEmoji(title: string): { emoji: string | null; cleanTitle: string } {
  if (!title) return { emoji: null, cleanTitle: '' }
  const match = title.match(EMOJI_REGEX)
  if (match) {
    const emoji = match[0].trim()
    const cleanTitle = title.slice(match[0].length).trim()
    return { emoji, cleanTitle: cleanTitle || title }
  }
  return { emoji: null, cleanTitle: title }
}
