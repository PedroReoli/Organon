type TranscriptMode = 'meeting' | 'interview' | 'prompt'

export interface TranscriptNoteRequest {
  title?: string
  transcript: string
  mode?: TranscriptMode
  selectedSnippets?: string[]
  customInstructions?: string
}

export interface TranscriptSelectionRequest {
  text: string
  mode?: TranscriptMode
}

export interface TranscriptNoteResponse {
  title: string
  markdown: string
  summary: string
  highlights: string[]
  questions: string[]
  decisions: string[]
  actionItems: string[]
  words: number
  segments: number
}

export interface TranscriptSelectionResponse {
  intent: 'question' | 'decision' | 'action_item' | 'note' | 'prompt'
  summary: string
  suggestions: Array<{
    id: string
    label: string
    description: string
  }>
}

const normalizeText = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

const splitTranscript = (transcript: string): string[] => {
  return transcript
    .split(/\n+/)
    .flatMap(line => line.match(/[^.!?]+[.!?]*/g) || [line])
    .map(part => part.trim())
    .filter(Boolean)
}

const makeSummary = (segments: string[], mode: TranscriptMode): string => {
  if (segments.length === 0) {
    return mode === 'interview'
      ? 'Nenhuma fala foi detectada para organizar.'
      : 'Nenhuma transcrição foi detectada para organizar.'
  }

  const preview = segments.slice(0, 3).join(' ')
  if (mode === 'prompt') {
    return `Comando de voz interpretado: ${preview}`
  }

  if (mode === 'interview') {
    return `Resumo da entrevista com base nos primeiros trechos relevantes: ${preview}`
  }

  return `Resumo da reunião com base nos primeiros trechos relevantes: ${preview}`
}

const detectIntent = (text: string): TranscriptSelectionResponse['intent'] => {
  const normalized = normalizeText(text)
  if (/[?？]$/.test(text.trim()) || /\b(como|qual|quais|quando|onde|por que|porque|what|how|why|which|when|where)\b/i.test(normalized)) {
    return 'question'
  }
  if (/\b(decidido|aprovado|combinado|vamos fechar|optamos|ficou definido)\b/i.test(normalized)) {
    return 'decision'
  }
  if (/\b(fica responsavel|tarefa|proximo passo|vou fazer|vamos fazer|precisa|action item)\b/i.test(normalized)) {
    return 'action_item'
  }
  if (/\b(resum|organi|anota|nota|prompt)\b/i.test(normalized)) {
    return 'prompt'
  }
  return 'note'
}

const buildSuggestions = (intent: TranscriptSelectionResponse['intent']) => {
  if (intent === 'question') {
    return [
      { id: 'search-project', label: 'Pesquisar no projeto', description: 'Busca arquivos, funções e trechos relacionados.' },
      { id: 'search-web', label: 'Pesquisar na web', description: 'Busca referências externas e documentação.' },
      { id: 'convert-note', label: 'Adicionar à nota', description: 'Inclui o trecho no resumo final.' },
    ]
  }

  if (intent === 'decision') {
    return [
      { id: 'mark-decision', label: 'Marcar como decisão', description: 'Registra o trecho como decisão importante.' },
      { id: 'convert-note', label: 'Adicionar à nota', description: 'Inclui o trecho na ata.' },
      { id: 'pin-highlight', label: 'Destacar', description: 'Mantém o trecho em evidência.' },
    ]
  }

  if (intent === 'action_item') {
    return [
      { id: 'mark-action', label: 'Criar tarefa', description: 'Transforma o trecho em ação pendente.' },
      { id: 'convert-note', label: 'Adicionar à nota', description: 'Inclui o trecho na nota organizada.' },
      { id: 'pin-highlight', label: 'Destacar', description: 'Mantém o trecho em evidência.' },
    ]
  }

  if (intent === 'prompt') {
    return [
      { id: 'generate-prompt', label: 'Gerar prompt', description: 'Converte a fala em um comando limpo para a IA.' },
      { id: 'convert-note', label: 'Adicionar à nota', description: 'Inclui o trecho no registro final.' },
      { id: 'pin-highlight', label: 'Destacar', description: 'Mantém o trecho em evidência.' },
    ]
  }

  return [
    { id: 'convert-note', label: 'Adicionar à nota', description: 'Inclui o trecho na nota organizada.' },
    { id: 'pin-highlight', label: 'Destacar', description: 'Mantém o trecho em evidência.' },
    { id: 'rewrite', label: 'Reescrever', description: 'Ajusta o trecho para ficar mais claro.' },
  ]
}

