/**
 * VersionItem — linha de uma versao no painel de historico.
 * Upgrade 15.
 */

import React from 'react'
import type { PlaybookVersion } from '@types'

interface VersionItemProps {
  version: PlaybookVersion
  index: number
  isLast: boolean
  onRestore: (versionId: string) => void
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export const VersionItem: React.FC<VersionItemProps> = ({
  version,
  index,
  isLast,
  onRestore,
}) => {
  const dialogCount = version.dialogs.length

  return (
    <div className={`playbook-version-item ${isLast ? 'is-oldest' : ''}`}>
      <div className="playbook-version-item-main">
        <strong>Versao {index + 1}</strong>
        <span className="playbook-version-item-date">
          {formatDateTime(version.createdAt)}
        </span>
        <span className="playbook-version-item-meta">
          {dialogCount} dialog{dialogCount === 1 ? '' : 's'}
        </span>
      </div>
      <button
        type="button"
        className="playbook-version-item-restore"
        onClick={() => onRestore(version.id)}
        title="Restaurar esta versao"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          width="14"
          height="14"
        >
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
        Restaurar
      </button>
    </div>
  )
}
