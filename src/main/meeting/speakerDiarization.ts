import * as fs from 'fs/promises'

export interface DiarizationSegmentInput {
  id: string
  text: string
  startMs: number
  endMs: number
}

export interface DiarizationSegmentResult {
  segmentId: string
  speakerId: string
  speakerName: string
  confidence: number
  identifiedBy: 'acoustic' | 'self-introduction'
}

interface WavInfo {
  sampleRate: number
  dataOffset: number
  dataBytes: number
}

interface Cluster {
  id: number
  centroid: number[]
  samples: number
  name?: string
}

const FRAME_SAMPLES = 1_024
const MAX_FRAMES_PER_SEGMENT = 12
const MAX_SPEAKERS = 8
const NEW_SPEAKER_THRESHOLD = 0.24

function parseWavHeader(header: Buffer): WavInfo {
  if (header.length < 44 || header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('A diarização local requer um arquivo WAV válido.')
  }
  if (header.toString('ascii', 12, 16) !== 'fmt ' || header.readUInt16LE(20) !== 1) {
    throw new Error('A diarização local requer WAV PCM.')
  }
  if (header.readUInt16LE(22) !== 1 || header.readUInt16LE(34) !== 16) {
    throw new Error('A diarização local requer áudio mono de 16 bits.')
  }
  const sampleRate = header.readUInt32LE(24)
  if (header.toString('ascii', 36, 40) !== 'data') throw new Error('Bloco de áudio WAV não reconhecido.')
  return { sampleRate, dataOffset: 44, dataBytes: header.readUInt32LE(40) }
}

function frameFeatures(samples: Int16Array, sampleRate: number): number[] | undefined {
  if (samples.length < 160) return undefined
  let mean = 0
  for (const sample of samples) mean += sample
  mean /= samples.length

  const normalized = new Float64Array(samples.length)
  let energy = 0
  let zeroCrossings = 0
  for (let index = 0; index < samples.length; index += 1) {
    const value = (samples[index] - mean) / 32_768
    normalized[index] = value
    energy += value * value
    if (index > 0 && Math.sign(value) !== Math.sign(normalized[index - 1])) zeroCrossings += 1
  }
  const rms = Math.sqrt(energy / samples.length)
  if (rms < 0.004) return undefined

  const minLag = Math.floor(sampleRate / 300)
  const maxLag = Math.min(Math.floor(sampleRate / 65), samples.length - 2)
  let bestLag = minLag
  let bestCorrelation = -1
  for (let lag = minLag; lag <= maxLag; lag += 2) {
    let correlation = 0
    let scale = 0
    for (let index = 0; index < samples.length - lag; index += 2) {
      correlation += normalized[index] * normalized[index + lag]
      scale += normalized[index] * normalized[index]
    }
    const score = scale > 0 ? correlation / scale : 0
    if (score > bestCorrelation) {
      bestCorrelation = score
      bestLag = lag
    }
  }

  const frequencies = [100, 200, 400, 800, 1_600, 3_200]
  const powers = frequencies.map(frequency => {
    const coefficient = 2 * Math.cos((2 * Math.PI * frequency) / sampleRate)
    let previous = 0
    let previousPrevious = 0
    for (const value of normalized) {
      const current = value + coefficient * previous - previousPrevious
      previousPrevious = previous
      previous = current
    }
    return Math.max(0, previousPrevious ** 2 + previous ** 2 - coefficient * previous * previousPrevious)
  })
  const totalPower = powers.reduce((total, value) => total + value, 0) || 1
  const pitch = bestCorrelation > 0.18 ? sampleRate / bestLag : 0
  return [
    Math.min(1, pitch / 320),
    Math.min(1, zeroCrossings / samples.length / 0.35),
    Math.min(1, Math.max(0, (Math.log10(rms) + 3) / 3)),
    ...powers.map(power => power / totalPower),
  ]
}

function averageFeatures(features: number[][]): number[] | undefined {
  if (!features.length) return undefined
  return features[0].map((_, index) => (
    features.reduce((total, vector) => total + vector[index], 0) / features.length
  ))
}

function featureDistance(left: number[], right: number[]): number {
  const weights = [2.4, 0.7, 0.15, 1, 1, 1, 1, 1, 1]
  const weighted = left.reduce((total, value, index) => total + weights[index] * (value - right[index]) ** 2, 0)
  return Math.sqrt(weighted / weights.reduce((total, value) => total + value, 0))
}

function updateCluster(cluster: Cluster, vector: number[]): void {
  cluster.samples += 1
  cluster.centroid = cluster.centroid.map((value, index) => (
    value + (vector[index] - value) / cluster.samples
  ))
}

