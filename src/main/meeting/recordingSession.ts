import { createHash, randomUUID } from 'crypto'
import * as fs from 'fs'
import type { FileHandle } from 'fs/promises'
import * as path from 'path'
import { pipeline } from 'stream/promises'

import { getDataPath, safeResolveMeetingPath, writeTextFileAtomic } from '../storage'

export const MEETING_AUDIO_CHANNELS = ['microphone', 'system', 'mixed'] as const
export type MeetingAudioChannel = typeof MEETING_AUDIO_CHANNELS[number]

export interface MeetingAudioTrackMetadata {
  channel: MeetingAudioChannel
  path: string
  sha256: string
  bytes: number
  codec: 'audio/wav; codecs=pcm'
  durationMs: number
  sampleRate: number
}

interface RecordingChannelState {
  channel: MeetingAudioChannel
  rawPath: string
  handle: FileHandle
  bytes: number
  pending: Promise<void>
}

interface RecordingSessionState {
  id: string
  ownerId: number
  meetingId: string
  sampleRate: number
  directory: string
  channels: Map<MeetingAudioChannel, RecordingChannelState>
}

const MAX_CHUNK_BYTES = 2 * 1024 * 1024
const MAX_WAV_DATA_BYTES = 0xffff_ffff - 44

function validateMeetingId(value: string): string {
  const meetingId = value?.trim()
  if (!meetingId || !/^[A-Za-z0-9_-]{1,120}$/.test(meetingId)) {
    throw new Error('Identificador de reunião inválido.')
  }
  return meetingId
}

function validateChannels(value: unknown): MeetingAudioChannel[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('Informe ao menos um canal de áudio.')
  const channels = Array.from(new Set(value))
  if (channels.some(channel => !MEETING_AUDIO_CHANNELS.includes(channel as MeetingAudioChannel))) {
    throw new Error('Canal de áudio inválido.')
  }
  return channels as MeetingAudioChannel[]
}

function createWavHeader(dataBytes: number, sampleRate: number): Buffer {
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataBytes, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataBytes, 40)
  return header
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  const stream = fs.createReadStream(filePath)
  for await (const chunk of stream) hash.update(chunk as Buffer)
  return hash.digest('hex')
}

async function closeChannel(channel: RecordingChannelState): Promise<void> {
  await channel.pending.catch(() => undefined)
  await channel.handle.close().catch(() => undefined)
}

export class MeetingRecordingSessionManager {
  private sessions = new Map<string, RecordingSessionState>()

  constructor(private readonly resolveDataPath: () => string = getDataPath) {}

  async start(ownerId: number, request: {
    meetingId: string
    channels: MeetingAudioChannel[]
    sampleRate?: number
  }): Promise<{ sessionId: string; channels: MeetingAudioChannel[] }> {
    const meetingId = validateMeetingId(request?.meetingId)
    const channels = validateChannels(request?.channels)
    const sampleRate = Math.round(Number(request?.sampleRate) || 16_000)
    if (sampleRate < 8_000 || sampleRate > 96_000) throw new Error('Taxa de amostragem inválida.')

    const sessionId = randomUUID().replace(/-/g, '')
    const relativeDirectory = path.posix.join('.recording', sessionId)
    const directory = safeResolveMeetingPath(relativeDirectory, this.resolveDataPath())
    await fs.promises.mkdir(directory, { recursive: true })

    const channelStates = new Map<MeetingAudioChannel, RecordingChannelState>()
    try {
      for (const channel of channels) {
        const rawPath = path.join(directory, `${channel}.pcm`)
        const handle = await fs.promises.open(rawPath, 'wx')
        channelStates.set(channel, { channel, rawPath, handle, bytes: 0, pending: Promise.resolve() })
      }
    } catch (error) {
      await Promise.all([...channelStates.values()].map(closeChannel))
      await fs.promises.rm(directory, { recursive: true, force: true })
      throw error
    }

    this.sessions.set(sessionId, { id: sessionId, ownerId, meetingId, sampleRate, directory, channels: channelStates })
    return { sessionId, channels }
  }

