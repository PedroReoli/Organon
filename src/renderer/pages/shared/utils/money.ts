/**
 * Helpers de dinheiro centralizados.
 *
 * Definido no upgrade 19. Adotar incrementalmente em lugar de hardcoded
 * `R$ ${value.toFixed(2)}` espalhado em components/financial e outros.
 */

const DEFAULT_LOCALE = 'pt-BR'
const DEFAULT_CURRENCY = 'BRL'

export interface MoneyFormatOptions {
  locale?: string
  currency?: string
  /** mostrar simbolo (R$) ou apenas o valor */
  withSymbol?: boolean
  /** numero de casas decimais (default 2) */
  decimals?: number
}

/**
 * Formata um valor numerico para string monetaria.
 *
 * formatMoney(1234.5)            -> "R$ 1.234,50"
 * formatMoney(1234.5, { withSymbol: false }) -> "1.234,50"
 * formatMoney(1234.5, { decimals: 0 })       -> "R$ 1.235"
 */
export function formatMoney(value: number | null | undefined, options: MoneyFormatOptions = {}): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const {
    locale = DEFAULT_LOCALE,
    currency = DEFAULT_CURRENCY,
    withSymbol = true,
    decimals = 2,
  } = options

  if (withSymbol) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Formata um valor compacto: 1.2K, 3.4M, 5.6B.
 */
export function formatMoneyCompact(value: number | null | undefined, options: MoneyFormatOptions = {}): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const { locale = DEFAULT_LOCALE, withSymbol = true, currency = DEFAULT_CURRENCY } = options

  const formatter = new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
    ...(withSymbol ? { style: 'currency', currency } : {}),
    maximumFractionDigits: 1,
  })
  return formatter.format(value)
}

/**
 * Parseia uma string monetaria de volta para numero.
 *
 * parseMoneyInput("R$ 1.234,50") -> 1234.5
 * parseMoneyInput("1234,50")     -> 1234.5
 * parseMoneyInput("invalid")     -> null
 */
export function parseMoneyInput(input: string | null | undefined): number | null {
  if (input == null) return null
  const trimmed = String(input).trim()
  if (!trimmed) return null
  // remove tudo que nao e digito, virgula, ponto ou sinal
  const cleaned = trimmed.replace(/[^\d,.-]/g, '')
  // pt-BR: ponto e separador de milhar, virgula e decimal
  const normalized = cleaned.replace(/\./g, '').replace(',', '.')
  const num = parseFloat(normalized)
  return Number.isFinite(num) ? num : null
}

/**
 * Calcula porcentagem com fallback seguro.
 *
 * percent(50, 200) -> 25
 * percent(0, 0)    -> 0
 */
export function percent(value: number, total: number, decimals = 0): number {
  if (!total || !Number.isFinite(total)) return 0
  const ratio = (value / total) * 100
  const factor = Math.pow(10, decimals)
  return Math.round(ratio * factor) / factor
}
