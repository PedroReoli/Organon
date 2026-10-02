import type { MeetingIntelligenceData, MeetingMemoryDigest, ProjectContextConfig } from './types'

export interface MeetingMemoryRecord {
  id: string
  createdAt: string
  title: string
  intelligenceData?: MeetingIntelligenceData
  projectContext?: { name?: string; path?: string }
}

const normalizePath = (value?: string) => (value || '').trim().replace(/[\\/]+$/, '').toLowerCase()

function unique(values: string[], limit: number): string[] {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean))).slice(0, limit)
}

export function buildMeetingMemory(
  records: MeetingMemoryRecord[],
  context?: ProjectContextConfig,
  excludeMeetingId?: string,
): MeetingMemoryDigest {
  const contextPath = normalizePath(context?.path)
  const candidates = records
    .filter(record => record.id !== excludeMeetingId)
    .filter(record => !contextPath || normalizePath(record.projectContext?.path) === contextPath)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, contextPath ? 12 : 5)

  const decisions = candidates.flatMap(record => (record.intelligenceData?.decisions || []).map(item => (
    item.confirmed === false ? `${item.text} (não confirmada)` : item.text
  )))
  const pendingActions = candidates.flatMap(record => (record.intelligenceData?.actionItems || [])
    .filter(item => item.status === 'pending')
    .map(item => `${item.task}${item.assignee ? ` — ${item.assignee}` : ''}${item.dueDate ? ` — prazo ${item.dueDate}` : ''}`))
  const openQuestions = candidates.flatMap(record => (record.intelligenceData?.openQuestions || [])
    .filter(item => item.status === 'open')
    .map(item => item.text))
  const risks = candidates.flatMap(record => (record.intelligenceData?.risks || [])
    .filter(item => item.status === 'open')
    .map(item => `[${item.severity}] ${item.text}`))

  return {
    preparedAt: new Date().toISOString(),
    sourceMeetingIds: candidates.map(record => record.id),
    contextLabel: context?.name || (contextPath ? context!.path : 'Reuniões recentes'),
    decisions: unique(decisions, 20),
    pendingActions: unique(pendingActions, 20),
    openQuestions: unique(openQuestions, 20),
    risks: unique(risks, 20),
  }
}

export function formatMeetingMemory(memory?: MeetingMemoryDigest): string {
  if (!memory?.sourceMeetingIds.length) return ''
  return [
    `Contexto anterior: ${memory.contextLabel}`,
    memory.decisions.length ? `Decisões: ${memory.decisions.join(' | ')}` : '',
    memory.pendingActions.length ? `Pendências: ${memory.pendingActions.join(' | ')}` : '',
    memory.openQuestions.length ? `Perguntas abertas: ${memory.openQuestions.join(' | ')}` : '',
    memory.risks.length ? `Riscos: ${memory.risks.join(' | ')}` : '',
  ].filter(Boolean).join('\n')
}
