import { IntentRouter } from './IntentRouter'
import type { CopilotSuggestion, MeetingRisk, TopicInsight } from './types'

export interface ConversationAnalysisOptions {
  hasProject: boolean
  allowWeb: boolean
  priorStatements: string[]
  openQuestions: string[]
}

export interface ConversationAnalysis {
  intent: ReturnType<typeof IntentRouter.classifyTranscriptWindow>
  topics: Array<Pick<TopicInsight, 'label' | 'confidence'>>
  question?: { text: string; confidence: number }
  answeredQuestion?: { question: string; answer: string; confidence: number }
  decision?: { text: string; confidence: number }
  action?: { task: string; assignee?: string; dueDate?: string; confidence: number }
  risk?: Omit<MeetingRisk, 'id' | 'timestamp' | 'status'>
  contradiction?: { previousStatement: string; currentStatement: string; confidence: number }
  suggestions: Array<Omit<CopilotSuggestion, 'id' | 'timestamp' | 'status'>>
}

const STOP_WORDS = new Set([
  'ainda', 'agora', 'alguma', 'algumas', 'alguns', 'aquela', 'aquele', 'aqui', 'assim', 'cada', 'como', 'com',
  'coisa', 'depois', 'dessa', 'desse', 'disso', 'então', 'essa', 'esse', 'esta', 'este', 'fazer', 'gente', 'isso',
  'mais', 'mesmo', 'muito', 'nada', 'nessa', 'nesse', 'onde', 'outra', 'outro', 'para', 'pela', 'pelo', 'porque',
  'quando', 'quem', 'seria', 'sobre', 'também', 'temos', 'tinha', 'todo', 'todos', 'vamos', 'você', 'vocês',
])

const normalize = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()

const significantTokens = (value: string) => normalize(value)
  .split(/[^a-z0-9_+#.-]+/)
  .filter(token => token.length >= 4 && !STOP_WORDS.has(token))

function extractTopics(text: string): ConversationAnalysis['topics'] {
  const counts = new Map<string, number>()
  for (const token of significantTokens(text)) counts.set(token, (counts.get(token) || 0) + 1)
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || right[0].length - left[0].length)
    .slice(0, 3)
    .map(([label, mentions]) => ({ label, confidence: Math.min(0.86, 0.56 + mentions * 0.1) }))
}

function extractAssignee(text: string): string | undefined {
  const patterns = [
    /\b(?:[Rr]esponsável(?:\s+por)?|[Ff]ica com|[Tt]arefa para)\s*[:—-]?\s*([\p{Lu}][\p{L}]+(?:\s+[\p{Lu}][\p{L}]+)?)/u,
    /^\s*([\p{Lu}][\p{L}]+(?:\s+[\p{Lu}][\p{L}]+)?)\s+(?:vai|deve|ficou de)\b/u,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1].trim().slice(0, 60)
  }
  return undefined
}