const collectBuckets = (segments: string[]) => {
  const questions: string[] = []
  const decisions: string[] = []
  const actionItems: string[] = []
  const highlights: string[] = []

  for (const segment of segments) {
    const intent = detectIntent(segment)
    if (highlights.length < 8) {
      highlights.push(segment)
    }

    if (intent === 'question') {
      questions.push(segment)
      continue
    }

    if (intent === 'decision') {
      decisions.push(segment)
      continue
    }

    if (intent === 'action_item') {
      actionItems.push(segment)
    }
  }

  return { questions, decisions, actionItems, highlights }
}

const buildMarkdown = (
  request: TranscriptNoteRequest,
  summary: string,
  buckets: ReturnType<typeof collectBuckets>
) => {
  const selectedSnippets = (request.selectedSnippets || []).map(item => item.trim()).filter(Boolean)
  const rawTranscript = request.transcript.trim()
  const modeLabel = request.mode === 'interview'
    ? 'Entrevista'
    : request.mode === 'prompt'
      ? 'Prompt por voz'
      : 'Reunião'

  const sections: string[] = [
    `# ${request.title?.trim() || `Nota de ${modeLabel}`}`,
    '',
    '## Resumo',
    summary,
    '',
  ]

  if (selectedSnippets.length > 0) {
    sections.push('## Trechos selecionados')
    sections.push(...selectedSnippets.map(item => `- ${item}`))
    sections.push('')
  }

  sections.push('## Perguntas')
  sections.push(...(buckets.questions.length > 0 ? buckets.questions.map(item => `- ${item}`) : ['- Nenhuma pergunta detectada.']))
  sections.push('')

  sections.push('## Decisões')
  sections.push(...(buckets.decisions.length > 0 ? buckets.decisions.map(item => `- ${item}`) : ['- Nenhuma decisão detectada.']))
  sections.push('')

  sections.push('## Ações')
  sections.push(...(buckets.actionItems.length > 0 ? buckets.actionItems.map(item => `- ${item}`) : ['- Nenhuma ação detectada.']))
  sections.push('')

  if (request.customInstructions?.trim()) {
    sections.push('## Instruções aplicadas')
    sections.push(request.customInstructions.trim())
    sections.push('')
  }

  sections.push('## Transcrição bruta')
  sections.push(rawTranscript || '-')

  return sections.join('\n')
}

export function analyzeTranscriptSelection(request: TranscriptSelectionRequest): TranscriptSelectionResponse {
  const text = request.text?.trim() || ''
  const intent = detectIntent(text)
  return {
    intent,
    summary: text || 'Trecho vazio.',
    suggestions: buildSuggestions(intent),
  }
}

export function generateTranscriptNote(request: TranscriptNoteRequest): TranscriptNoteResponse {
  const transcript = request.transcript?.trim() || ''
  const segments = splitTranscript(transcript)
  const buckets = collectBuckets(segments)
  const summary = makeSummary(
    request.selectedSnippets && request.selectedSnippets.length > 0
      ? [...request.selectedSnippets, ...segments.slice(0, 2)]
      : segments,
    request.mode || 'meeting'
  )

  const markdown = buildMarkdown(request, summary, buckets)

  return {
    title: request.title?.trim() || `Nota de ${request.mode === 'interview' ? 'Entrevista' : request.mode === 'prompt' ? 'Prompt por voz' : 'Reunião'}`,
    markdown,
    summary,
    highlights: buckets.highlights,
    questions: buckets.questions,
    decisions: buckets.decisions,
    actionItems: buckets.actionItems,
    words: transcript ? transcript.split(/\s+/).filter(Boolean).length : 0,
    segments: segments.length,
  }
}
