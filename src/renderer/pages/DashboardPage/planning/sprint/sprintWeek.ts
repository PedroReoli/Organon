/**
 * Helpers de semana ISO para o Sprint Board.
 *
 * - getISOWeekId(date): retorna o id ISO da semana, ex "2026-W15"
 * - getCurrentSprintId(): id da semana corrente
 * - getSprintRange(weekId): { startDate, endDate } da semana
 *
 * Upgrade 01.
 */

/** Retorna o numero da semana ISO 8601 (1-53) para uma data. */
export function getISOWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function getISOWeekYear(date: Date): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNum)
  return target.getUTCFullYear()
}

export function getISOWeekId(date: Date = new Date()): string {
  const year = getISOWeekYear(date)
  const week = getISOWeekNumber(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function getCurrentSprintId(): string {
  return getISOWeekId(new Date())
}

/** Retorna a segunda-feira da semana ISO de uma data. */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Retorna { startDate, endDate } ISO para um sprint id "2026-W15". */
export function getSprintRange(sprintId: string): { startDate: string; endDate: string } {
  const m = typeof sprintId === 'string' ? sprintId.match(/^(\d{4})-W(\d{2})$/) : null
  if (!m) {
    const today = new Date()
    const monday = getMondayOfWeek(today)
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    return { startDate: toISODate(monday), endDate: toISODate(sunday) }
  }
  const year = Number(m[1])
  const week = Number(m[2])
  // Algoritmo: 4 jan sempre esta na semana 1 ISO. Calcula a segunda dessa semana.
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const week1Monday = new Date(jan4)
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1))
  const targetMonday = new Date(week1Monday)
  targetMonday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7)
  const targetSunday = new Date(targetMonday)
  targetSunday.setUTCDate(targetMonday.getUTCDate() + 6)
  return {
    startDate: targetMonday.toISOString().slice(0, 10),
    endDate: targetSunday.toISOString().slice(0, 10),
  }
}

/** Retorna o id da semana ISO de uma data ISO YYYY-MM-DD. */
export function getSprintIdForDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return getISOWeekId(d)
}