  async append(ownerId: number, request: {
    sessionId: string
    channel: MeetingAudioChannel
    pcm: ArrayBuffer | Uint8Array
  }): Promise<{ bytes: number }> {
    const session = this.getOwnedSession(ownerId, request?.sessionId)
    const channel = session.channels.get(request?.channel)
    if (!channel) throw new Error('Canal não pertence à sessão de gravação.')
    const chunk = Buffer.from(request?.pcm as ArrayBuffer)
    if (!chunk.length || chunk.length > MAX_CHUNK_BYTES || chunk.length % 2 !== 0) {
      throw new Error('Bloco PCM inválido.')
    }
    if (channel.bytes + chunk.length > MAX_WAV_DATA_BYTES) {
      throw new Error('A faixa atingiu o limite do formato WAV.')
    }

    channel.pending = channel.pending.then(async () => {
      await channel.handle.write(chunk)
      channel.bytes += chunk.length
    })
    await channel.pending
    return { bytes: channel.bytes }
  }

  async finalize(ownerId: number, request: {
    sessionId: string
    durationMs?: number
  }): Promise<{ tracks: MeetingAudioTrackMetadata[] }> {
    const session = this.getOwnedSession(ownerId, request?.sessionId)
    this.sessions.delete(session.id)
    const durationMs = Math.max(0, Math.round(Number(request?.durationMs) || 0))

    try {
      await Promise.all([...session.channels.values()].map(closeChannel))
      const tracks: MeetingAudioTrackMetadata[] = []
      for (const channel of session.channels.values()) {
        if (channel.bytes === 0) continue
        const temporaryWav = path.join(session.directory, `${channel.channel}.wav`)
        await fs.promises.writeFile(temporaryWav, createWavHeader(channel.bytes, session.sampleRate))
        await pipeline(
          fs.createReadStream(channel.rawPath),
          fs.createWriteStream(temporaryWav, { flags: 'a' }),
        )
        const sha256 = await sha256File(temporaryWav)
        const fileName = `${session.meetingId}--${channel.channel}--${sha256.slice(0, 12)}.wav`
        const targetPath = safeResolveMeetingPath(fileName, this.resolveDataPath())
        if (fs.existsSync(targetPath)) await fs.promises.unlink(temporaryWav)
        else await fs.promises.rename(temporaryWav, targetPath)

        const metadata: MeetingAudioTrackMetadata = {
          channel: channel.channel,
          path: fileName,
          sha256,
          bytes: channel.bytes + 44,
          codec: 'audio/wav; codecs=pcm',
          durationMs,
          sampleRate: session.sampleRate,
        }
        const metadataPath = safeResolveMeetingPath(`${path.parse(fileName).name}.audio.json`, this.resolveDataPath())
        if (!writeTextFileAtomic(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)) {
          throw new Error('Falha ao gravar metadados da faixa de áudio.')
        }
        tracks.push(metadata)
      }
      return { tracks }
    } finally {
      await fs.promises.rm(session.directory, { recursive: true, force: true })
    }
  }

  async cancel(ownerId: number, sessionId: string): Promise<void> {
    const session = this.getOwnedSession(ownerId, sessionId)
    this.sessions.delete(session.id)
    await Promise.all([...session.channels.values()].map(closeChannel))
    await fs.promises.rm(session.directory, { recursive: true, force: true })
  }

  async cancelOwner(ownerId: number): Promise<void> {
    const sessionIds = [...this.sessions.values()].filter(session => session.ownerId === ownerId).map(session => session.id)
    await Promise.all(sessionIds.map(sessionId => this.cancel(ownerId, sessionId).catch(() => undefined)))
  }

  private getOwnedSession(ownerId: number, sessionId: string): RecordingSessionState {
    const normalizedId = String(sessionId || '').trim()
    const session = this.sessions.get(normalizedId)
    if (!session || session.ownerId !== ownerId) throw new Error('Sessão de gravação inválida ou encerrada.')
    return session
  }
}
