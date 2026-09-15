import { normalizeWhisperAudio, splitWhisperWav } from './whisperAudio'
export type WhisperTranscriptionProfile = 'pc-fraco' | 'equilibrado' | 'openwhisper'
export type WhisperTranscriptMode = 'meeting' | 'interview' | 'prompt'

export interface WhisperTranscriptionContext {
  mode?: WhisperTranscriptMode
  projectName?: string
  recentTranscript?: string
  selectedSnippets?: string[]
  hotwords?: string[]
}

export interface WhisperServiceConfig {
  provider: 'groq' | 'openai' | 'custom' | 'local' | 'webspeech'
  groqApiKey?: string
  openaiApiKey?: string
  customEndpoint?: string
  model?: string
  cleanupDictation?: boolean
  transcriptionProfile?: WhisperTranscriptionProfile
}

const STORAGE_KEY = 'organon-whisper-service-config'

export const DEFAULT_WHISPER_CONFIG: WhisperServiceConfig = {
  provider: 'local',
  groqApiKey: '',
  openaiApiKey: '',
  customEndpoint: 'http://localhost:8080/v1/audio/transcriptions',
  model: 'ggml-base',
  transcriptionProfile: 'equilibrado',
}

export const WHISPER_TRANSCRIPTION_PROFILES: Record<WhisperTranscriptionProfile, {
  title: string
  description: string
  preferredProvider: WhisperServiceConfig['provider']
  preferredModel: string
  liveChunkMs: number
  liveFlushMs: number
  vadThreshold: number
  silenceMs: number
}> = {
  'pc-fraco': {
    title: 'PC fraco',
    description: 'Mais leve, com chunk menor e menor pressão no computador.',
    preferredProvider: 'local',
    preferredModel: 'ggml-tiny',
    liveChunkMs: 140,
    liveFlushMs: 1400,
    vadThreshold: 0.024,
    silenceMs: 1100,
  },
  equilibrado: {
    title: 'Equilibrado',
    description: 'Melhor balanço entre velocidade, custo e leitura.',
    preferredProvider: 'local',
    preferredModel: 'ggml-base',
    liveChunkMs: 90,
    liveFlushMs: 650,
    vadThreshold: 0.02,
    silenceMs: 650,
  },
  openwhisper: {
    title: 'OpenWhisper',
    description: 'Prioriza qualidade e backup em nuvem quando houver chave.',
    preferredProvider: 'groq',
    preferredModel: 'whisper-large-v3-turbo',
    liveChunkMs: 60,
    liveFlushMs: 420,
    vadThreshold: 0.016,
    silenceMs: 450,
  },
}

export function loadWhisperConfig(): WhisperServiceConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return { ...DEFAULT_WHISPER_CONFIG, ...parsed, provider: parsed.provider === 'webspeech' ? 'local' : (parsed.provider || 'local') }
    }
  } catch {}
  return DEFAULT_WHISPER_CONFIG
}

export function saveWhisperConfig(config: WhisperServiceConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    if (config.groqApiKey) localStorage.setItem('organon_groq_api_key', config.groqApiKey)
    if (config.openaiApiKey) localStorage.setItem('organon_openai_api_key', config.openaiApiKey)
  } catch {}
}

export function getWhisperTranscriptionProfile(
  config: WhisperServiceConfig = loadWhisperConfig()
): WhisperTranscriptionProfile {
  return config.transcriptionProfile || DEFAULT_WHISPER_CONFIG.transcriptionProfile || 'equilibrado'
}

export function getWhisperTranscriptionTuning(config: WhisperServiceConfig = loadWhisperConfig()) {
  return WHISPER_TRANSCRIPTION_PROFILES[getWhisperTranscriptionProfile(config)]
}

