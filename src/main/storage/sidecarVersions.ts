import { createHash } from 'crypto'
import * as path from 'path'

const contentHash = (content: Buffer | string): string => createHash('sha256').update(content).digest('hex')

export const getVersionedNotePath = (mdPath: string, content: string): string => {
  const normalized = String(mdPath || '').replace(/\\/g, '/')
  const parsed = path.posix.parse(normalized)
  if (!parsed.base || parsed.dir.split('/').includes('..')) throw new Error('Caminho de nota invalido')
  const stem = parsed.name.replace(/--v-[0-9a-f]{12}$/i, '')
  const fileName = `${stem}--v-${contentHash(content).slice(0, 12)}.md`
  return parsed.dir ? path.posix.join(parsed.dir, fileName) : fileName
}

export const getVersionedMeetingAudioName = (meetingId: string, buffer: Buffer): string => {
  return `${meetingId}--${contentHash(buffer).slice(0, 12)}.wav`
}

