/**
 * Helpers puros para trabalhar com PlaybookVariable.
 * Validacao, formatacao, mascaras, substituicao em texto.
 * Upgrade 15.
 */

import type { PlaybookVariable, PlaybookVariableType } from '@types'

export const VARIABLE_TYPE_LABELS: Record<PlaybookVariableType, string> = {
  text: 'Texto',
  number: 'Numero',
  date: 'Data',
  choice: 'Escolha',
  email: 'E-mail',
  phone: 'Telefone',
  cpf: 'CPF',
}

export const VARIABLE_TYPE_OPTIONS: PlaybookVariableType[] = [
  'text',
  'number',
  'date',
  'choice',
  'email',
  'phone',
  'cpf',
]

/**
 * Extrai todas as chaves `{chave}` do texto. Usado como fallback quando
 * o dialog nao tem `variables` definidas explicitamente (retrocompat).
 */
export function extractVariableKeys(text: string): string[] {
  const matches = text.match(/\{([a-zA-Z0-9_]+)\}/g) ?? []
  const unique = new Set(matches.map((m) => m.slice(1, -1)))
  return Array.from(unique)
}

/**
 * Merge entre as `variables` declaradas no dialog e as chaves extraidas
 * do texto. Garante que chaves novas apareçam no form mesmo sem update
 * da definicao, e que variaveis declaradas sem uso no texto tambem
 * apareçam (para poder remover).
 */
export function resolveDialogVariables(
  text: string,
  declared: PlaybookVariable[] | undefined,
): PlaybookVariable[] {
  const declaredMap = new Map<string, PlaybookVariable>()
  for (const v of declared ?? []) declaredMap.set(v.key, v)

  const keysInText = extractVariableKeys(text)
  const resolved: PlaybookVariable[] = []

  for (const key of keysInText) {
    const existing = declaredMap.get(key)
    if (existing) {
      resolved.push(existing)
      declaredMap.delete(key)
    } else {
      resolved.push({ key, label: key, type: 'text' })
    }
  }

  // Declaradas nao usadas no texto vao no final (user pode remover).
  for (const remaining of declaredMap.values()) resolved.push(remaining)

  return resolved
}

/**
 * Valida o valor preenchido pelo usuario conforme o tipo da variavel.
 * Retorna null se valido ou string com a mensagem de erro.
 */
export function validateVariableValue(
  variable: PlaybookVariable,
  rawValue: string,
): string | null {
  const value = rawValue.trim()

  if (!value) {
    return variable.required ? 'Campo obrigatorio' : null
  }

  switch (variable.type) {
    case 'number':
      if (!/^-?\d+([.,]\d+)?$/.test(value)) return 'Digite um numero valido'
      return null

    case 'date':
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Formato esperado: AAAA-MM-DD'
      return null

    case 'email':
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'E-mail invalido'
      return null

    case 'phone': {
      const digits = value.replace(/\D/g, '')
      if (digits.length < 10 || digits.length > 13) return 'Telefone invalido'
      return null
    }

    case 'cpf': {
      const digits = value.replace(/\D/g, '')
      if (digits.length !== 11) return 'CPF deve ter 11 digitos'
      return null
    }

    case 'choice':
      if (variable.choices && variable.choices.length > 0 && !variable.choices.includes(value))
        return 'Escolha uma das opcoes'
      return null

    case 'text':
    default:
      return null
  }
}

/** Formata um valor bruto conforme o tipo (ex: formata CPF com mascara). */
export function formatVariableValue(
  variable: PlaybookVariable,
  rawValue: string,
): string {
  const value = rawValue.trim()
  if (!value) return ''

  switch (variable.type) {
    case 'cpf': {
      const digits = value.replace(/\D/g, '').slice(0, 11)
      if (digits.length !== 11) return value
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
    }
    case 'phone': {
      const digits = value.replace(/\D/g, '')
      if (digits.length === 11) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
      }
      if (digits.length === 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
      }
      return value
    }
    case 'number': {
      return value.replace(',', '.')
    }
    case 'date': {
      // Converte AAAA-MM-DD para DD/MM/AAAA para exibir
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [y, m, d] = value.split('-')
        return `${d}/${m}/${y}`
      }
      return value
    }
    default:
      return value
  }
}

/**
 * Substitui `{chave}` no texto HTML pelos valores preenchidos. Suporta
 * marcador de negrito por variavel (via bold map).
 */
export function applyVariableValues(
  text: string,
  variables: PlaybookVariable[],
  values: Record<string, string>,
  bold: Record<string, boolean>,
): string {
  if (!text) return ''
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) => {
    const variable = variables.find((v) => v.key === key)
    const raw = values[key] ?? ''
    if (!raw && variable?.defaultValue) {
      const formatted = formatVariableValue(variable, variable.defaultValue)
      return bold[key] ? `<strong>${formatted}</strong>` : formatted
    }
    if (!raw) return match
    const formatted = variable ? formatVariableValue(variable, raw) : raw
    return bold[key] ? `<strong>${formatted}</strong>` : formatted
  })
}