function normalizeHotword(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function trimToLength(value: string, maxLength: number): string {
  const trimmed = value.trim()
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function collectHotwords(context?: WhisperTranscriptionContext): string[] {
  const items = [
    ...(context?.hotwords || []),
    ...(context?.selectedSnippets || []),
    context?.projectName || '',
  ]
    .map(normalizeHotword)
    .filter(Boolean)

  const transcriptSeed = (context?.recentTranscript || '')
    .split(/\s+/)
    .map(token => token.replace(/[^\p{L}\p{N}_-]/gu, ''))
    .filter(token => token.length >= 4)
    .slice(0, 8)

  return Array.from(new Set([...items, ...transcriptSeed]))
    .slice(0, 12)
}

export function buildWhisperInitialPrompt(context?: WhisperTranscriptionContext): string {
  const modeLabel = context?.mode === 'interview'
    ? 'entrevista'
    : context?.mode === 'prompt'
      ? 'prompt por voz'
      : 'reunião'

  const hotwords = collectHotwords(context)
  const hotwordLine = hotwords.length > 0
    ? `Preserve estes termos: ${hotwords.join(', ')}.`
    : 'Preserve nomes próprios, siglas, números, termos técnicos e nomes de produtos.'

  const projectLine = context?.projectName
    ? `Projeto: ${trimToLength(context.projectName, 48)}.`
    : ''

  const transcriptLine = context?.recentTranscript?.trim()
    ? `Contexto recente: ${trimToLength(context.recentTranscript, 140)}`
    : ''

  const selectedLine = context?.selectedSnippets?.length
    ? `Trecho selecionado: ${trimToLength(context.selectedSnippets.join(' | '), 140)}`
    : ''

  const prompt = [
    'Transcreva em pt-BR com máxima fidelidade.',
    'Não resuma, não corrija o conteúdo e não invente palavras que não foram ditas.',
    `Modo da sessão: ${modeLabel}.`,
    projectLine,
    hotwordLine,
    transcriptLine,
    selectedLine,
  ].filter(Boolean).join(' ')

  return trimToLength(prompt, 760)
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''

  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function isBenignOfflineNotice(result: string): boolean {
  return (
    result.startsWith('[Modo Offline]') ||
    result.startsWith('[Transcrição via Web Speech API') ||
    result.startsWith('[Web Speech]')
  )
}

async function tryElectronFallback(
  audioBlob: Blob,
  modelId?: string,
  context?: WhisperTranscriptionContext
): Promise<string | null> {
  if (!window.electronAPI?.transcribeAudio) return null

  try {
    const arrayBuffer = await audioBlob.arrayBuffer()
    const base64 = arrayBufferToBase64(arrayBuffer)
    const res = await window.electronAPI.transcribeAudio(base64, modelId, {
      mode: context?.mode,
      initialPrompt: buildWhisperInitialPrompt(context),
      hotwords: collectHotwords(context),
      projectName: context?.projectName,
    })
    if (res && !res.startsWith('[Erro') && !isBenignOfflineNotice(res)) {
      return res
    }
  } catch (err) {
    console.warn('[WhisperService] Fallback Electron IPC falhou:', err)
  }

  return null
}

async function transcribePreparedAudio(
  audioBlob: Blob,
  config?: WhisperServiceConfig,
  context?: WhisperTranscriptionContext
): Promise<string> {
  const cfg = config || loadWhisperConfig()
  const prompt = buildWhisperInitialPrompt(context)

  if (cfg.provider === 'local' || cfg.provider === 'webspeech') {
    if (!window.electronAPI?.transcribeAudio) throw new Error('O motor local requer o aplicativo desktop.')
    return window.electronAPI.transcribeAudio(arrayBufferToBase64(await audioBlob.arrayBuffer()), cfg.model, { initialPrompt: prompt })
  }

  const mimeType = audioBlob.type || 'audio/webm'
  const extension = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('wav') ? 'wav' : 'webm'
  const audioFile = new File([audioBlob], `speech.${extension}`, { type: mimeType })

  try {
    // 1. Groq Whisper API (Gratuito, ultra-rápido ~0.5s)
    if (cfg.provider === 'groq') {
      const apiKey = cfg.groqApiKey || localStorage.getItem('organon_groq_api_key') || ''
      if (!apiKey) {
        throw new Error(
          'Chave de API Groq não configurada. Insira sua chave gratuita da Groq nas configurações para transcrição instantânea via Whisper Large v3.'
        )
      }

      const formData = new FormData()
      formData.append('file', audioFile)
      formData.append('model', cfg.model?.startsWith('whisper-large-v3') ? cfg.model : 'whisper-large-v3-turbo')
      formData.append('language', 'pt')
      formData.append('response_format', 'json')
      if (prompt) formData.append('prompt', prompt)

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
        signal: AbortSignal.timeout(120_000),
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson.error?.message || `Groq API respondeu com HTTP ${response.status}`)
      }

      const data = await response.json()
      return data.text ? data.text.trim() : ''
    }

    // 2. OpenAI Whisper API
    if (cfg.provider === 'openai') {
      const apiKey = cfg.openaiApiKey || localStorage.getItem('organon_openai_api_key') || ''
      if (!apiKey) {
        throw new Error('Chave de API da OpenAI não configurada.')
      }

      const formData = new FormData()
      formData.append('file', audioFile)
      formData.append('model', 'whisper-1')
      formData.append('language', 'pt')
      if (prompt) formData.append('prompt', prompt)

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
        signal: AbortSignal.timeout(120_000),
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson.error?.message || `OpenAI API respondeu com HTTP ${response.status}`)
      }

      const data = await response.json()
      return data.text ? data.text.trim() : ''
    }

    // 3. Endpoint Personalizado / Local (Self-Hosted / Ollama / Whisper Server)
    if (cfg.provider === 'custom') {
      const endpoint = cfg.customEndpoint || 'http://localhost:8080/v1/audio/transcriptions'
      const apiKey = cfg.openaiApiKey || cfg.groqApiKey || ''

      const formData = new FormData()
      formData.append('file', audioFile)
      formData.append('model', cfg.model || 'whisper-1')
      formData.append('language', 'pt')
      if (prompt) formData.append('prompt', prompt)

      const headers: Record<string, string> = {}
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: formData,
        signal: AbortSignal.timeout(120_000),
      })

      if (!response.ok) {
        throw new Error(`Endpoint customizado respondeu com HTTP ${response.status}`)
      }

      const data = await response.json()
      if (typeof data.text !== 'string' && typeof data.transcription !== 'string') throw new Error('Resposta sem transcrição válida.')
      return (data.text ?? data.transcription).trim()
    }

    throw new Error('Nenhum motor de transcrição válido selecionado.')
  } catch (err: any) {
    console.warn('[WhisperService] Erro ao enviar áudio para API do Whisper:', err)

    throw err
  }
}

