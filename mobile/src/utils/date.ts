import type { Day, Period } from '../types'

/** Hoje como ISO date string "YYYY-MM-DD" */
export function today(): string {
  return new Date().toISOString().split('T')[0]
}

/** Agora como ISO timestamp string */
export function now(): string {
  return new Date().toISOString()
}

/** Formata ISO date para "DD/MM/YYYY" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Formata ISO date para "DD de Mês de YYYY" */
export function formatDateLong(iso: string): string {
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ]
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} de ${months[m - 1]} de ${y}`
}

/** Retorna o dia da semana de uma ISO date como Day */
export function getDayOfWeek(iso: string): Day {
  const days: Day[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const d = new Date(iso + 'T00:00:00')
  return days[d.getDay()]
}

/** Retorna "YYYY-MM-DD" para N dias a partir de hoje */
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

/** Retorna a semana ISO (seg a dom) contendo a data */
export function getWeekRange(iso: string): { start: string; end: string } {
  const d = new Date(iso + 'T00:00:00')
  const day = d.getDay() // 0=dom
  const diffToMon = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diffToMon)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return {
    start: mon.toISOString().split('T')[0],
    end:   sun.toISOString().split('T')[0],
  }
}

/** Mapeia índice 0=Dom..6=Sáb para Day */
export function jsWeekdayToDay(weekday: number): Day {
  const map: Day[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return map[weekday]
}

/** Period baseado na hora atual */
export function getCurrentPeriod(): Period {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'night'
}

/** Formata minutos em "Xh Ym" ou "Ym" */
export function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`
  return `${Math.floor(min / 60)}h${min % 60 > 0 ? ` ${min % 60}m` : ''}`
}
