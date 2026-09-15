/**
 * VariableChips — lista de variaveis declaradas como chips clicaveis.
 *
 * Usado no editor de dialog para o usuario inserir `{chave}` sem digitar.
 * Clique no chip chama `onInsert(chave)` passado pelo parent (que injeta
 * no WYSIWYG editor atual).
 *
 * Upgrade 15.
 */

import React from 'react'
import type { PlaybookVariable } from '@types'
import { VARIABLE_TYPE_LABELS } from './variableUtils'

interface VariableChipsProps {
  variables: PlaybookVariable[]
  onInsert: (key: string) => void
}

export const VariableChips: React.FC<VariableChipsProps> = ({
  variables,
  onInsert,
}) => {
  if (variables.length === 0) return null

  return (
    <div className="playbook-variable-chips">
      <span className="playbook-variable-chips-label">Inserir variavel:</span>
      <div className="playbook-variable-chips-list">
        {variables.map((v) => (
          <button
            key={v.key || v.label}
            type="button"
            className="playbook-variable-chip"
            onClick={() => v.key && onInsert(v.key)}
            disabled={!v.key}
            title={`${v.label || v.key} (${VARIABLE_TYPE_LABELS[v.type]})${v.required ? ' \u2022 obrigatoria' : ''}`}
          >
            <span className="playbook-variable-chip-key">
              {v.key ? `{${v.key}}` : '(sem chave)'}
            </span>
            {v.label && v.label !== v.key && (
              <span className="playbook-variable-chip-label">{v.label}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
