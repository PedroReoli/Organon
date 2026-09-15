/**
 * VariableInputForm — form de preenchimento de variaveis no preview.
 *
 * Renderiza um input apropriado por tipo (text, number, date, choice,
 * email, phone, cpf), valida on-the-fly, e expoe os valores + bold map
 * para o parent substituir no texto.
 *
 * Upgrade 15.
 */

import React from 'react'
import type { PlaybookVariable } from '@types'
import { Input } from '@shared/components/primitives'
import { validateVariableValue } from './variableUtils'

interface VariableInputFormProps {
  variables: PlaybookVariable[]
  values: Record<string, string>
  bold: Record<string, boolean>
  onChangeValue: (key: string, value: string) => void
  onToggleBold: (key: string) => void
}

export const VariableInputForm: React.FC<VariableInputFormProps> = ({
  variables,
  values,
  bold,
  onChangeValue,
  onToggleBold,
}) => {
  if (variables.length === 0) return null

  return (
    <div className="playbook-variable-input-form playbook-variables-grid">
      {variables.map((variable) => {
        const value = values[variable.key] ?? ''
        const error = validateVariableValue(variable, value)
        const inputId = `var-input-${variable.key}`

        return (
          <div
            key={variable.key}
            className={`playbook-variable-input-field ${error && value ? 'has-error' : ''}`}
          >
            <label htmlFor={inputId}>
              <span className="playbook-variable-input-label">
                {variable.label || variable.key}
                {variable.required && (
                  <span className="playbook-variable-input-required">*</span>
                )}
              </span>
              <span className="playbook-variable-input-key">{`{${variable.key}}`}</span>
            </label>

            <div className="playbook-variable-input-row">
              {variable.type === 'choice' && variable.choices && variable.choices.length > 0 ? (
                <select
                  id={inputId}
                  className="form-input"
                  value={value}
                  onChange={(e) => onChangeValue(variable.key, e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {variable.choices.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={inputId}
                  type={
                    variable.type === 'number'
                      ? 'number'
                      : variable.type === 'date'
                        ? 'date'
                        : variable.type === 'email'
                          ? 'email'
                          : 'text'
                  }
                  value={value}
                  onChange={(e) => onChangeValue(variable.key, e.target.value)}
                  placeholder={
                    variable.defaultValue ??
                    `Digite ${variable.label || variable.key}`
                  }
                  fullWidth
                />
              )}

              <button
                type="button"
                className={`playbook-bold-toggle ${bold[variable.key] ? 'is-active' : ''}`}
                onClick={() => onToggleBold(variable.key)}
                title="Aplicar negrito nesta variavel"
                aria-label={`Negrito para ${variable.key}`}
              >
                B
              </button>
            </div>

            {error && value && (
              <span className="playbook-variable-input-error">{error}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