function titleCaseName(value: string): string {
  return value.trim().split(/\s+/).slice(0, 3)
    .map(part => part.charAt(0).toLocaleUpperCase('pt-BR') + part.slice(1).toLocaleLowerCase('pt-BR'))
    .join(' ')
}

export function extractSelfIntroducedName(text: string): string | undefined {
  const match = text.match(/\b(?:eu sou|me chamo|meu nome (?:é|e)|aqui (?:é|e) (?:o|a)|i am|my name is)\s+([\p{L}][\p{L}'-]*(?:\s+[\p{L}][\p{L}'-]*){0,2})/iu)
  if (!match?.[1]) return undefined
  const candidate = match[1].replace(/\b(?:e|and|do|da|de|dos|das)$/iu, '').trim()
  return candidate.length >= 2 && candidate.length <= 60 ? titleCaseName(candidate) : undefined
}

async function extractSegmentFeatures(
  handle: fs.FileHandle,
  wav: WavInfo,
  segment: DiarizationSegmentInput,
): Promise<number[] | undefined> {
  const firstSample = Math.max(0, Math.floor(segment.startMs * wav.sampleRate / 1_000))
  const lastSample = Math.min(wav.dataBytes / 2, Math.ceil(segment.endMs * wav.sampleRate / 1_000))
  const availableSamples = Math.max(0, lastSample - firstSample)
  if (availableSamples < 160) return undefined
  const frames = Math.min(MAX_FRAMES_PER_SEGMENT, Math.max(1, Math.floor(availableSamples / FRAME_SAMPLES)))
  const features: number[][] = []
  for (let frameIndex = 0; frameIndex < frames; frameIndex += 1) {
    const ratio = frames === 1 ? 0.5 : frameIndex / (frames - 1)
    const sampleOffset = firstSample + Math.max(0, Math.floor((availableSamples - FRAME_SAMPLES) * ratio))
    const bytesToRead = Math.min(FRAME_SAMPLES * 2, Math.max(0, wav.dataBytes - sampleOffset * 2))
    const buffer = Buffer.alloc(bytesToRead)
    const { bytesRead } = await handle.read(buffer, 0, bytesToRead, wav.dataOffset + sampleOffset * 2)
    const samples = new Int16Array(buffer.buffer, buffer.byteOffset, Math.floor(bytesRead / 2))
    const vector = frameFeatures(samples, wav.sampleRate)
    if (vector) features.push(vector)
  }
  return averageFeatures(features)
}

export async function diarizeWavSegments(
  audioPath: string,
  segments: DiarizationSegmentInput[],
): Promise<DiarizationSegmentResult[]> {
  const handle = await fs.open(audioPath, 'r')
  try {
    const header = Buffer.alloc(44)
    await handle.read(header, 0, header.length, 0)
    const wav = parseWavHeader(header)
    const clusters: Cluster[] = []
    const results: DiarizationSegmentResult[] = []
    let lastCluster: Cluster | undefined

    for (const segment of segments) {
      const vector = await extractSegmentFeatures(handle, wav, segment)
      if (!vector) continue
      const ranked = clusters
        .map(cluster => ({ cluster, distance: featureDistance(cluster.centroid, vector) }))
        .sort((left, right) => left.distance - right.distance)
      let selected = ranked[0]?.cluster
      let distance = ranked[0]?.distance ?? 1
      const lastDistance = lastCluster ? featureDistance(lastCluster.centroid, vector) : 1
      if (lastCluster && lastDistance <= NEW_SPEAKER_THRESHOLD * 1.12) {
        selected = lastCluster
        distance = lastDistance
      } else if ((!selected || distance > NEW_SPEAKER_THRESHOLD) && clusters.length < MAX_SPEAKERS) {
        selected = { id: clusters.length + 1, centroid: [...vector], samples: 1 }
        clusters.push(selected)
        distance = NEW_SPEAKER_THRESHOLD * 0.65
      } else if (selected) {
        updateCluster(selected, vector)
      }
      if (!selected) continue

      const introducedName = extractSelfIntroducedName(segment.text)
      if (introducedName) selected.name = introducedName
      lastCluster = selected
      results.push({
        segmentId: segment.id,
        speakerId: `remote-${selected.id}`,
        speakerName: selected.name || `Participante ${selected.id}`,
        confidence: Math.max(0.35, Math.min(0.96, 1 - distance / (NEW_SPEAKER_THRESHOLD * 2))),
        identifiedBy: introducedName ? 'self-introduction' : 'acoustic',
      })
    }
    const namesBySpeaker = new Map(clusters.filter(cluster => cluster.name).map(cluster => [`remote-${cluster.id}`, cluster.name!]))
    return results.map(result => ({
      ...result,
      speakerName: namesBySpeaker.get(result.speakerId) || result.speakerName,
    }))
  } finally {
    await handle.close()
  }
}
