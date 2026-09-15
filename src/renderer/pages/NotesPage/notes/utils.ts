import type { TreeItemKind, TreeItemKey } from '@types'

export const noteTreeKey  = (id: string): TreeItemKey => `note:${id}`
export const folderTreeKey = (id: string): TreeItemKey => `folder:${id}`
export const folderContentPath = (folderId: string): string => `folders/${folderId}.md`

export const parseTreeKey = (key: TreeItemKey): { kind: TreeItemKind; id: string } | null => {
  if (key.startsWith('note:'))   return { kind: 'note',   id: key.slice(5) }
  if (key.startsWith('folder:')) return { kind: 'folder', id: key.slice(7) }
  return null
}

export const markdownToHtml = (md: string): string => {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let inCode = false, codeBuf: string[] = [], listMode: 'ul' | 'ol' | null = null

  const flushList = () => {
    if (!listMode) return
    out.push(listMode === 'ul' ? '</ul>' : '</ol>')
    listMode = null
  }
  const flushCode = () => {
    out.push(`<pre><code>${codeBuf.join('\n').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`)
    inCode = false; codeBuf = []
  }
  const inline = (s: string) => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')

  let prevBlank = false
  for (const line of lines) {
    if (line.trim().startsWith('```')) { flushList(); prevBlank = false; if (inCode) flushCode(); else { inCode = true; codeBuf = [] }; continue }
    if (inCode) { codeBuf.push(line); continue }
    if (!line.trim()) {
      if (!prevBlank) { flushList(); out.push('<p><br></p>') }
      prevBlank = true
      continue
    }
    prevBlank = false
    if (/^###\s+/.test(line)) { flushList(); out.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`); continue }
    if (/^##\s+/.test(line))  { flushList(); out.push(`<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`); continue }
    if (/^#\s+/.test(line))   { flushList(); out.push(`<h1>${inline(line.replace(/^#\s+/, ''))}</h1>`); continue }
    if (/^>\s+/.test(line))   { flushList(); out.push(`<blockquote><p>${inline(line.slice(2))}</p></blockquote>`); continue }
    const ol = line.match(/^(\d+)\.\s+(.*)$/)
    if (ol) {
      if (listMode !== 'ol') { flushList(); out.push('<ol>'); listMode = 'ol' }
      out.push(`<li>${inline(ol[2] ?? '')}</li>`); continue
    }
    if (/^[-*]\s+/.test(line)) {
      if (listMode !== 'ul') { flushList(); out.push('<ul>'); listMode = 'ul' }
      out.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`); continue
    }
    if (/^---+$/.test(line.trim())) { flushList(); out.push('<hr/>'); continue }
    flushList(); out.push(`<p>${inline(line)}</p>`)
  }
  if (inCode) flushCode()
  flushList()
  return out.join('') || '<p><br></p>'
}
