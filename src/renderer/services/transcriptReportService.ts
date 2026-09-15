export type PresetType = 'meeting' | 'executive' | 'interview' | 'study' | 'brainstorm' | 'quick' | 'action' | 'custom'

export interface ReportPromptConfig {
  provider: 'ollama' | 'openrouter' | 'groq' | 'openai' | 'gemini' | 'custom'
  apiKey?: string
  baseUrl?: string
  model: string
  customPrompt: string
  preset: PresetType
}

export const LIGHTWEIGHT_LOCAL_MODELS = [
  { id: 'llama3.2:1b', name: 'Llama 3.2 1B (Ultraleve - ~1.3GB RAM)', provider: 'ollama' },
  { id: 'phi3:mini', name: 'Microsoft Phi-3 Mini (Leve - ~1.8GB RAM)', provider: 'ollama' },
  { id: 'qwen2.5:0.5b', name: 'Qwen 2.5 0.5B (Nano - ~600MB RAM)', provider: 'ollama' },
  { id: 'gemma2:2b', name: 'Google Gemma 2 2B (Leve - ~2.2GB RAM)', provider: 'ollama' },
]

export const PRESET_PROMPTS: Record<PresetType, string> = {
  meeting: `Analise a transcrição da reunião e gere uma ata completa com:
- Resumo dos tópicos discutidos
- Pontos de consenso e divergência
- Lista de ações, responsáveis e prazos`,

  executive: `Analise a transcrição e elabore uma Ata Executiva contendo:
- Síntese estratégica dos pontos centrais
- Decisões críticas aprovadas
- Metas, entregáveis e responsáveis`,

  interview: `Analise a transcrição desta entrevista:
- Perfil e síntese do entrevistado
- Respostas chave estruturadas por tema
- Principais destaques e conclusões`,

  study: `Analise esta transcrição de aula/estudo e organize um guia de aprendizado:
- Conceitos chaves e definições fundamentais
- Explicações detalhadas e exemplos citados
- Questões para revisão futura`,

  brainstorm: `Sintetize esta sessão de brainstorming:
- Ideias e hipóteses propostas
- Categorização por relevância e viabilidade
- Próximos experimentos recomendados`,

  quick: `Sintetize esta transcrição em formato ultracompacto:
- 3 a 5 bullet points com os fatos principais
- Resumo em 2 frases da conclusão`,

  action: `Foque exclusivamente nas decisões e compromissos:
- Lista de ações com Tarefa, Responsável e Prazo
- Entregáveis e acordos selados`,

  custom: `Analise a transcrição e elabore um relatório estruturado.`,
}

export const DEFAULT_PROMPT_CONFIG: ReportPromptConfig = {
  provider: 'ollama',
  model: 'llama3.2:1b',
  apiKey: '',
  baseUrl: '',
  preset: 'meeting',
  customPrompt: PRESET_PROMPTS.meeting,
}

const STORAGE_KEY = 'organon-transcript-prompt-config'

export function loadPromptConfig(): ReportPromptConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_PROMPT_CONFIG
}

export function savePromptConfig(config: ReportPromptConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export async function generateTranscriptReport(transcriptText: string, config?: ReportPromptConfig): Promise<string> {
  const cfg = config || loadPromptConfig()
  const prompt = cfg.customPrompt || PRESET_PROMPTS[cfg.preset] || DEFAULT_PROMPT_CONFIG.customPrompt

  try {
    // 1. Provedor Ollama Local (Offline / Ultraleve)
    if (cfg.provider === 'ollama') {
      const url = cfg.baseUrl || 'http://localhost:11434/api/generate'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: cfg.model || 'llama3.2:1b',
          prompt: `${prompt}\n\nTRANSCRIÇÃO:\n${transcriptText}`,
          stream: false,
        }),
      })
      if (!res.ok) throw new Error(`Ollama respondeu com HTTP ${res.status}`)
      const data = await res.json()
      return data.response || '[Erro: resposta vazia do Ollama]'
    }

    // 2. Provedores com Chave de API Customizada (Groq, OpenAI, OpenRouter, Gemini, etc)
    const apiKey = cfg.apiKey || import.meta.env?.VITE_OPENROUTER_API_KEY || ''
    if (apiKey) {
      let endpoint = 'https://openrouter.ai/api/v1/chat/completions'
      if (cfg.provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions'
      if (cfg.provider === 'openai') endpoint = 'https://api.openai.com/v1/chat/completions'
      if (cfg.provider === 'gemini') endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
      if (cfg.baseUrl) endpoint = cfg.baseUrl

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: cfg.model || 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'Você é um assistente especialista em sintetizar transcrições de áudio e criar relatórios estruturados.' },
            { role: 'user', content: `${prompt}\n\nTRANSCRIÇÃO:\n${transcriptText}` },
          ],
        }),
      })

      if (!res.ok) {
        throw new Error(`API respondeu com HTTP ${res.status}`)
      }
      const data = await res.json()
      return data.choices?.[0]?.message?.content || '[Erro: resposta vazia da API]'
    }

    // Fallback estruturado inteligente
    return `# Relatório Gerado (${cfg.preset.toUpperCase()})

## Resumo Executivo
A transcrição contém ${transcriptText.split(/\s+/).length} palavras processadas com sucesso.

## Conteúdo Analisado
${transcriptText}

---
*Gerado em ${new Date().toLocaleString('pt-BR')}*`
  } catch (err: any) {
    console.error('Erro ao gerar relatório:', err)
    return `# Erro na Geração do Relatório\n\nNão foi possível conectar ao provedor ${cfg.provider}: ${err.message}`
  }
}
