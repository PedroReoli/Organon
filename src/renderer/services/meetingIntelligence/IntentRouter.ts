import { IntentDetectionResult } from './types'

const normalizeText = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const DECISION_KEYWORDS = [
  'ficou decidido',
  'decidido',
  'aprovado',
  'alinhado que',
  'decisao:',
  'combinado que',
  'vamos fechar em',
  'optamos por',
]

const ACTION_KEYWORDS = [
  'fica responsavel',
  'tarefa para',
  'vou implementar',
  'precisa criar',
  'acao:',
  'proximo passo',
  'vou verificar',
  'sua responsabilidade',
]

const CASUAL_SHORT_CUES = ['ok', 'beleza', 'valeu', 'entendi', 'sim', 'nao', 'perfeito', 'certo']

export class IntentRouter {
  public static classifyTranscriptWindow(snippet: string): IntentDetectionResult {
    const raw = snippet?.trim() || ''
    if (raw.length < 6) {
      return { intent: 'casual_chat', confidence: 1.0 }
    }

    const lower = normalizeText(raw)

    if (raw.length < 18 && CASUAL_SHORT_CUES.some(kw => lower === kw || lower.startsWith(`${kw} `))) {
      return { intent: 'casual_chat', confidence: 1.0 }
    }

    for (const kw of DECISION_KEYWORDS) {
      if (lower.includes(kw)) {
        return {
          intent: 'decision',
          confidence: 0.93,
          extractedTopic: raw,
        }
      }
    }

    for (const kw of ACTION_KEYWORDS) {
      if (lower.includes(kw)) {
        return {
          intent: 'action_item',
          confidence: 0.93,
          extractedTopic: raw,
        }
      }
    }

    const isQuestion = /\?|\b(como|qual|quais|quando|onde|quanto|porque|por que|o que)\b/.test(lower)
    const requestedSearch = /\b(pesquis|busqu|procur|analis|verifi|compar|expli|investig)/.test(lower)
    if (!isQuestion && !requestedSearch) return { intent: 'casual_chat', confidence: 0.9 }
    const explicitWeb = /\b(web|internet|online|documentacao oficial)\b/.test(lower)
    const explicitProject = /\b(projeto|codigo|arquivo|pasta|repositorio|repo|nossa implementacao)\b/.test(lower)
    if (explicitProject && !explicitWeb) return { intent: 'project_question', confidence: 0.9, searchQuery: raw }
    if (explicitWeb || isQuestion || requestedSearch) return { intent: 'external_tech_question', confidence: 0.8, searchQuery: raw }

    return {
      intent: 'casual_chat',
      confidence: 0.98,
    }
  }
}
