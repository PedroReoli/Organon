import { app, ipcMain } from 'electron'
import { exec, spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { createHash, randomUUID } from 'crypto'
import { pathToFileURL } from 'url'

import { registerMeetingResearchIpc } from './meeting.ipc'
import {
  downloadWhisperModel,
  getWhisperDownloadProgress,
  listLocalModels,
  transcribeLocalAudio,
  transcribeLocalAudioDetailed,
  type WhisperTranscriptionResult,
} from '../whisper'
import {
  getDataPath,
  safeResolveMeetingPath,
  safeResolveNotePath,
  writeTextFileAtomic,
  listProjectFiles,
  readProjectFile,
  searchProjectText,
} from '../storage'
import { showOpenDialog } from '../core'
import { analyzeTranscriptSelection, generateTranscriptNote } from '../meeting'
import { getSecret, getSecretStatus, setSecret } from '../security/secretStore'

const launchExe = (exePath: string): boolean => {
  try {
    const child = spawn(exePath, [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    })
    child.unref()
    return true
  } catch (error) {
    console.error('Erro ao abrir executavel:', error)
    return false
  }
}

const TEMP_TRANSCRIBE_DIR = path.join(os.tmpdir(), 'organon-whisper')
const MAX_MEETING_AUDIO_BYTES = 512 * 1024 * 1024

type MeetingAudioMetadata = {
  path: string
  sha256: string
  bytes: number
  codec: string
  durationMs: number
}

function validateMeetingId(meetingId: string): string {
  const normalized = meetingId?.trim()
  if (!normalized || !/^[A-Za-z0-9_-]{1,120}$/.test(normalized)) {
    throw new Error('Identificador de reuniao invalido.')
  }
  return normalized
}

function decodeWavBase64(input: string): Buffer {
  if (typeof input !== 'string' || !input.trim()) throw new Error('Audio vazio.')
  const normalized = input.trim().startsWith('data:') ? input.trim().split(',', 2)[1] ?? '' : input.trim()
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 !== 0) {
    throw new Error('Audio base64 invalido.')
  }
  const bytes = Buffer.from(normalized, 'base64')
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Audio invalido: envie WAV PCM.')
  }
  if (bytes.length > MAX_MEETING_AUDIO_BYTES) throw new Error('Audio excede o limite de 512 MB.')
  return bytes
}

function writeBufferAtomic(targetPath: string, buffer: Buffer): void {
  const tempPath = `${targetPath}.${process.pid}.${randomUUID()}.tmp`
  const backupPath = `${targetPath}.${process.pid}.${randomUUID()}.bak`
  fs.writeFileSync(tempPath, buffer)
  let movedExisting = false
  try {
    if (fs.existsSync(targetPath)) {
      fs.renameSync(targetPath, backupPath)
      movedExisting = true
    }
    fs.renameSync(tempPath, targetPath)
    if (movedExisting && fs.existsSync(backupPath)) fs.unlinkSync(backupPath)
  } catch (error) {
    if (!fs.existsSync(targetPath) && movedExisting && fs.existsSync(backupPath)) fs.renameSync(backupPath, targetPath)
    throw error
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
  }
}

type ObsidianMeetingExport = {
  id: string
  title: string
  createdAt: string
  durationSeconds: number
  mode?: 'meeting' | 'interview' | 'prompt'
  fullTranscript: string
  segments?: Array<{ speakerName?: string; timestamp?: string; text?: string; startMs?: number }>
  intelligenceData?: {
    executiveSummary?: string
    decisions?: Array<{ text?: string; confirmed?: boolean }>
    actionItems?: Array<{ task?: string; assignee?: string; status?: string; confirmed?: boolean }>
  }
  audioPath?: string
}

function sanitizeObsidianFileName(value: string): string {
  const sanitized = value
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/[. ]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return (sanitized || 'Reuniao').slice(0, 100)
}

function yamlString(value: string): string {
  return JSON.stringify(value.replace(/[\r\n]+/g, ' ').trim())
}

