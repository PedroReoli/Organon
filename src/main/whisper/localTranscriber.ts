import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { app } from 'electron'

import type { WhisperTranscriptionResult, WhisperTranscriptionSegment } from './transcription'

const run = promisify(execFile)
let active = false

interface WhisperJsonToken {
  text?: unknown
  offsets?: { from?: unknown; to?: unknown }
  p?: unknown
}

interface WhisperJsonSegment {
  text?: unknown
  offsets?: { from?: unknown; to?: unknown }
  tokens?: WhisperJsonToken[]
}

const finiteNumber = (value: unknown): number | undefined => (
  typeof value === 'number' && Number.isFinite(value) ? value : undefined
)

const isSpecialToken = (value: string): boolean => /^\[_.*_]$/.test(value.trim())

export function parseWhisperJson(payload: unknown, model: string): WhisperTranscriptionResult {
  const source = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
  const rawSegments = Array.isArray(source.transcription) ? source.transcription as WhisperJsonSegment[] : []
  const segments: WhisperTranscriptionSegment[] = rawSegments.flatMap(segment => {
    const text = typeof segment.text === 'string' ? segment.text.trim() : ''
    const startMs = finiteNumber(segment.offsets?.from)
    const endMs = finiteNumber(segment.offsets?.to)
    if (!text || startMs === undefined || endMs === undefined || endMs < startMs) return []

    const confidences = (Array.isArray(segment.tokens) ? segment.tokens : [])
      .filter(token => typeof token.text !== 'string' || !isSpecialToken(token.text))
      .map(token => finiteNumber(token.p))
      .filter((value): value is number => value !== undefined)
    const confidence = confidences.length > 0
      ? confidences.reduce((total, value) => total + value, 0) / confidences.length
      : undefined
    return [{ text, startMs, endMs, ...(confidence === undefined ? {} : { confidence }) }]
  })
  const result = source.result && typeof source.result === 'object'
    ? source.result as Record<string, unknown>
    : {}
  return {
    text: segments.map(segment => segment.text).join(' ').trim(),
    provider: 'local',
    model,
    language: typeof result.language === 'string' ? result.language : undefined,
    timingPrecision: segments.length > 0 ? 'segment' : 'none',
    segments,
  }
}

async function runTranscriptionDetailed(
  audioPath: string,
  modelPath: string,
  initialPrompt = '',
): Promise<WhisperTranscriptionResult> {
  const executable = process.env.ORGANON_WHISPER_CLI || path.join(
    app.isPackaged ? process.resourcesPath : app.getAppPath(),
    'resources', 'whisper', process.platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli',
  )
  try { await fs.access(executable) } catch {
    throw new Error('Motor Whisper nativo ausente. Execute npm run setup:whisper em Apps/desktop e gere novamente o instalador.')
  }
  await fs.access(modelPath)
  const header = Buffer.alloc(44)
  const file = await fs.open(audioPath, 'r')
  try { await file.read(header, 0, 44, 0) } finally { await file.close() }
  if (header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('O motor local requer WAV PCM. Grave ou importe o áudio pelo painel Whisper para converter.')
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'organon-native-whisper-'))
  try {
    const output = path.join(dir, 'transcript')
    await run(executable, [
      '-m', modelPath,
      '-f', audioPath,
      '-l', 'pt',
      '-ojf',
      '-of', output,
      '-t', String(Math.max(1, Math.min(4, os.cpus().length - 1))),
      ...(initialPrompt.trim() ? ['--prompt', initialPrompt.trim().slice(0, 760)] : []),
    ], {
      windowsHide: true,
      timeout: 600_000,
      maxBuffer: 4 * 1024 * 1024,
    })
    const parsed = parseWhisperJson(JSON.parse(await fs.readFile(`${output}.json`, 'utf8')), path.basename(modelPath, '.bin'))
    if (!parsed.text) throw new Error('O motor Whisper não retornou fala reconhecida.')
    return parsed
  } catch (error: any) {
    if (error?.message === 'O motor Whisper não retornou fala reconhecida.') throw error
    throw new Error(error?.killed
      ? 'A transcrição excedeu 10 minutos. Use um modelo menor.'
      : 'Falha no motor Whisper nativo. Verifique o modelo e as bibliotecas do executável.')
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
}

export async function transcribeAudioLocallyDetailed(
  audioPath: string,
  modelPath: string,
  initialPrompt = '',
): Promise<WhisperTranscriptionResult> {
  if (active) throw new Error('Whisper local ocupado. Aguarde a transcrição atual.')
  active = true
  try { return await runTranscriptionDetailed(audioPath, modelPath, initialPrompt) }
  finally { active = false }
}

export async function transcribeAudioLocally(audioPath: string, modelPath: string, initialPrompt = ''): Promise<string> {
  return (await transcribeAudioLocallyDetailed(audioPath, modelPath, initialPrompt)).text
}
