/**
 * Helper especializado para converter texto Markdown colado em HTML semântico compatível
 * com as extensões do Tiptap (TaskList, Table, CodeBlock, Typography, etc.).
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function parseInlineMarkdown(text: string): string {
  let result = escapeHtml(text)

  // Code inline: `code`
  result = result.replace(/`([^`\n]+)`/g, '<code>$1</code>')

  // Bold + Italic: ***text***
  result = result.replace(/\*\*\*([^*\n]+)\*\*\*/g, '<strong><em>$1</em></strong>')

  // Bold: **text** or __text__
  result = result.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/__([^_\n]+)__/g, '<strong>$1</strong>')

  // Strikethrough: ~~text~~
  result = result.replace(/~~([^~\n]+)~~/g, '<s>$1</s>')

  // Italic: *text* or _text_
  result = result.replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
  result = result.replace(/(^|\s)_([^_\n]+)_(\s|$)/g, '$1<em>$2</em>$3')

  // Links: [label](url)
  result = result.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2">$1</a>')

  return result
}

function parseTableBlock(tableLines: string[]): string {
  if (tableLines.length < 2) return ''

  const parseRow = (line: string): string[] => {
    let clean = line.trim()
    if (clean.startsWith('|')) clean = clean.slice(1)
    if (clean.endsWith('|')) clean = clean.slice(0, -1)
    return clean.split('|').map(c => c.trim())
  }

  const headerCells = parseRow(tableLines[0])
  const isSeparator = /^[\s|:-]+$/.test(tableLines[1])
  const startIndex = isSeparator ? 2 : 1

  let html = '<table><thead><tr>'
  for (const h of headerCells) {
    html += `<th><p>${parseInlineMarkdown(h)}</p></th>`
  }
  html += '</tr></thead><tbody>'

  for (let i = startIndex; i < tableLines.length; i++) {
    const cells = parseRow(tableLines[i])
    if (cells.length === 0 || (cells.length === 1 && !cells[0])) continue
    html += '<tr>'
    for (let c = 0; c < headerCells.length; c++) {
      const cellText = cells[c] ?? ''
      html += `<td><p>${parseInlineMarkdown(cellText)}</p></td>`
    }
    html += '</tr>'
  }
  html += '</tbody></table>'
  return html
}

export function advancedMarkdownToHtml(md: string): string {
  const rawLines = md.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []

  type Mode = 'none' | 'ul' | 'ol' | 'task' | 'code' | 'table'
  let currentMode: Mode = 'none'
  let codeBuffer: string[] = []
  let codeLang = ''
  let tableBuffer: string[] = []

  const closeCurrentMode = () => {
    if (currentMode === 'ul') {
      out.push('</ul>')
    } else if (currentMode === 'ol') {
      out.push('</ol>')
    } else if (currentMode === 'task') {
      out.push('</ul>')
    } else if (currentMode === 'code') {
      const codeEscaped = escapeHtml(codeBuffer.join('\n'))
      const langClass = codeLang ? ` class="language-${escapeHtml(codeLang)}"` : ''
      out.push(`<pre><code${langClass}>${codeEscaped}</code></pre>`)
      codeBuffer = []
      codeLang = ''
    } else if (currentMode === 'table') {
      out.push(parseTableBlock(tableBuffer))
      tableBuffer = []
    }
    currentMode = 'none'
  }

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]
    const trimmed = line.trim()

    // Code fences
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      if (currentMode === 'code') {
        closeCurrentMode()
      } else {
        closeCurrentMode()
        currentMode = 'code'
        codeLang = trimmed.slice(3).trim()
        codeBuffer = []
      }
      continue
    }

    if (currentMode === 'code') {
      codeBuffer.push(line)
      continue
    }

    // Markdown Table lines
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      if (currentMode !== 'table') {
        closeCurrentMode()
        currentMode = 'table'
        tableBuffer = []
      }
      tableBuffer.push(trimmed)
      continue
    } else if (currentMode === 'table') {
      closeCurrentMode()
    }

    // Empty lines
    if (!trimmed) {
      closeCurrentMode()
      out.push('<p><br></p>')
      continue
    }

    // Headings # through ######
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      closeCurrentMode()
      const level = Math.min(3, headingMatch[1].length) // Tiptap editor configured for h1-h3
      const text = parseInlineMarkdown(headingMatch[2])
      out.push(`<h${level}>${text}</h${level}>`)
      continue
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      closeCurrentMode()
      const quoteText = line.replace(/^>\s?/, '')
      out.push(`<blockquote><p>${parseInlineMarkdown(quoteText)}</p></blockquote>`)
      continue
    }

    // Horizontal Rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      closeCurrentMode()
      out.push('<hr/>')
      continue
    }

    // Task list items: - [ ] or - [x] or * [ ] or * [x]
    const taskMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/)
    if (taskMatch) {
      if (currentMode !== 'task') {
        closeCurrentMode()
        currentMode = 'task'
        out.push('<ul data-type="taskList">')
      }
      const checked = taskMatch[1].toLowerCase() === 'x'
      const itemText = parseInlineMarkdown(taskMatch[2])
      out.push(
        `<li data-type="taskItem" data-checked="${checked}"><label><input type="checkbox" ${checked ? 'checked="checked"' : ''}><span></span></label><div><p>${itemText}</p></div></li>`
      )
      continue
    }

    // Unordered list: - item or * item
    const ulMatch = line.match(/^[-*+]\s+(.*)$/)
    if (ulMatch) {
      if (currentMode !== 'ul') {
        closeCurrentMode()
        currentMode = 'ul'
        out.push('<ul>')
      }
      out.push(`<li><p>${parseInlineMarkdown(ulMatch[1])}</p></li>`)
      continue
    }

    // Ordered list: 1. item
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/)
    if (olMatch) {
      if (currentMode !== 'ol') {
        closeCurrentMode()
        currentMode = 'ol'
        out.push('<ol>')
      }
      out.push(`<li><p>${parseInlineMarkdown(olMatch[2])}</p></li>`)
      continue
    }

    // Standard paragraph
    closeCurrentMode()
    out.push(`<p>${parseInlineMarkdown(line)}</p>`)
  }

  closeCurrentMode()

  const finalHtml = out.join('')
  return finalHtml || '<p><br></p>'
}
