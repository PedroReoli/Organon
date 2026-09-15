/**
 * llmClient.ts — Cliente de API para LLM (OpenAI / Gemini / Anthropic / Groq)
 * com suporte nativo a Function Calling e IA Agêntica local.
 */

export interface LLMFunctionCall {
  name: string
  arguments: Record<string, any>
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  functionCall?: LLMFunctionCall
}

export interface LLMConfig {
  provider: 'openai' | 'gemini' | 'groq' | 'anthropic'
  apiKey: string
  modelName: string
}

// Schemas de Function Calling para o Organon
export const ORGANON_TOOLS = [
  {
    name: 'create_card',
    description: 'Cria uma tarefa ou card no Planejamento / Sprint',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título da tarefa' },
        date: { type: 'string', description: 'Data YYYY-MM-DD' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        inSprint: { type: 'boolean', description: 'Se entra direto na Sprint' },
      },
      required: ['title'],
    },
  },
  {
    name: 'add_expense',
    description: 'Registra uma despesa no módulo Financeiro',
    parameters: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Descrição do gasto' },
        amount: { type: 'number', description: 'Valor numérico em Reais' },
        category: { type: 'string', description: 'Categoria da despesa' },
      },
      required: ['description', 'amount'],
    },
  },
  {
    name: 'create_note',
    description: 'Cria uma nota no módulo Notas',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título da nota' },
        content: { type: 'string', description: 'Conteúdo em texto ou markdown' },
      },
      required: ['title'],
    },
  },
]

/**
 * Parser de comandos de texto em Function Call local quando offline ou sem API key
 */
export function parseLocalAgentCommand(text: string): LLMFunctionCall | null {
  const t = text.trim()

  // Exemplo: "criar tarefa comprar café data 2026-07-21"
  if (/^(criar|adicionar|nova)\s+(tarefa|card)/i.test(t)) {
    const titleMatch = t.replace(/^(criar|adicionar|nova)\s+(tarefa|card)/i, '').trim()
    return {
      name: 'create_card',
      arguments: { title: titleMatch || 'Nova Tarefa', inSprint: true },
    }
  }

  // Exemplo: "gasto 45 almoço" ou "despesa 45 almoço"
  if (/^(gasto|despesa|pagar)\s+/i.test(t)) {
    const raw = t.replace(/^(gasto|despesa|pagar)\s+/i, '').trim()
    const matchVal = raw.match(/(\d+[.,]?\d*)/)
    const amount = matchVal ? parseFloat(matchVal[1].replace(',', '.')) : 0
    const desc = matchVal ? raw.replace(matchVal[0], '').trim() : raw

    return {
      name: 'add_expense',
      arguments: { description: desc || 'Despesa', amount },
    }
  }

  // Exemplo: "nota ideias de viagem"
  if (/^(nota|rascunho)\s+/i.test(t)) {
    const title = t.replace(/^(nota|rascunho)\s+/i, '').trim()
    return {
      name: 'create_note',
      arguments: { title: title || 'Nova Nota', content: '' },
    }
  }

  return null
}
