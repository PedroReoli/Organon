export const PRESET_COLORS = [
  '#000000', '#434343', '#666666', '#999999',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  'var(--color-primary)', 'var(--color-primary)', 'var(--color-primary)', 'var(--color-primary)',
]

export const RE_MARKDOWN_PASTE_BLOCK = /^(#{1,6}\s|>\s|[-*+]\s|\d+\.\s|- \[[ xX]\]\s|```|~~~|\|.+\|)/m
export const RE_MARKDOWN_PASTE_INLINE = /(\[[^\]]+\]\((?:https?:\/\/|mailto:)[^)]+\)|\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`)/
