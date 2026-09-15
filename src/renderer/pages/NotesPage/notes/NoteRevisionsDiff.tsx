/**
 * NoteRevisionsDiff — diff visual line-by-line de revisoes de uma nota.
 *
 * Algoritmo simples: separa as duas versoes em linhas, marca linhas adicionadas
 * (verde), removidas (vermelho), iguais (cinza). Suficiente pra lidar com diff
 * de notas pequenas/medias sem dep externa.
 *
 * Upgrade 10a.
 */

import React, { useMemo, useState } from 'react'
import { Button } from '@shared/components/primitives'

export interface NoteRevision {
  id: string
  /** Conteudo HTML completo da revisao. */
  content: string
  /** Timestamp ISO da revisao. */
  createdAt: string
}

interface NoteRevisionsDiffProps {
  revisions: NoteRevision[]
  currentContent: string
  onClose: () => void
  onRestore: (revisionId: string) => void
}

interface DiffLine {
  type: 'add' | 'remove' | 'equal'
  text: string
}

function htmlToPlainLines(html: string): string[] {
  if (typeof DOMParser === 'undefined') return html.split('\n')
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    // Pega so o texto, separando blocos por newline
    const blocks: string[] = []
    doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li').forEach((el) => {
      const text = (el.textContent ?? '').trim()
      if (text) blocks.push(text)
    })
    return blocks
  } catch {
    return html.split('\n')
  }
}

/** LCS-based line diff (simples, O(n*m)). Suficiente para notas. */
function diffLines(a: string[], b: string[]): DiffLine[] {
  const m = a.length
  const n = b.length
  // Build LCS table
  const lcs: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) lcs[i][j] = lcs[i + 1][j + 1] + 1
      else lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }
  // Walk
  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ type: 'equal', text: a[i] })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ type: 'remove', text: a[i] })
      i++
    } else {
      out.push({ type: 'add', text: b[j] })
      j++
    }
  }
  while (i < m) { out.push({ type: 'remove', text: a[i++] }) }
  while (j < n) { out.push({ type: 'add', text: b[j++] }) }
  return out
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export const NoteRevisionsDiff: React.FC<NoteRevisionsDiffProps> = ({
  revisions,
  currentContent,
  onClose,
  onRestore,
}) => {
  const sortedRevisions = useMemo(
    () => [...revisions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [revisions],
  )
  const [selectedId, setSelectedId] = useState<string | null>(sortedRevisions[0]?.id ?? null)
  const [confirmRestore, setConfirmRestore] = useState(false)

  const selected = sortedRevisions.find((r) => r.id === selectedId)
  const diff = useMemo(() => {
    if (!selected) return []
    const oldLines = htmlToPlainLines(selected.content)
    const newLines = htmlToPlainLines(currentContent)
    return diffLines(oldLines, newLines)
  }, [selected, currentContent])

  const stats = useMemo(() => {
    const adds = diff.filter((d) => d.type === 'add').length
    const removes = diff.filter((d) => d.type === 'remove').length
    return { adds, removes }
  }, [diff])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal notes-revisions-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Histórico de revisões</h2>
          <button type="button" className="modal-close-btn" onClick={onClose}>&times;</button>
        </header>

        <div className="notes-revisions-body">
          <aside className="notes-revisions-list">
            {sortedRevisions.length === 0 ? (
              <p className="notes-revisions-empty">Sem revisões salvas.</p>
            ) : (
              <ul>
                {sortedRevisions.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className={selectedId === r.id ? 'is-active' : ''}
                      onClick={() => { setSelectedId(r.id); setConfirmRestore(false) }}
                    >
                      {formatDate(r.createdAt)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <div className="notes-revisions-diff">
            {!selected ? (
              <p className="notes-revisions-empty">Selecione uma revisão.</p>
            ) : (
              <>
                <div className="notes-revisions-stats">
                  <span className="diff-add">+{stats.adds}</span>
                  <span className="diff-remove">−{stats.removes}</span>
                  <span style={{ flex: 1 }} />
                  {confirmRestore ? (
                    <>
                      <span className="notes-revisions-confirm">Restaurar?</span>
                      <Button size="sm" variant="danger" onClick={() => { onRestore(selected.id); setConfirmRestore(false) }}>
                        Sim
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmRestore(false)}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="primary" onClick={() => setConfirmRestore(true)}>
                      Restaurar esta versão
                    </Button>
                  )}
                </div>
                <div className="notes-revisions-diff-content">
                  {diff.map((line, idx) => (
                    <div key={idx} className={`diff-line diff-line-${line.type}`}>
                      <span className="diff-line-marker">
                        {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' '}
                      </span>
                      <span className="diff-line-text">{line.text}</span>
                    </div>
                  ))}
                  {diff.length === 0 && <p className="notes-revisions-empty">Sem mudanças.</p>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
