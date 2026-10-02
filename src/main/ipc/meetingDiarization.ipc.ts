import { ipcMain } from 'electron'
import * as fs from 'fs'

import { diarizeWavSegments, type DiarizationSegmentInput } from '../meeting/speakerDiarization'
import { getDataPath, safeResolveMeetingPath } from '../storage'

function validateSegments(value: unknown): DiarizationSegmentInput[] {
  if (!Array.isArray(value) || value.length > 500) throw new Error('Lista de segmentos inválida.')
  return value.map(item => {
    const source = item && typeof item === 'object' ? item as Record<string, unknown> : {}
    const id = typeof source.id === 'string' ? source.id.trim().slice(0, 160) : ''
    const text = typeof source.text === 'string' ? source.text.trim().slice(0, 8_000) : ''
    const startMs = Number(source.startMs)
    const endMs = Number(source.endMs)
    if (!id || !text || !Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs < 0 || endMs < startMs) {
      throw new Error('Segmento inválido para diarização.')
    }
    return { id, text, startMs, endMs }
  })
}

export function registerMeetingDiarizationIpc(): void {
  ipcMain.handle('meetings:diarize', async (_event, request: {
    audioPath: string
    segments: DiarizationSegmentInput[]
  }) => {
    const audioPath = safeResolveMeetingPath(String(request?.audioPath || ''), getDataPath())
    if (!fs.existsSync(audioPath) || !fs.statSync(audioPath).isFile()) throw new Error('Faixa de áudio não encontrada.')
    return diarizeWavSegments(audioPath, validateSegments(request?.segments))
  })
}