function buildObsidianMeetingMarkdown(meeting: ObsidianMeetingExport, audioLink?: string): string {
  const intelligence = meeting.intelligenceData
  const decisions = (intelligence?.decisions || []).filter(item => item?.text?.trim())
  const actionItems = (intelligence?.actionItems || []).filter(item => item?.task?.trim())
  const segments = (meeting.segments || []).filter(segment => segment?.text?.trim())
  const lines = [
    '---',
    `organon_id: ${yamlString(meeting.id)}`,
    `title: ${yamlString(meeting.title)}`,
    `created_at: ${yamlString(meeting.createdAt)}`,
    `duration_seconds: ${Math.max(0, Number(meeting.durationSeconds) || 0)}`,
    `mode: ${yamlString(meeting.mode || 'meeting')}`,
    'source: organon',
    '---',
    '',
    `# ${meeting.title.trim() || 'Reuniao'}`,
    '',
  ]

  if (audioLink) lines.push('## Audio original', '', `![[${audioLink}]]`, '')
  if (intelligence?.executiveSummary?.trim()) {
    lines.push('## Resumo executivo', '', intelligence.executiveSummary.trim(), '')
  }
  if (decisions.length) {
    lines.push('## Decisoes', '', ...decisions.map(item => `- [${item.confirmed ? 'x' : ' '}] ${item.text!.trim()}`), '')
  }
  if (actionItems.length) {
    lines.push('## Acoes', '', ...actionItems.map(item => {
      const owner = item.assignee?.trim() ? ` @${item.assignee.trim()}` : ''
      return `- [${item.status === 'done' ? 'x' : ' '}] ${item.task!.trim()}${owner}`
    }), '')
  }

  lines.push('## Transcricao', '')
  if (segments.length) {
    for (const segment of segments) {
      const label = [segment.timestamp, segment.speakerName].filter(Boolean).join(' - ')
      lines.push(label ? `**${label}**` : '**Trecho**', '', segment.text!.trim(), '')
    }
  } else {
    lines.push(meeting.fullTranscript?.trim() || '_Sem transcricao._', '')
  }
  return `${lines.join('\n').trim()}\n`
}

type CloudTranscriptionRequest = {
  audioBase64: string
  provider: 'groq' | 'openai' | 'custom'
  model?: string
  customEndpoint?: string
  initialPrompt?: string
}

function normalizeCloudTranscription(
  payload: Record<string, unknown>,
  provider: 'groq' | 'openai' | 'custom',
  model: string,
): WhisperTranscriptionResult {
  const text = payload.text ?? payload.transcription
  if (typeof text !== 'string') throw new Error('Resposta do provedor sem transcricao valida.')
  const rawSegments = Array.isArray(payload.segments) ? payload.segments : []
  const segments = rawSegments.flatMap(rawSegment => {
    if (!rawSegment || typeof rawSegment !== 'object') return []
    const segment = rawSegment as Record<string, unknown>
    if (typeof segment.text !== 'string' || typeof segment.start !== 'number' || typeof segment.end !== 'number') return []
    const words = (Array.isArray(segment.words) ? segment.words : []).flatMap(rawWord => {
      if (!rawWord || typeof rawWord !== 'object') return []
      const word = rawWord as Record<string, unknown>
      const wordText = typeof word.word === 'string' ? word.word : typeof word.text === 'string' ? word.text : ''
      if (!wordText || typeof word.start !== 'number' || typeof word.end !== 'number') return []
      return [{
        text: wordText,
        startMs: Math.round(word.start * 1000),
        endMs: Math.round(word.end * 1000),
        ...(typeof word.probability === 'number' ? { confidence: word.probability } : {}),
      }]
    })
    return [{
      text: segment.text.trim(),
      startMs: Math.round(segment.start * 1000),
      endMs: Math.round(segment.end * 1000),
      ...(typeof segment.avg_logprob === 'number' ? { confidence: Math.exp(segment.avg_logprob) } : {}),
      ...(words.length > 0 ? { words } : {}),
    }]
  })
  const hasWords = segments.some(segment => segment.words?.length)
  return {
    text: text.trim(),
    provider,
    model,
    language: typeof payload.language === 'string' ? payload.language : undefined,
    timingPrecision: hasWords ? 'word' : segments.length > 0 ? 'segment' : 'none',
    segments,
  }
}

