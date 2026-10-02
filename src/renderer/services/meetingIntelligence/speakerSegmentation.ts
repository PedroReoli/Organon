import type { WhisperTranscriptionResult } from '@types'
import type { SpeakerSegment, WhisperAudioSourceKind } from '../../pages/WhisperPage/types/whisper.types'

interface BuildSourceSegmentsInput {
  recordId: string
  sourceKind: Exclude<WhisperAudioSourceKind, 'mixed'>
  result: WhisperTranscriptionResult
  durationMs: number
  mode: 'meeting' | 'interview' | 'prompt'
}

function sourceIdentity(sourceKind: 'microphone' | 'system', mode: BuildSourceSegmentsInput['mode']) {
  if (sourceKind === 'system') {
    return { speaker: 'system' as const, speakerId: 'remote-1', speakerName: 'Participante (sistema)' }
  }
  return {
    speaker: 'user' as const,
    speakerId: 'local-user',
    speakerName: mode === 'interview' ? 'Entrevistador (microfone)' : mode === 'prompt' ? 'Você' : 'Você (microfone)',
  }
}

export function buildSourceSegments(input: BuildSourceSegmentsInput): SpeakerSegment[] {
  const identity = sourceIdentity(input.sourceKind, input.mode)
  const sourceSegments = input.result.segments.length > 0
    ? input.result.segments
    : [{ text: input.result.text, startMs: 0, endMs: input.durationMs }]

  return sourceSegments
    .filter(segment => segment.text.trim())
    .map((segment, index) => ({
      id: `seg-${input.recordId}-${input.sourceKind}-${index}`,
      ...identity,
      timestamp: new Date(Math.max(0, segment.startMs)).toISOString().slice(11, 19),
      text: segment.text.trim(),
      textRaw: segment.text.trim(),
      textClean: segment.text.replace(/\s+/g, ' ').trim(),
      startMs: Math.max(0, segment.startMs),
      endMs: Math.max(segment.startMs, segment.endMs),
      confidence: segment.confidence,
      words: segment.words,
      sourceKind: input.sourceKind,
      diarizationMethod: 'source-channel' as const,
      diarizationConfidence: 1,
    }))
}

export function mergeSourceSegments(groups: SpeakerSegment[][]): SpeakerSegment[] {
  return groups.flat().sort((left, right) => {
    const timeDifference = (left.startMs || 0) - (right.startMs || 0)
    if (timeDifference !== 0) return timeDifference
    return left.sourceKind === 'microphone' ? -1 : 1
  })
}

export function formatSpeakerTranscript(segments: SpeakerSegment[]): string {
  return segments.map(segment => `${segment.speakerName}: ${segment.textClean || segment.text}`).join('\n\n').trim()
}
