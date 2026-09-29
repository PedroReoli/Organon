import { createHash } from 'crypto'
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

import { AVAILABLE_MODELS, type WhisperModelInfo } from './engine'

const MODELS_DIR = process.env.ORGANON_WHISPER_MODELS_DIR?.trim()
  || path.join(app.getPath('userData'), 'models', 'whisper')
export const WHISPER_INSTALL_BUNDLE = ['ggml-tiny', 'ggml-base', 'ggml-small'] as const

interface WhisperModelManifest {
  schemaVersion: 1
  modelId: string
  modelVersion: string
  sizeBytes: number
  sha256: string
  sourceUrl: string
  verifiedAt: string
}

class ModelIntegrityError extends Error {}

export function ensureWhisperModelsDir(): string {
  if (!fs.existsSync(MODELS_DIR)) fs.mkdirSync(MODELS_DIR, { recursive: true })
  return MODELS_DIR
}

export function listAvailableWhisperModels(): WhisperModelInfo[] {
  const dir = ensureWhisperModelsDir()
  return AVAILABLE_MODELS.map(model => {
    const filePath = path.join(dir, `${model.id}.bin`)
    return {
      ...model,
      downloaded: fs.existsSync(filePath) && fs.statSync(filePath).size === model.sizeBytes,
    }
  })
}

function getWhisperModelFilePath(modelId: string): string {
  return path.join(ensureWhisperModelsDir(), `${modelId}.bin`)
}

const downloads = new Map<string, Promise<WhisperModelInfo>>()
const progress = new Map<string, { received: number; total: number; error?: string }>()
export const getWhisperDownloadProgress = () => Object.fromEntries(progress)

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  await pipeline(fs.createReadStream(filePath), hash)
  return hash.digest('hex')
}

async function verifyModelFile(filePath: string, model: WhisperModelInfo): Promise<boolean> {
  try {
    if (fs.statSync(filePath).size !== model.sizeBytes) return false
    return (await sha256File(filePath)) === model.sha256
  } catch {
    return false
  }
}

function writeVerifiedManifest(targetPath: string, model: WhisperModelInfo): void {
  const manifestPath = `${targetPath}.manifest.json`
  const tempPath = `${manifestPath}.tmp`
  const manifest: WhisperModelManifest = {
    schemaVersion: 1,
    modelId: model.id,
    modelVersion: model.version,
    sizeBytes: model.sizeBytes,
    sha256: model.sha256,
    sourceUrl: model.url,
    verifiedAt: new Date().toISOString(),
  }
  fs.writeFileSync(tempPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath)
  fs.renameSync(tempPath, manifestPath)
}

async function streamResponseToFile(
  response: Response,
  targetPath: string,
  model: WhisperModelInfo,
  initialBytes: number,
): Promise<void> {
  if (!response.body) throw new Error('Resposta sem corpo de download.')
  let received = initialBytes
  const source = Readable.fromWeb(response.body as any)
  source.on('data', (chunk: Buffer) => {
    received += chunk.length
    progress.set(model.id, { received, total: model.sizeBytes })
  })
  await pipeline(source, fs.createWriteStream(targetPath, { flags: initialBytes > 0 ? 'a' : 'w' }))
  if (received !== model.sizeBytes) throw new Error(`Download incompleto: ${received}/${model.sizeBytes} bytes.`)

  const header = Buffer.alloc(4)
  const fd = fs.openSync(targetPath, 'r')
  try { fs.readSync(fd, header, 0, 4, 0) } finally { fs.closeSync(fd) }
  if (header.toString('ascii') !== 'lmgg') throw new ModelIntegrityError('Arquivo não é um modelo GGML Whisper.')
  if (await sha256File(targetPath) !== model.sha256) {
    throw new ModelIntegrityError('Checksum SHA-256 do modelo Whisper não confere.')
  }
}

export function downloadWhisperModel(modelId: string): Promise<WhisperModelInfo> {
  const existing = downloads.get(modelId)
  if (existing) return existing
  const operation = performDownload(modelId).finally(() => downloads.delete(modelId))
  downloads.set(modelId, operation)
  return operation
}

async function performDownload(modelId: string): Promise<WhisperModelInfo> {
  const model = AVAILABLE_MODELS.find(item => item.id === modelId)
  if (!model) throw new Error(`Modelo Whisper desconhecido: ${modelId}`)

  const targetPath = getWhisperModelFilePath(model.id)
  progress.set(model.id, { received: 0, total: model.sizeBytes })
  if (await verifyModelFile(targetPath, model)) {
    writeVerifiedManifest(targetPath, model)
    progress.set(model.id, { received: model.sizeBytes, total: model.sizeBytes })
    return { ...model, downloaded: true }
  }

  const tempPath = `${targetPath}.part`
  try {
    let initialBytes = fs.existsSync(tempPath) ? fs.statSync(tempPath).size : 0
    if (initialBytes >= model.sizeBytes) {
      fs.unlinkSync(tempPath)
      initialBytes = 0
    }

    const response = await fetch(model.url, {
      headers: initialBytes > 0 ? { Range: `bytes=${initialBytes}-` } : undefined,
      signal: AbortSignal.timeout(1_800_000),
    })
    if (!response.ok) {
      throw new Error(`Falha ao baixar ${model.id}: HTTP ${response.status}`)
    }

    const writeOffset = initialBytes > 0 && response.status === 206 ? initialBytes : 0
    await streamResponseToFile(response, tempPath, model, writeOffset)
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath)
    fs.renameSync(tempPath, targetPath)
    writeVerifiedManifest(targetPath, model)
    progress.set(model.id, { received: model.sizeBytes, total: model.sizeBytes })
    return { ...model, downloaded: true }
  } catch (error) {
    progress.set(modelId, {
      received: fs.existsSync(tempPath) ? fs.statSync(tempPath).size : 0,
      total: model.sizeBytes,
      error: error instanceof Error ? error.message : 'Download falhou.',
    })
    if (error instanceof ModelIntegrityError) {
      try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath) } catch {}
    }
    throw error
  }
}

export async function installWhisperModelBundle(
  modelIds: readonly string[] = WHISPER_INSTALL_BUNDLE,
): Promise<{
  installed: WhisperModelInfo[]
  skipped: string[]
  warnings: string[]
}> {
  const installed: WhisperModelInfo[] = []
  const skipped: string[] = []
  const warnings: string[] = []

  const currentModels = new Map(listAvailableWhisperModels().map(model => [model.id, model]))

  for (const modelId of modelIds) {
    try {
      const current = currentModels.get(modelId)
      const targetPath = current ? getWhisperModelFilePath(current.id) : ''
      if (current?.downloaded && await verifyModelFile(targetPath, current)) {
        writeVerifiedManifest(targetPath, current)
        skipped.push(modelId)
        continue
      }

      const downloaded = await downloadWhisperModel(modelId)
      installed.push(downloaded)
      currentModels.set(modelId, downloaded)
    } catch (error) {
      warnings.push(`Modelo Whisper "${modelId}" não pôde ser instalado: ${String(error)}`)
    }
  }

  return { installed, skipped, warnings }
}