async function transcribePreparedWithFallback(
  audioBlob: Blob,
  config?: WhisperServiceConfig,
  context?: WhisperTranscriptionContext
): Promise<string> {
  const cfg = config || loadWhisperConfig()
  const candidates = [{ ...cfg, provider: cfg.provider === 'webspeech' ? 'local' as const : cfg.provider }]

  let lastError: unknown

  for (const candidate of candidates) {
    try {
      const result = await transcribePreparedAudio(audioBlob, candidate, context)
      if (!result.startsWith('[Erro') && !isBenignOfflineNotice(result)) {
        return result
      }
    } catch (err) {
      lastError = err
    }
  }

  if (cfg.provider === 'local' || cfg.provider === 'webspeech') throw lastError || new Error('Falha no motor local.')

  const electronFallback = await tryElectronFallback(audioBlob, cfg.model, context)
  if (electronFallback) {
    return electronFallback
  }

  if (lastError instanceof Error) {
    throw lastError
  }

  throw new Error('Nenhum motor conseguiu transcrever. Verifique o provedor e os modelos instalados.')
}

export async function transcribeAudioBlobWithFallback(audioBlob: Blob, config?: WhisperServiceConfig, context?: WhisperTranscriptionContext): Promise<string> {
  const cfg = config || loadWhisperConfig()
  const wav = await normalizeWhisperAudio(audioBlob)
  const texts: string[] = []
  for (const part of await splitWhisperWav(wav)) {
    texts.push(await transcribePreparedWithFallback(part, cfg, context))
  }
  const text = texts.filter(Boolean).join('\n').trim()
  return cfg.cleanupDictation && context?.mode === 'prompt' ? cleanDictation(text) : text
}

export const transcribeAudioBlob = transcribeAudioBlobWithFallback

/** Optional, conservative cleanup; transcription punctuation still comes from Whisper. */
export function cleanDictation(text: string): string {
  const cleaned = text.replace(/\b(?:hum+|ahn+)\b[,;]?\s*/gi, '').replace(/\b([\p{L}]+)(?:[ \t]+\1\b)+/giu, '$1').replace(/[ \t]{2,}/g, ' ').trim()
  if (!cleaned) return ''
  return cleaned[0].toLocaleUpperCase('pt-BR') + cleaned.slice(1) + (/[.!?]$/.test(cleaned) ? '' : '.')
}
