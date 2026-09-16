import { RE_MARKDOWN_PASTE_BLOCK, RE_MARKDOWN_PASTE_INLINE } from './constants'

export function looksLikeMarkdownPaste(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (/^(https?|ftp):\/\/\S+$/i.test(trimmed)) return false
  if (RE_MARKDOWN_PASTE_BLOCK.test(trimmed)) return true
  return RE_MARKDOWN_PASTE_INLINE.test(trimmed)
}

export function sanitizePastedHtml(rawHtml: string): string {
  try {
    const doc = new DOMParser().parseFromString(rawHtml, 'text/html')

    doc.querySelectorAll('script,style,meta,link,title,xml').forEach((el) => el.remove())

    doc.querySelectorAll('*').forEach((el) => {
      if (el.tagName.includes(':')) el.remove()
    })

    const commentWalker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT)
    const comments: Comment[] = []
    while (commentWalker.nextNode()) comments.push(commentWalker.currentNode as Comment)
    for (const c of comments) c.remove()

    doc.querySelectorAll('font').forEach((fontEl) => {
      const parent = fontEl.parentNode
      if (!parent) return
      while (fontEl.firstChild) parent.insertBefore(fontEl.firstChild, fontEl)
      parent.removeChild(fontEl)
    })

    const ALLOWED_ATTRS: Record<string, string[]> = {
      A: ['href', 'target', 'rel'],
      IMG: ['src', 'alt', 'width', 'height'],
      TD: ['colspan', 'rowspan'],
      TH: ['colspan', 'rowspan'],
    }

    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT)
    const toUnwrap: Element[] = []
    const toRemove: Element[] = []

    while (walker.nextNode()) {
      const el = walker.currentNode as Element

      const allowed = ALLOWED_ATTRS[el.tagName] ?? []
      const attrNames = Array.from(el.attributes).map(a => a.name)
      for (const name of attrNames) {
        if (!allowed.includes(name)) el.removeAttribute(name)
      }

      if (el.tagName === 'SPAN') {
        const hasAttrs = el.attributes.length > 0
        const text = (el.textContent ?? '').replace(/ /g, ' ').trim()
        const hasChildren = el.children.length > 0

        if (!hasAttrs && !hasChildren && !text) {
          toRemove.push(el)
          continue
        }

        if (!hasAttrs) {
          toUnwrap.push(el)
        }
      }

      if (el.tagName === 'DIV' && el.attributes.length === 0 && el.parentElement?.tagName !== 'BODY') {
        toUnwrap.push(el)
      }
    }

    for (const el of toRemove) el.remove()
    for (const el of toUnwrap) {
      const parent = el.parentNode
      if (!parent) continue
      while (el.firstChild) parent.insertBefore(el.firstChild, el)
      parent.removeChild(el)
    }

    Array.from(doc.body.children).forEach((child) => {
      if (child.tagName === 'DIV') {
        const p = doc.createElement('p')
        while (child.firstChild) p.appendChild(child.firstChild)
        child.replaceWith(p)
      }
    })

    doc.querySelectorAll('p > br:last-child, li > br:last-child').forEach((br) => {
      const parent = br.parentElement
      if (!parent) return
      if (parent.childNodes.length > 1) br.remove()
    })

    Array.from(doc.body.childNodes).forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'BR') {
        node.remove()
      }
    })

    const children = Array.from(doc.body.children)
    let prevEmpty = false
    for (const child of children) {
      const text = (child.textContent ?? '').replace(/ /g, ' ').trim()
      const isEmpty = child.tagName === 'P' && !text && !child.querySelector('img')
      if (isEmpty && prevEmpty) {
        child.remove()
      }
      prevEmpty = isEmpty
    }

    return doc.body.innerHTML
  } catch {
    return rawHtml
  }
}

/**
 * Detects whether plain text looks like TSV (tab-separated, Excel/Google Sheets)
 * or CSV data with multiple rows and columns.
 */
export function looksLikeTabularData(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed || !trimmed.includes('\n')) return false
  const lines = trimmed.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) return false

  // Check if at least 2 lines contain tabs
  const tabLines = lines.filter(l => l.includes('\t'))
  if (tabLines.length >= 2) return true

  // Check if lines have consistent comma separation (at least 2 columns)
  const firstCommaCount = (lines[0].match(/,/g) || []).length
  if (firstCommaCount >= 1) {
    const consistentCommas = lines.slice(1, 5).every(l => (l.match(/,/g) || []).length === firstCommaCount)
    if (consistentCommas) return true
  }

  return false
}

/**
 * Converts TSV / CSV text from Excel or Google Sheets into a clean HTML <table> string
 */
export function tabularTextToHtmlTable(text: string): string {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length === 0) return ''

  const isTsv = lines.some(l => l.includes('\t'))

  const rows = lines.map(line => {
    if (isTsv) {
      return line.split('\t').map(cell => cell.trim())
    }
    // Simple CSV parser supporting quotes
    const pattern = /(?:^|,)(?:"([^"]*)"|([^",]*))/g
    const cells: string[] = []
    let match: RegExpExecArray | null
    while ((match = pattern.exec(line)) !== null) {
      cells.push((match[1] || match[2] || '').trim())
    }
    return cells
  })

  let html = '<table><tbody>'
  rows.forEach((row, rowIdx) => {
    html += '<tr>'
    const isHeader = rowIdx === 0
    row.forEach(cell => {
      const tag = isHeader ? 'th' : 'td'
      const escaped = cell
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      html += `<${tag}><p>${escaped || '&nbsp;'}</p></${tag}>`
    })
    html += '</tr>'
  })
  html += '</tbody></table>'

  return html
}

