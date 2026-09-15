/**
 * dailyNotes — helpers para a feature de "Daily Notes" (Upgrade 10c).
 *
 * - getTodayDailyTitle(): titulo da daily de hoje
 * - findOrCreateDailyNote(notes, ...): encontra ou retorna instrucoes pra criar
 */

import type { Note, NoteTemplate } from '@types'
import { BUILTIN_NOTE_TEMPLATES } from '@types'

const PT_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

/** Titulo padrao da daily de hoje: "DD de Mês de YYYY". */
export function getTodayDailyTitle(date: Date = new Date()): string {
  return `${String(date.getDate()).padStart(2, '0')} de ${PT_MONTHS[date.getMonth()]} de ${date.getFullYear()}`
}

/** Versao curta YYYY-MM-DD para comparacao. */
export function getTodayDailyKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

/** Acha a daily note de hoje no array de notas (busca por titulo exato). */
export function findDailyNote(notes: Note[], date: Date = new Date()): Note | null {
  const title = getTodayDailyTitle(date)
  return notes.find((n) => !n.deletedAt && n.title === title) ?? null
}

/** Retorna o template de daily padrao (user customizado tem prioridade sobre builtin). */
export function pickDailyTemplate(userTemplates: NoteTemplate[]): NoteTemplate | null {
  const userDefault = userTemplates.find((t) => t.isDefaultDaily)
  if (userDefault) return userDefault
  const builtinDefault = BUILTIN_NOTE_TEMPLATES.find((t) => t.isDefaultDaily)
  return builtinDefault ?? null
}

/** Aplica variaveis de daily ({{date}}) no conteudo do template. */
export function applyDailyVariables(content: string, date: Date = new Date()): string {
  const vars: Record<string, string> = {
    date: getTodayDailyTitle(date),
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
    title: getTodayDailyTitle(date),
  }
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}
