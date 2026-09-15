/**
 * NoteAutoSaveIndicator — indicador minimalista de status de salvamento.
 *
 * Estados: 'idle' | 'saving' | 'saved' | 'error'
 * - 'saving': mostra spinner sutil
 * - 'saved': mostra "Salvo há Xs" e fade out apos 3s (gerenciado externamente)
 * - 'error': mostra erro vermelho
 *
 * Upgrade 10d.
 */

import React from 'react'

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface NoteAutoSaveIndicatorProps {
  status: AutoSaveStatus
  lastSavedAt?: string | null
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 1000) return 'agora'
  if (diff < 60000) return `${Math.floor(diff / 1000)}s`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min`
  return `${Math.floor(diff / 3600000)}h`
}

export const NoteAutoSaveIndicator: React.FC<NoteAutoSaveIndicatorProps> = ({ status, lastSavedAt }) => {
  if (status === 'idle') return null
  return (
    <div className={`note-autosave-indicator is-${status}`}>
      {status === 'saving' && (
        <>
          <span className="note-autosave-spinner" />
          Salvando...
        </>
      )}
      {status === 'saved' && lastSavedAt && (
        <>
          <span className="note-autosave-check">✓</span>
          Salvo há {relativeTime(lastSavedAt)}
        </>
      )}
      {status === 'error' && (
        <>
          <span className="note-autosave-error">!</span>
          Erro ao salvar
        </>
      )}
    </div>
  )
}
