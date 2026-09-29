import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'
import { getMainWindow } from '../core/window'
import { transcribeAudioLocally } from './localTranscriber'

export interface WhisperModelInfo {
  id: string
  name: string
  version: string
  sizeMb: number
  sizeBytes: number
  sha256: string
  vramRequiredMb: number
  url: string
  downloaded: boolean
}

const MODELS_DIR = path.join(app.getPath('userData'), 'models', 'whisper')

export const AVAILABLE_MODELS: WhisperModelInfo[] = [
  {
    id: 'ggml-tiny',
    name: 'Whisper Tiny (GGML - ~75MB)',
    version: 'whisper.cpp-main-be07e048e1e5',
    sizeMb: 75,
    sizeBytes: 77_691_713,
    sha256: 'be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21',
    vramRequiredMb: 350,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    downloaded: false,
  },
  {
    id: 'ggml-base',
    name: 'Whisper Base (GGML - ~142MB)',
    version: 'whisper.cpp-main-60ed5bc3dd14',
    sizeMb: 142,
    sizeBytes: 147_951_465,
    sha256: '60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe',
    vramRequiredMb: 500,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    downloaded: false,
  },
  {
    id: 'ggml-small',
    name: 'Whisper Small (GGML - ~466MB)',
    version: 'whisper.cpp-main-1be3a9b20638',
    sizeMb: 466,
    sizeBytes: 487_601_967,
    sha256: '1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b',
    vramRequiredMb: 1000,
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    downloaded: false,
  },
]

export function ensureModelsDir(): string {
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true })
  }
  return MODELS_DIR
}

export function listLocalModels(): WhisperModelInfo[] {
  const dir = ensureModelsDir()
  return AVAILABLE_MODELS.map((m) => {
    const filePath = path.join(dir, `${m.id}.bin`)
    return {
      ...m,
      downloaded: fs.existsSync(filePath) && fs.statSync(filePath).size === m.sizeBytes,
    }
  })
}

function resolvePreferredLocalModel(modelId?: string): WhisperModelInfo | null {
  const installedModels = listLocalModels().filter(model => model.downloaded)

  if (modelId) {
    const exactMatch = installedModels.find(model => model.id === modelId)
    if (exactMatch) return exactMatch
  }

  return installedModels[0] || null
}

export async function transcribeLocalAudio(audioPath: string, modelId?: string, initialPrompt?: string): Promise<string> {
  const preferred = resolvePreferredLocalModel(modelId)
  if (!preferred) throw new Error('Nenhum modelo local instalado. Baixe Whisper Tiny ou Base em Configurações e modelos.')
  return transcribeAudioLocally(audioPath, path.join(ensureModelsDir(), `${preferred.id}.bin`), initialPrompt)
}

export async function selectBestWhisperModel(requiredVramMb: number): Promise<WhisperModelInfo | null> {
  try {
    const models = listLocalModels().sort((a, b) => a.vramRequiredMb - b.vramRequiredMb)
    const available = models.filter(model => model.vramRequiredMb <= requiredVramMb)

    return available[0] || models[0] || null
  } catch {
    return AVAILABLE_MODELS[0] || null
  }
}

export async function openWhisperModelsFolder(): Promise<void> {
  ensureModelsDir()
  const win = getMainWindow()
  if (win) {
    const { shell } = require('electron')
    await shell.openPath(MODELS_DIR)
  }
}