async function transcribeCloudAudioDetailed(request: CloudTranscriptionRequest): Promise<WhisperTranscriptionResult> {
  const audio = decodeWavBase64(request?.audioBase64)
  const provider = request?.provider
  if (!['groq', 'openai', 'custom'].includes(provider)) throw new Error('Provedor cloud invalido.')

  let endpoint: string
  let apiKey: string | null
  let model: string
  if (provider === 'groq') {
    endpoint = 'https://api.groq.com/openai/v1/audio/transcriptions'
    apiKey = getSecret('whisper.groq')
    model = request.model?.startsWith('whisper-large-v3') ? request.model : 'whisper-large-v3-turbo'
  } else if (provider === 'openai') {
    endpoint = 'https://api.openai.com/v1/audio/transcriptions'
    apiKey = getSecret('whisper.openai')
    model = 'whisper-1'
  } else {
    endpoint = request.customEndpoint?.trim() || 'http://localhost:8080/v1/audio/transcriptions'
    const parsedEndpoint = new URL(endpoint)
    if (!['http:', 'https:'].includes(parsedEndpoint.protocol)) throw new Error('Endpoint customizado invalido.')
    apiKey = getSecret('whisper.custom')
    model = request.model?.trim() || 'whisper-1'
  }
  if (provider !== 'custom' && !apiKey) throw new Error(`Chave de API ${provider} nao configurada no cofre seguro.`)

  const formData = new FormData()
  formData.append('file', new Blob([Uint8Array.from(audio)], { type: 'audio/wav' }), 'speech.wav')
  formData.append('model', model)
  formData.append('language', 'pt')
  if (provider === 'groq' || provider === 'openai') formData.append('response_format', 'verbose_json')
  if (provider === 'openai') formData.append('timestamp_granularities[]', 'segment')
  const prompt = trimPrompt(request.initialPrompt)
  if (prompt) formData.append('prompt', prompt)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    body: formData,
    signal: AbortSignal.timeout(120_000),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(payload.error?.message || `Provedor cloud respondeu com HTTP ${response.status}.`)
  }
  const payload = await response.json() as Record<string, unknown>
  return normalizeCloudTranscription(payload, provider, model)
}

async function transcribeCloudAudio(request: CloudTranscriptionRequest): Promise<string> {
  return (await transcribeCloudAudioDetailed(request)).text
}

function resolveTranscriptionInput(input: string): { path: string; cleanup: boolean } {
  if (typeof input !== 'string' || !input.trim()) throw new Error('Áudio vazio.')
  const trimmed = input.trim()
  if (trimmed && fs.existsSync(trimmed) && fs.statSync(trimmed).isFile()) {
    return { path: trimmed, cleanup: false }
  }

  fs.mkdirSync(TEMP_TRANSCRIBE_DIR, { recursive: true })
  const tempPath = path.join(TEMP_TRANSCRIBE_DIR, `audio-${Date.now()}-${randomUUID()}.wav`)

  const normalizedBase64 = trimmed.startsWith('data:')
    ? trimmed.split(',', 2)[1] ?? ''
    : trimmed

  const bytes = Buffer.from(normalizedBase64, 'base64')
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Áudio inválido: envie WAV PCM.')
  fs.writeFileSync(tempPath, bytes)
  return { path: tempPath, cleanup: true }
}

type TranscriptionRequestOptions = {
  initialPrompt?: string
  mode?: 'meeting' | 'interview' | 'prompt'
  hotwords?: string[]
  projectName?: string
}

function trimPrompt(value?: string): string {
  const text = (value || '').trim()
  if (text.length <= 760) return text
  return `${text.slice(0, 759).trimEnd()}...`
}

