import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

import { AVAILABLE_MODELS, type WhisperModelInfo } from './engine'

const MODELS_DIR = path.join(app.getPath('userData'), 'models', 'whisper')
const INSTALLED_MODEL_MIN_BYTES = 1_000_000
export const WHISPER_INSTALL_BUNDLE = ['ggml-tiny', 'ggml-base', 'ggml-small'] as const

export function ensureWhisperModelsDir(): string {
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true })
  }
  return MODELS_DIR
}

export function listAvailableWhisperModels(): WhisperModelInfo[] {
  const dir = ensureWhisperModelsDir()
  return AVAILABLE_MODELS.map(model => {
    const filePath = path.join(dir, `${model.id}.bin`)
    return {
      ...model,
      downloaded: fs.existsSync(filePath) && fs.statSync(filePath).size > INSTALLED_MODEL_MIN_BYTES,
    }
  })
}

function getWhisperModelFilePath(modelId: string): string {
  return path.join(ensureWhisperModelsDir(), `${modelId}.bin`)
}

const downloads = new Map<string, Promise<WhisperModelInfo>>()
const progress = new Map<string, { received: number; total: number; error?: string }>()
export const getWhisperDownloadProgress = () => Object.fromEntries(progress)

async function streamResponseToFile(response: Response, targetPath: string, modelId: string): Promise<void> {
  if (!response.body) throw new Error('Resposta sem corpo de download.')
  const total = Number(response.headers.get('content-length')) || 0
  let received = 0
  const source = Readable.fromWeb(response.body as any)
  source.on('data', (chunk: Buffer) => { received += chunk.length; progress.set(modelId, { received, total }) })
  await pipeline(source, fs.createWriteStream(targetPath))
  if (received < INSTALLED_MODEL_MIN_BYTES || (total > 0 && received !== total)) throw new Error('Download incompleto.')
  const header = Buffer.alloc(4)
  const fd = fs.openSync(targetPath, 'r')
  try { fs.readSync(fd, header, 0, 4, 0) } finally { fs.closeSync(fd) }
  if (header.toString('ascii') !== 'lmgg') throw new Error('Arquivo não é um modelo GGML Whisper.')
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
  if (!model) {
    throw new Error(`Modelo Whisper desconhecido: ${modelId}`)
  }

  const targetPath = getWhisperModelFilePath(model.id)
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > INSTALLED_MODEL_MIN_BYTES) {
    return { ...model, downloaded: true }
  }

  const tempPath = `${targetPath}.part`
  try {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath)
    }

    const response = await fetch(model.url, { signal: AbortSignal.timeout(1_800_000) })
    if (!response.ok) {
      throw new Error(`Falha ao baixar ${model.id}: HTTP ${response.status}`)
    }

    await streamResponseToFile(response, tempPath, modelId)
    fs.renameSync(tempPath, targetPath)
    return { ...model, downloaded: true }
  } catch (error) {
    progress.set(modelId, { received: 0, total: 0, error: error instanceof Error ? error.message : 'Download falhou.' })
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath)
      }
    } catch {}
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
      if (current?.downloaded) {
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
