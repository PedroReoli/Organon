import { randomUUID } from 'crypto'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

import { getDataPath, safeResolveMeetingPath } from '../storage'

const MAX_AUDIO_BYTES = 512 * 1024 * 1024
const MAX_DIRECT_PATH_LENGTH = 4096
const STORED_MEETING_AUDIO = /^[A-Za-z0-9][A-Za-z0-9._-]{0,239}\.wav$/i

export interface ResolvedTranscriptionInput {
  path: string
  cleanup: boolean
}

interface ResolveTranscriptionInputOptions {
  dataPath?: string
  temporaryDirectory?: string
}

function isReadableFile(filePath: string): boolean {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile()
  } catch {
    return false
  }
}

function resolveStoredAudio(input: string, dataPath: string): string | null {
  if (!STORED_MEETING_AUDIO.test(input)) return null
  const storedPath = safeResolveMeetingPath(input, dataPath)
  return isReadableFile(storedPath) ? storedPath : null
}

function decodeWav(input: string): Buffer {
  const normalized = input.startsWith('data:') ? input.split(',', 2)[1] ?? '' : input
  const bytes = Buffer.from(normalized, 'base64')
  const isWav = bytes.length >= 44
    && bytes.toString('ascii', 0, 4) === 'RIFF'
    && bytes.toString('ascii', 8, 12) === 'WAVE'
  if (!isWav) throw new Error('Áudio inválido: envie WAV PCM.')
  if (bytes.length > MAX_AUDIO_BYTES) throw new Error('Áudio excede o limite de 512 MB.')
  return bytes
}

/** Resolves imported files, persisted meeting tracks, or renderer-provided WAV base64. */
export function resolveTranscriptionInput(
  input: string,
  options: ResolveTranscriptionInputOptions = {},
): ResolvedTranscriptionInput {
  if (typeof input !== 'string' || !input.trim()) throw new Error('Áudio vazio.')
  const trimmed = input.trim()
  const dataPath = options.dataPath ?? getDataPath()

  if (trimmed.length <= MAX_DIRECT_PATH_LENGTH) {
    if (isReadableFile(trimmed)) return { path: path.resolve(trimmed), cleanup: false }
    const storedPath = resolveStoredAudio(trimmed, dataPath)
    if (storedPath) return { path: storedPath, cleanup: false }
  }

  const temporaryDirectory = options.temporaryDirectory
    ?? path.join(os.tmpdir(), 'organon-whisper')
  fs.mkdirSync(temporaryDirectory, { recursive: true })
  const tempPath = path.join(temporaryDirectory, `audio-${Date.now()}-${randomUUID()}.wav`)
  fs.writeFileSync(tempPath, decodeWav(trimmed))
  return { path: tempPath, cleanup: true }
}