function stripHtmlTags(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

async function searchWeb(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const cleaned = query?.trim() || ''
  if (cleaned.length < 2) return []

  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleaned)}`
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    })

    if (!response.ok) return []

    const html = await response.text()
    const results: Array<{ title: string; url: string; snippet: string }> = []
    const blockRegex = /<div class="result__body">([\s\S]*?)<\/div>\s*<\/div>/g
    let blockMatch: RegExpExecArray | null

    while ((blockMatch = blockRegex.exec(html)) && results.length < 5) {
      const block = blockMatch[1]
      const linkMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
      if (!linkMatch) continue

      const rawUrl = linkMatch[1]
      const title = stripHtmlTags(linkMatch[2])
      const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/) ||
        block.match(/<div[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/div>/)

      let decodedUrl = rawUrl
      try {
        const parsed = new URL(rawUrl, 'https://duckduckgo.com')
        const redirected = parsed.searchParams.get('uddg')
        if (redirected) decodedUrl = decodeURIComponent(redirected)
      } catch {}

      results.push({
        title: title || cleaned,
        url: decodedUrl,
        snippet: stripHtmlTags(snippetMatch?.[1] || `Busca para "${cleaned}".`),
      })
    }

    return results
  } catch (error) {
    console.warn('Erro na busca web:', error)
    return []
  }
}

export const registerContentIpcHandlers = (): void => {
  registerMeetingResearchIpc()
  ipcMain.handle('project:selectFolder', async () => {
    try {
      const result = await showOpenDialog({
        title: 'Selecionar pasta do projeto local (Somente Leitura)',
        properties: ['openDirectory'],
      })
      if (result.canceled || result.filePaths.length === 0) return null
      const selectedPath = result.filePaths[0]
      return {
        name: path.basename(selectedPath),
        path: selectedPath,
      }
    } catch {
      return null
    }
  })

  ipcMain.handle('project:listFiles', (_event, projectPath: string) => {
    return listProjectFiles(projectPath)
  })

  ipcMain.handle('project:readFile', (_event, projectPath: string, relativePath: string) => {
    return readProjectFile(projectPath, relativePath)
  })

  ipcMain.handle('project:searchText', (_event, projectPath: string, query: string) => {
    return searchProjectText(projectPath, query)
  })

  ipcMain.handle('web:search', async (_event, query: string) => {
    return searchWeb(query)
  })

  ipcMain.handle('notes:read', (_event, mdPath: string) => {
    try {
      const absPath = safeResolveNotePath(mdPath, getDataPath())
      if (!fs.existsSync(absPath)) return ''
      return fs.readFileSync(absPath, 'utf-8')
    } catch (error) {
      console.error('Erro ao ler nota:', error)
      return ''
    }
  })

  ipcMain.handle('notes:write', (_event, mdPath: string, content: string) => {
    try {
      const absPath = safeResolveNotePath(mdPath, getDataPath())
      return writeTextFileAtomic(absPath, content ?? '')
    } catch (error) {
      console.error('Erro ao salvar nota:', error)
      return false
    }
  })

  ipcMain.handle('notes:delete', (_event, mdPath: string) => {
    try {
      const absPath = safeResolveNotePath(mdPath, getDataPath())
      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath)
      }
      return true
    } catch (error) {
      console.error('Erro ao remover nota:', error)
      return false
    }
  })

  ipcMain.handle('transcript:analyzeSelection', (_event, request: { text: string; mode?: 'meeting' | 'interview' | 'prompt' }) => {
    try {
      return analyzeTranscriptSelection(request)
    } catch (error) {
      console.error('Erro ao analisar selecao do transcript:', error)
      return {
        intent: 'note' as const,
        summary: '',
        suggestions: [],
      }
    }
  })

  ipcMain.handle('transcript:generateNote', (_event, request: {
    title?: string
    transcript: string
    mode?: 'meeting' | 'interview' | 'prompt'
    selectedSnippets?: string[]
    customInstructions?: string
  }) => {
    try {
      return generateTranscriptNote(request)
    } catch (error) {
      console.error('Erro ao gerar nota de transcript:', error)
      return {
        title: request?.title?.trim() || 'Nota',
        markdown: request?.transcript?.trim() || '',
        summary: '',
        highlights: [],
        questions: [],
        decisions: [],
        actionItems: [],
        words: 0,
        segments: 0,
      }
    }
  })

  ipcMain.handle('meetings:saveAudioPackage', (_event, request: {
    meetingId: string
    audioBase64: string
    durationMs?: number
    codec?: string
  }): MeetingAudioMetadata => {
    try {
      const dataPath = getDataPath()
      const meetingId = validateMeetingId(request?.meetingId)
      const audioName = `${meetingId}.wav`
      const absPath = safeResolveMeetingPath(audioName, dataPath)
      const buffer = decodeWavBase64(request?.audioBase64)
      const metadata: MeetingAudioMetadata = {
        path: audioName,
        sha256: createHash('sha256').update(buffer).digest('hex'),
        bytes: buffer.length,
        codec: request?.codec?.trim() || 'audio/wav; codecs=pcm',
        durationMs: Math.max(0, Math.round(Number(request?.durationMs) || 0)),
      }
      writeBufferAtomic(absPath, buffer)
      const metadataPath = safeResolveMeetingPath(`${meetingId}.audio.json`, dataPath)
      if (!writeTextFileAtomic(metadataPath, JSON.stringify(metadata, null, 2))) {
        throw new Error('Falha ao gravar metadados do audio.')
      }
      return metadata
    } catch (error) {
      console.error('Erro ao salvar pacote de audio:', error)
      throw error
    }
  })

  ipcMain.handle('meetings:saveAudio', (_event, meetingId: string, audioBase64: string) => {
    const normalizedId = validateMeetingId(meetingId)
    const audioName = `${normalizedId}.wav`
    writeBufferAtomic(safeResolveMeetingPath(audioName, getDataPath()), decodeWavBase64(audioBase64))
    return audioName
  })

  ipcMain.handle('meetings:getAudioUrl', (_event, audioPath: string) => {
    const absPath = safeResolveMeetingPath(audioPath, getDataPath())
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) return null
    return pathToFileURL(absPath).toString()
  })

  ipcMain.handle('meetings:selectObsidianVault', async () => {
    const result = await showOpenDialog({
      title: 'Selecionar cofre do Obsidian',
      properties: ['openDirectory'],
    })
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
  })

  ipcMain.handle('meetings:exportObsidian', (_event, request: {
    vaultPath: string
    meeting: ObsidianMeetingExport
  }) => {
    const requestedVaultPath = request?.vaultPath?.trim()
    if (!requestedVaultPath || !path.isAbsolute(requestedVaultPath)) throw new Error('Cofre do Obsidian invalido.')
    const vaultPath = path.resolve(requestedVaultPath)
    if (!fs.existsSync(vaultPath) || !fs.statSync(vaultPath).isDirectory()) {
      throw new Error('Cofre do Obsidian invalido.')
    }
    const meeting = request?.meeting
    const meetingId = validateMeetingId(meeting?.id)
    if (!meeting?.title?.trim() || !meeting?.createdAt || typeof meeting?.fullTranscript !== 'string') {
      throw new Error('Dados da reuniao invalidos para exportacao.')
    }

    const organonDir = path.join(vaultPath, 'Organon')
    const meetingsDir = path.join(organonDir, 'Reunioes')
    const assetsDir = path.join(organonDir, 'Assets')
    fs.mkdirSync(meetingsDir, { recursive: true })
    fs.mkdirSync(assetsDir, { recursive: true })

    const stableSuffix = `--${meetingId}.md`
    const existingName = fs.readdirSync(meetingsDir).find(name => name.endsWith(stableSuffix))
    const noteName = existingName || `${sanitizeObsidianFileName(meeting.title)}${stableSuffix}`
    const notePath = path.join(meetingsDir, noteName)
    let audioLink: string | undefined
    let exportedAudioPath: string | undefined

    if (meeting.audioPath) {
      const sourceAudioPath = safeResolveMeetingPath(meeting.audioPath, getDataPath())
      if (fs.existsSync(sourceAudioPath) && fs.statSync(sourceAudioPath).isFile()) {
        const audioName = `${meetingId}${path.extname(sourceAudioPath).toLowerCase() || '.wav'}`
        exportedAudioPath = path.join(assetsDir, audioName)
        writeBufferAtomic(exportedAudioPath, fs.readFileSync(sourceAudioPath))
        audioLink = `Organon/Assets/${audioName}`
      }
    }

    writeBufferAtomic(notePath, Buffer.from(buildObsidianMeetingMarkdown(meeting, audioLink), 'utf-8'))
    return { success: true, notePath, audioPath: exportedAudioPath }
  })

  ipcMain.handle('meetings:deleteAudio', (_event, audioPath: string) => {
    try {
      const absPath = safeResolveMeetingPath(audioPath, getDataPath())
      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath)
      }
      return true
    } catch (error) {
      console.error('Erro ao remover audio:', error)
      return false
    }
  })

  ipcMain.handle('whisper:downloadModel', (_event, modelId: string) => downloadWhisperModel(modelId))
  ipcMain.handle('whisper:downloadProgress', () => getWhisperDownloadProgress())

  ipcMain.handle('whisper:listLocalModels', async () => {
    try {
      return listLocalModels()
    } catch (error) {
      console.error('Erro ao listar modelos Whisper locais:', error)
      return []
    }
  })

  ipcMain.handle('whisper:secretStatus', () => getSecretStatus())

  ipcMain.handle('whisper:saveSecrets', (_event, secrets: {
    groqApiKey?: string
    openaiApiKey?: string
    customApiKey?: string
  }) => {
    if (secrets?.groqApiKey?.trim()) setSecret('whisper.groq', secrets.groqApiKey)
    if (secrets?.openaiApiKey?.trim()) setSecret('whisper.openai', secrets.openaiApiKey)
    if (secrets?.customApiKey?.trim()) setSecret('whisper.custom', secrets.customApiKey)
    return getSecretStatus()
  })

  ipcMain.handle('whisper:transcribeCloud', (_event, request: CloudTranscriptionRequest) => {
    return transcribeCloudAudio(request)
  })
  ipcMain.handle('whisper:transcribeCloudDetailed', (_event, request: CloudTranscriptionRequest) => {
    return transcribeCloudAudioDetailed(request)
  })

  ipcMain.handle('meetings:transcribe', async (
    _event,
    audioPath: string,
    modelId?: string,
    options?: TranscriptionRequestOptions
  ) => {
    const resolved = resolveTranscriptionInput(audioPath)

    try {
      const absPath = resolved.path

      if (!fs.existsSync(absPath)) {
        return '[Erro: arquivo de audio nao encontrado]'
      }

      return await transcribeLocalAudio(absPath, modelId, trimPrompt(options?.initialPrompt))
    } catch (error) {
      console.error('Erro na transcricao:', error)
      throw new Error(error instanceof Error ? error.message : 'Erro ao transcrever áudio')
    } finally {
      if (resolved.cleanup) {
        try {
          if (fs.existsSync(resolved.path)) {
            fs.unlinkSync(resolved.path)
          }
        } catch {}
      }
    }
  })

  ipcMain.handle('meetings:transcribeDetailed', async (
    _event,
    audioPath: string,
    modelId?: string,
    options?: TranscriptionRequestOptions
  ) => {
    const resolved = resolveTranscriptionInput(audioPath)
    try {
      if (!fs.existsSync(resolved.path)) throw new Error('Arquivo de audio nao encontrado.')
      return await transcribeLocalAudioDetailed(resolved.path, modelId, trimPrompt(options?.initialPrompt))
    } catch (error) {
      console.error('Erro na transcricao detalhada:', error)
      throw new Error(error instanceof Error ? error.message : 'Erro ao transcrever áudio')
    } finally {
      if (resolved.cleanup) {
        try { if (fs.existsSync(resolved.path)) fs.unlinkSync(resolved.path) } catch {}
      }
    }
  })

  ipcMain.handle('apps:selectExe', async () => {
    const result = await showOpenDialog({
      title: 'Selecionar executavel (.exe)',
      properties: ['openFile'],
      filters: [{ name: 'Executavel', extensions: ['exe'] }],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const exePath = result.filePaths[0]
    const name = path.basename(exePath).replace(/\.exe$/i, '')
    let iconDataUrl: string | null = null

    try {
      const icon = await app.getFileIcon(exePath, { size: 'large' })
      iconDataUrl = icon.toDataURL()
    } catch {
      iconDataUrl = null
    }

    return { exePath, name, iconDataUrl }
  })

  ipcMain.handle('apps:launch', (_event, exePath: string) => {
    return launchExe(exePath)
  })

  ipcMain.handle('apps:launchWithArgs', (_event, exePath: string, args: string[]) => {
    try {
      const child = spawn(exePath, args || [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      })
      child.unref()
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('apps:launchMany', async (_event, exePaths: string[], mode: 'sequential' | 'simultaneous') => {
    try {
      const unique = Array.isArray(exePaths) ? exePaths.filter(Boolean) : []
      if (mode === 'sequential') {
        for (const exePath of unique) {
          launchExe(exePath)
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } else {
        for (const exePath of unique) {
          launchExe(exePath)
        }
      }
      return true
    } catch (error) {
      console.error('Erro ao executar macro:', error)
      return false
    }
  })

  ipcMain.handle('apps:checkRunning', (_event, exePaths: string[]) => {
    return new Promise<string[]>(resolve => {
      exec('tasklist /fo csv /nh', (err, stdout) => {
        if (err) { resolve([]); return }
        const runningNames = new Set(
          stdout.split('\n')
            .map(line => line.split(',')[0]?.replace(/"/g, '').toLowerCase().trim())
            .filter(Boolean)
        )
        const running = (Array.isArray(exePaths) ? exePaths : []).filter(p => {
          const basename = path.basename(p).toLowerCase()
          return runningNames.has(basename)
        })
        resolve(running)
      })
    })
  })

  // Scans Start Menu .lnk shortcuts and resolves .exe targets
  ipcMain.handle('apps:scanInstalled', () => {
    return new Promise<Array<{ name: string; exePath: string }>>(resolve => {
      const scanDirs = [
        path.join(process.env['APPDATA'] ?? '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
        path.join(process.env['ProgramData'] ?? '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      ]

      const psScript = [
        `$dirs = @(${scanDirs.map(d => `'${d.replace(/'/g, "''")}'`).join(',')})`,
        '$results = @()',
        'foreach ($dir in $dirs) {',
        '  if (-not (Test-Path $dir)) { continue }',
        '  Get-ChildItem -Path $dir -Recurse -Filter "*.lnk" -ErrorAction SilentlyContinue | ForEach-Object {',
        '    try {',
        '      $sh = New-Object -ComObject WScript.Shell',
        '      $lnk = $sh.CreateShortcut($_.FullName)',
        '      $t = $lnk.TargetPath',
        '      if ($t -match "\\.exe$" -and (Test-Path $t)) {',
        '        $results += [PSCustomObject]@{ name = $_.BaseName; path = $t }',
        '      }',
        '    } catch {}',
        '  }',
        '}',
        '$results | Select-Object -Unique name, path | ConvertTo-Json -Compress',
      ].join('\n')

      const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
      exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
        { timeout: 25000 },
        (err, stdout) => {
          if (err || !stdout.trim()) { resolve([]); return }
          try {
            const raw = JSON.parse(stdout.trim())
            const items = Array.isArray(raw) ? raw : [raw]
            const seen = new Set<string>()
            const result: Array<{ name: string; exePath: string }> = []
            for (const item of items) {
              const p = item.path ?? item.Path
              const n = item.name ?? item.Name
              if (typeof p === 'string' && typeof n === 'string' && !seen.has(p.toLowerCase())) {
                seen.add(p.toLowerCase())
                result.push({ name: n, exePath: p })
              }
            }
            resolve(result)
          } catch { resolve([]) }
        }
      )
    })
  })

  // Lists all currently running .exe processes with their full path (Windows only)
  ipcMain.handle('apps:scanRunning', () => {
    return new Promise<Array<{ name: string; exePath: string }>>(resolve => {
      const psScript = [
        'Get-Process | Where-Object { $_.Path -and $_.Path -match \'\\.exe$\' } |',
        'Select-Object @{N="name";E={$_.Name}}, @{N="path";E={$_.Path}} |',
        'Sort-Object name -Unique |',
        'ConvertTo-Json -Compress',
      ].join(' ')
      const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
      exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
        { timeout: 10000 },
        (err, stdout) => {
          if (err || !stdout.trim()) { resolve([]); return }
          try {
            const raw = JSON.parse(stdout.trim())
            const items = Array.isArray(raw) ? raw : [raw]
            const seen = new Set<string>()
            const result: Array<{ name: string; exePath: string }> = []
            for (const item of items) {
              const p = (item.path ?? item.Path ?? '') as string
              const n = (item.name ?? item.Name ?? '') as string
              if (p && n && !seen.has(p.toLowerCase())) {
                seen.add(p.toLowerCase())
                result.push({ name: n, exePath: p })
              }
            }
            resolve(result)
          } catch { resolve([]) }
        }
      )
    })
  })

  // Detectar apps instalados (Upgrade 19)
  ipcMain.handle('apps:detectInstalled', () => {
    return new Promise<Array<{ name: string; exePath: string; iconPath?: string }>>(resolve => {
      const commonPaths = [
        'C:\\Program Files',
        'C:\\Program Files (x86)',
        process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Programs') : null,
        process.env.APPDATA ? path.join(process.env.APPDATA, 'Microsoft\\Windows\\Start Menu\\Programs') : null,
      ].filter(Boolean) as string[]

      const psScript = [
        `$paths = @(${commonPaths.map(p => `'${p}'`).join(',')})`,
        '$apps = @()',
        'foreach ($p in $paths) {',
        '  if (Test-Path $p) {',
        '    Get-ChildItem -Path $p -Recurse -Filter "*.exe" -ErrorAction SilentlyContinue |',
        '    Where-Object { $_.Name -notmatch "unins|uninst|update|setup|install" } |',
        '    Select-Object @{N="name";E={$_.BaseName}}, @{N="path";E={$_.FullName}} |',
        '    ForEach-Object { $apps += $_ }',
        '  }',
        '}',
        '$apps | Sort-Object name -Unique | Select-Object -First 200 | ConvertTo-Json -Compress',
      ].join(' ')

      const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
      exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
        { timeout: 30000 },
        (err, stdout) => {
          if (err || !stdout.trim()) { resolve([]); return }
          try {
            const raw = JSON.parse(stdout.trim())
            const items = Array.isArray(raw) ? raw : [raw]
            const seen = new Set<string>()
            const result: Array<{ name: string; exePath: string }> = []
            for (const item of items) {
              const p = (item.path ?? item.Path ?? '') as string
              const n = (item.name ?? item.Name ?? '') as string
              if (p && n && !seen.has(p.toLowerCase())) {
                seen.add(p.toLowerCase())
                result.push({ name: n, exePath: p })
              }
            }
            resolve(result)
          } catch { resolve([]) }
        }
      )
    })
  })

  // Extrair ícone de .exe (Upgrade 19)
  ipcMain.handle('apps:extractIcon', async (_event, exePath: string) => {
    try {
      const icon = await app.getFileIcon(exePath, { size: 'normal' })
      if (icon && !icon.isEmpty()) {
        return icon.toDataURL()
      }
      return null
    } catch (error) {
      console.error('Erro ao extrair ícone:', error)
      return null
    }
  })

  ipcMain.handle('apps:getMemory', (_event, exePaths: string[]) => {
    return new Promise<Record<string, number>>(resolve => {
      exec('tasklist /fo csv /nh /v', (err, stdout) => {
        if (err) { resolve({}); return }
        const memMap = new Map<string, number>() // basename.lower -> KB total
        for (const line of stdout.split('\n')) {
          const parts = line.split('","')
          if (parts.length < 5) continue
          const name = parts[0].replace(/"/g, '').toLowerCase().trim()
          const memStr = parts[4].replace(/"/g, '').replace(/,/g, '').replace(/\s*K/i, '').trim()
          const kb = parseInt(memStr, 10)
          if (!isNaN(kb) && kb > 0) memMap.set(name, (memMap.get(name) ?? 0) + kb)
        }
        const result: Record<string, number> = {}
        for (const exePath of (Array.isArray(exePaths) ? exePaths : [])) {
          const base = path.basename(exePath).toLowerCase()
          const kb = memMap.get(base)
          if (kb !== undefined) result[exePath] = Math.round(kb / 1024) // MB
        }
        resolve(result)
      })
    })
  })
}
