/**
 * Helpers de data centralizados.
 *
 * Este arquivo e o canonico para helpers de data novos. Os existentes em
 * `utils/index.ts` (formatDateShort, formatDateFull, getTodayISO, isToday,
 * getDayFromDate, getWeekDatesForOffset, getCurrentWeekDates) sao
 * reexportados aqui para que novos modulos possam importar de um lugar
 * unico, e tambem ganham helpers adicionais (toISO, addDays, getISOWeekNumber).
 *
 * Definido no upgrade 19. Migracao gradual: novos arquivos importam daqui.
 */

export {
  formatDateShort,
  formatDateFull,
  getTodayISO,
  isToday,
  getDayFromDate,
  getWeekDatesForOffset,
  getCurrentWeekDates,
} from './index'

import { getTodayISO } from './index'

/**
 * Constroi string ISO `YYYY-MM-DD` a partir de y/m/d (m e 0-indexed).
 */
export function toISO(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

/**
 * Adiciona N dias a uma data ISO (`YYYY-MM-DD`). Retorna nova string ISO.
 * N pode ser negativo.
 */
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toISO(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Diferenca em dias entre duas datas ISO. (b - a). Positivo se b > a.
 */
export function diffDays(aIso: string, bIso: string): number {
  const a = new Date(aIso + 'T00:00:00').getTime()
  const b = new Date(bIso + 'T00:00:00').getTime()
  return Math.round((b - a) / 86_400_000)
}

/**
 * Numero da semana ISO 8601 da data. Util para "Sprint S14".
 */
export function getISOWeekNumber(iso: string): number {
  const date = new Date(iso + 'T00:00:00')
  const target = new Date(date.valueOf())
  const dayNr = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7))
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / (7 * 86_400_000))
}

/**
 * Retorna a data ISO do "amanha" relativo a hoje (ou a uma data dada).
 */
export function tomorrow(fromIso?: string): string {
  return addDays(fromIso ?? getTodayISO(), 1)
}

/**
 * Retorna a data ISO do "ontem" relativo a hoje (ou a uma data dada).
 */
export function yesterday(fromIso?: string): string {
  return addDays(fromIso ?? getTodayISO(), -1)
}

/**
 * Verifica se a data ISO esta no passado em relacao a hoje.
 */
export function isPast(iso: string): boolean {
  return iso < getTodayISO()
}

/**
 * Verifica se a data ISO esta no futuro em relacao a hoje.
 */
export function isFuture(iso: string): boolean {
  return iso > getTodayISO()
}

/**
 * Formata data ISO para texto humano relativo: "Hoje", "Amanha", "Ontem",
 * "Em 3 dias", "Ha 5 dias". Falls back para `formatDateShort` se >7 dias.
 */
export function formatRelativeDay(iso: string): string {
  const today = getTodayISO()
  if (iso === today) return 'Hoje'
  if (iso === tomorrow()) return 'Amanha'
  if (iso === yesterday()) return 'Ontem'
  const delta = diffDays(today, iso)
  if (delta > 0 && delta <= 7) return `Em ${delta} dias`
  if (delta < 0 && delta >= -7) return `Ha ${Math.abs(delta)} dias`
  // delegar para formatDateShort
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { formatDateShort } = require('./index') as { formatDateShort: (s: string) => string }
  return formatDateShort(iso)
}
