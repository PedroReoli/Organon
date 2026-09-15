/**
 * VariableForm — editor das variaveis declaradas de um dialog.
 *
 * Lista cada PlaybookVariable como uma linha com label + tipo + required.
 * Botao adicionar cria variavel em branco. Botao remover apaga.
 * Usado dentro de DialogFormModal (upgrade 15).
 */

import React from 'react'
import type { PlaybookVariable, PlaybookVariableType } from '@types'
import { Button, Input } from '@shared/components/primitives'
import { VARIABLE_TYPE_LABELS, VARIABLE_TYPE_OPTIONS } from './variableUtils'

interface VariableFormProps {
  variables: PlaybookVariable[]
  onChange: (next: PlaybookVariable[]) => void
}

function createEmptyVariable(): PlaybookVariable {
  return {
    key: '',
    label: '',
    type: 'text',
    required: false,
  }
}

function updateAt<T>(list: T[], index: number, updates: Partial<T>): T[] {
  const copy = [...list]
  copy[index] = { ...copy[index], ...updates }
  return copy
}

export const VariableForm: React.FC<VariableFormProps> = ({
  variables,
  onChange,
}) => {
  const handleAdd = () => {
    onChange([...variables, createEmptyVariable()])
  }

  const handleRemove = (index: number) => {
    onChange(variables.filter((_, i) => i !== index))
  }

  const handleUpdate = (index: number, updates: Partial<PlaybookVariable>) => {
    onChange(updateAt(variables, index, updates))
  }

  return (
    <div className="playbook-variable-form">
      <header className="playbook-variable-form-header">
        <span>Variaveis</span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleAdd}
        >
          + Adicionar
        </Button>
      </header>

      {variables.length === 0 ? (
        <p className="playbook-variable-form-empty">
          Nenhuma variavel. Use <code>{'{chave}'}</code> no texto e clique em
          Adicionar para definir o tipo.
        </p>
      ) : (
        <div className="playbook-variable-form-list">
          {variables.map((variable, index) => (
            <div key={index} className="playbook-variable-form-row">
              <div className="playbook-variable-form-row-main">
                <Input
                  type="text"
                  value={variable.key}
                  onChange={(e) =>
                    handleUpdate(index, {
                      key: e.target.value.replace(/[^a-zA-Z0-9_]/g, ''),
                    })
                  }
                  placeholder="chave"
                  aria-label="Chave da variavel"
                />
                <Input
                  type="text"
                  value={variable.label}
                  onChange={(e) =>
                    handleUpdate(index, { label: e.target.value })
                  }
                  placeholder="Label"
                  aria-label="Label da variavel"
                />
                <select
                  className="form-input"
                  value={variable.type}
                  onChange={(e) =>
                    handleUpdate(index, {
                      type: e.target.value as PlaybookVariableType,
                    })
                  }
                >
                  {VARIABLE_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {VARIABLE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
                <label className="playbook-variable-form-required">
                  <input
                    type="checkbox"
                    checked={variable.required ?? false}
                    onChange={(e) =>
                      handleUpdate(index, { required: e.target.checked })
                    }
                  />
                  <span>Obrig.</span>
                </label>
                <button
                  type="button"
                  className="playbook-icon-btn playbook-icon-btn-danger"
                  onClick={() => handleRemove(index)}
                  title="Remover variavel"
                  aria-label="Remover variavel"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    width="14"
                    height="14"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {variable.type === 'choice' && (
                <div className="playbook-variable-form-choices">
                  <Input
                    type="text"
                    value={(variable.choices ?? []).join(', ')}
                    onChange={(e) =>
                      handleUpdate(index, {
                        choices: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter((s) => s.length > 0),
                      })
                    }
                    placeholder="opcao1, opcao2, opcao3"
                    aria-label="Opcoes de escolha"
                    fullWidth
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