function extractDueDate(text: string): string | undefined {
  const match = text.match(/\b(?:até|pra|para)\s+(amanhã|hoje|segunda(?:-feira)?|terça(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i)
  return match?.[1]
}

function detectRisk(text: string): ConversationAnalysis['risk'] {
  const normalized = normalize(text)
  const markers = /\b(risco|bloqueio|bloqueado|impedimento|problema grave|pode falhar|pode quebrar|atraso|vulnerabilidade|indisponibilidade)\b/
  if (!markers.test(normalized)) return undefined
  const severity = /\b(crítico|critico|grave|urgente|segurança|seguranca|vazamento|produção|producao)\b/.test(normalized)
    ? 'high'
    : /\b(alto|atraso|bloqueio|falhar|quebrar)\b/.test(normalized) ? 'medium' : 'low'
  return { text, severity, confidence: severity === 'high' ? 0.9 : 0.82, sourceSegmentIds: undefined }
}

function detectContradiction(current: string, priorStatements: string[]): ConversationAnalysis['contradiction'] {
  const correction = /\b(ao contrário|corrigindo|na verdade|retiro o que disse|mudamos de ideia)\b/i.test(current)
  const currentTokens = new Set(significantTokens(current))
  const currentNegative = /\b(não|nunca|jamais|cancelad[oa]|descartad[oa]|proibid[oa])\b/i.test(current)
  for (const previous of [...priorStatements].reverse().slice(0, 12)) {
    const shared = significantTokens(previous).filter(token => currentTokens.has(token))
    const previousNegative = /\b(não|nunca|jamais|cancelad[oa]|descartad[oa]|proibid[oa])\b/i.test(previous)
    if ((correction && shared.length >= 1) || (shared.length >= 2 && currentNegative !== previousNegative)) {
      return { previousStatement: previous, currentStatement: current, confidence: correction ? 0.88 : 0.72 }
    }
  }
  return undefined
}

function suggestion(
  type: CopilotSuggestion['type'],
  title: string,
  detail: string,
  sourceText: string,
  confidence: number,
  suggestedScope?: CopilotSuggestion['suggestedScope'],
): Omit<CopilotSuggestion, 'id' | 'timestamp' | 'status'> {
  return { type, title, detail, sourceText, confidence, suggestedScope }
}

export function analyzeConversationTurn(text: string, options: ConversationAnalysisOptions): ConversationAnalysis {
  const clean = text.trim()
  const intent = IntentRouter.classifyTranscriptWindow(clean)
  const result: ConversationAnalysis = { intent, topics: extractTopics(clean), suggestions: [] }
  const isQuestion = intent.intent === 'project_question' || intent.intent === 'external_tech_question'

  if (isQuestion) {
    result.question = { text: clean, confidence: intent.confidence }
    if (intent.intent === 'project_question' && options.hasProject) {
      result.suggestions.push(suggestion('research_project', 'Pesquisar na pasta vinculada', clean, clean, 0.9, 'project'))
    } else if (options.allowWeb) {
      result.suggestions.push(suggestion('research_web', 'Verificar na internet', clean, clean, 0.82, 'web'))
    } else {
      result.suggestions.push(suggestion('clarify', 'Pergunta em aberto', 'Retome esta pergunta ou habilite uma fonte de pesquisa.', clean, 0.78))
    }
  } else if (options.openQuestions.length && /\b(a resposta|respondendo|porque|isso acontece|sim|não|nao|confirmado|resolvemos)\b/i.test(clean)) {
    result.answeredQuestion = { question: options.openQuestions[0], answer: clean, confidence: 0.68 }
  }

  if (intent.intent === 'decision') {
    result.decision = { text: clean, confidence: intent.confidence }
    result.suggestions.push(suggestion('confirm_decision', 'Confirmar decisão', 'Marque como confirmada para entrar na memória da reunião.', clean, 0.86))
  }

  if (intent.intent === 'action_item') {
    const assignee = extractAssignee(clean)
    const dueDate = extractDueDate(clean)
    result.action = { task: clean, assignee, dueDate, confidence: intent.confidence }
    if (!assignee) result.suggestions.push(suggestion('assign_owner', 'Definir responsável', 'A ação foi detectada sem uma pessoa responsável.', clean, 0.84))
    if (!dueDate) result.suggestions.push(suggestion('set_due_date', 'Definir prazo', 'A ação foi detectada sem uma data ou prazo.', clean, 0.8))
  }

  result.risk = detectRisk(clean)
  if (result.risk) result.suggestions.push(suggestion('risk_mitigation', 'Definir mitigação do risco', result.risk.text, clean, result.risk.confidence))
  result.contradiction = detectContradiction(clean, options.priorStatements)
  if (result.contradiction) result.suggestions.push(suggestion('clarify', 'Possível contradição', 'Compare a fala atual com a posição anterior antes de consolidar a ata.', clean, result.contradiction.confidence))
  return result
}
