/**
 * financialParser.ts — Parser de Linguagem Natural & Entrada Rápida Financeira
 *
 * Recebe texto livre (ex: transcrição de voz ou digitação rápida) e extrai
 * de forma heurística e extensível: tipo (despesa/receita), valor, categoria sugerida e data.
 */

export interface ParsedFinancialResult {
  type: 'expense' | 'income' | 'transfer'
  amount: number | null
  description: string
  categorySuggestion: string
  date: string // ISO Date YYYY-MM-DD
  confidence: number
  rawInput: string
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Alimentação: ['mercado', 'almoço', 'jantar', 'restaurante', 'lanche', 'padaria', 'ifood', 'supermercado', 'comida', 'café'],
  Transporte: ['uber', 'gasolina', 'combustível', 'estacionamento', 'pedágio', 'ônibus', 'metrô', 'táxi', 'oficina'],
  Moradia: ['aluguel', 'condomínio', 'luz', 'água', 'gás', 'internet', 'iptu'],
  Lazer: ['cinema', 'jogos', 'steam', 'bar', 'festa', 'viagem', 'hotel', 'shows'],
  Saúde: ['farmácia', 'remédio', 'médico', 'consulta', 'exame', 'dentista', 'hospital'],
  Salário: ['salário', 'pagamento', 'provento', 'recebi', 'depósito', 'freelance', 'pix recebido'],
  Assinaturas: ['netflix', 'spotify', 'amazon', 'chatgpt', 'youtube', 'github'],
}

export function parseFinancialInput(input: string): ParsedFinancialResult {
  const rawInput = input.trim()
  const lower = rawInput.toLowerCase()
  const todayISO = new Date().toISOString().slice(0, 10)

  // 1. Determinar Tipo (Receita vs Despesa)
  let type: 'expense' | 'income' | 'transfer' = 'expense'
  if (lower.includes('recebi') || lower.includes('ganhei') || lower.includes('salário') || lower.includes('depósito')) {
    type = 'income'
  } else if (lower.includes('transferi') || lower.includes('transferência')) {
    type = 'transfer'
  }

  // 2. Extrair Valor numérico (ex: "42.50", "42,50", "42 reais", "R$ 42")
  let amount: number | null = null
  const amountMatch = lower.match(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(?:reais|real)?/)
  if (amountMatch) {
    const rawVal = amountMatch[1].replace(',', '.')
    const parsedVal = parseFloat(rawVal)
    if (!isNaN(parsedVal)) {
      amount = parsedVal
    }
  }

  // 3. Sugerir Categoria
  let categorySuggestion = type === 'income' ? 'Salário' : 'Outro'
  let highestMatchCount = 0

  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        categorySuggestion = catName
        highestMatchCount += 1
        break
      }
    }
  }

  // 4. Limpar descrição removendo gatilhos como "gastei", "reais", valores etc.
  let description = rawInput
    .replace(/gastei|recebi|paguei|valor|reais|real|r\$/gi, '')
    .replace(/\d+(?:[.,]\d{1,2})?/, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!description) {
    description = categorySuggestion !== 'Outro' ? categorySuggestion : 'Movimentação sem descrição'
  }

  // Capitaliza descrição
  description = description.charAt(0).toUpperCase() + description.slice(1)

  // 5. Cálculo de Confiança
  let confidence = 0.5
  if (amount != null && amount > 0) confidence += 0.3
  if (categorySuggestion !== 'Outro') confidence += 0.2

  return {
    type,
    amount,
    description,
    categorySuggestion,
    date: todayISO,
    confidence: Math.min(confidence, 1.0),
    rawInput,
  }
}
