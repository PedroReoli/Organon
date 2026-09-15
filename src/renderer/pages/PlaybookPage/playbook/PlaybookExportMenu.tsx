/**
 * PlaybookExportMenu — menu com opcoes de export do playbook.
 *
 * JSON: serializa tudo (re-importavel em outro Organon, sem versoes nem
 * analytics para manter o arquivo leve).
 * Markdown: versao humana para leitura/compartilhamento, remove HTML tags.
 *
 * Upgrade 15.
 */

import React, { useState } from 'react'
import type { Playbook } from '@types'

interface PlaybookExportMenuProps {
  playbook: Playbook
}

function stripHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

function sanitizeFilename(s: string): string {
  return s.replace(/[^\w\-]+/g, '_').slice(0, 80) || 'playbook'
}

function downloadBlob(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function playbookToJson(playbook: Playbook): string {
  const slim = {
    version: 1,
    exportedAt: new Date().toISOString(),
    playbook: {
      title: playbook.title,
      sector: playbook.sector,
      category: playbook.category,
      summary: playbook.summary,
      content: playbook.content,
      dialogs: playbook.dialogs.map((d) => ({
        title: d.title,
        text: d.text,
        variables: d.variables ?? [],
      })),
    },
  }
  return JSON.stringify(slim, null, 2)
}

function playbookToMarkdown(playbook: Playbook): string {
  const lines: string[] = []
  lines.push(`# ${playbook.title}`)
  lines.push('')
  lines.push(`**Setor:** ${playbook.sector}  `)
  lines.push(`**Categoria:** ${playbook.category}`)
  if (playbook.summary) {
    lines.push('')
    lines.push(`> ${playbook.summary}`)
  }
  lines.push('')

  if (playbook.content) {
    lines.push('## Descricao')
    lines.push('')
    lines.push(stripHtml(playbook.content))
    lines.push('')
  }

  if (playbook.dialogs.length > 0) {
    lines.push('## Dialogs')
    lines.push('')
    playbook.dialogs.forEach((dialog, index) => {
      lines.push(`### ${index + 1}. ${dialog.title || `Dialogo ${index + 1}`}`)
      lines.push('')
      lines.push(stripHtml(dialog.text))
      lines.push('')
      if (dialog.variables && dialog.variables.length > 0) {
        lines.push('**Variaveis:**')
        dialog.variables.forEach((v) => {
          const required = v.required ? ' _(obrig.)_' : ''
          lines.push(`- \`{${v.key}}\` — ${v.label || v.key} (${v.type})${required}`)
        })
        lines.push('')
      }
    })
  }

  return lines.join('\n')
}

export const PlaybookExportMenu: React.FC<PlaybookExportMenuProps> = ({
  playbook,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleExportJson = () => {
    const content = playbookToJson(playbook)
    downloadBlob(
      `${sanitizeFilename(playbook.title)}.playbook.json`,
      content,
      'application/json',
    )
    setIsOpen(false)
  }

  const handleExportMarkdown = () => {
    const content = playbookToMarkdown(playbook)
    downloadBlob(
      `${sanitizeFilename(playbook.title)}.md`,
      content,
      'text/markdown',
    )
    setIsOpen(false)
  }

  return (
    <div className="playbook-export-menu-wrapper" data-no-dnd>
      <button
        type="button"
        className="playbook-icon-btn"
        onClick={() => setIsOpen((v) => !v)}
        title="Exportar playbook"
        aria-label="Exportar playbook"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          width="16"
          height="16"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="playbook-export-menu-backdrop"
            onClick={() => setIsOpen(false)}
          />
          <div className="playbook-export-menu">
            <button
              type="button"
              className="playbook-export-menu-item"
              onClick={handleExportJson}
            >
              <strong>JSON</strong>
              <span>Para re-importar em outro Organon</span>
            </button>
            <button
              type="button"
              className="playbook-export-menu-item"
              onClick={handleExportMarkdown}
            >
              <strong>Markdown</strong>
              <span>Texto puro para leitura/compartilhamento</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
