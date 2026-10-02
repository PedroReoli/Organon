import type { SpeakerSegment } from '../../pages/WhisperPage/types/whisper.types'

export async function applyLocalSpeakerDiarization(
  segments: SpeakerSegment[],
  systemAudioPath?: string,
): Promise<SpeakerSegment[]> {
  if (!systemAudioPath || !window.electronAPI?.diarizeMeetingSpeakers) return segments
  const remoteSegments = segments.filter(segment => (
    segment.sourceKind === 'system'
    && typeof segment.startMs === 'number'
    && typeof segment.endMs === 'number'
  ))
  if (remoteSegments.length === 0) return segments

  let diarized: Awaited<ReturnType<typeof window.electronAPI.diarizeMeetingSpeakers>>
  try {
    diarized = await window.electronAPI.diarizeMeetingSpeakers({
      audioPath: systemAudioPath,
      segments: remoteSegments.map(segment => ({
        id: segment.id,
        text: segment.text,
        startMs: segment.startMs || 0,
        endMs: segment.endMs || 0,
      })),
    })
  } catch (error) {
    console.warn('[Whisper] Diarização acústica indisponível:', error)
    return segments
  }
  const bySegmentId = new Map(diarized.map(item => [item.segmentId, item]))
  return segments.map(segment => {
    const result = bySegmentId.get(segment.id)
    if (!result) return segment
    return {
      ...segment,
      speakerId: result.speakerId,
      speakerName: result.speakerName,
      diarizationMethod: 'acoustic',
      diarizationConfidence: result.confidence,
    }
  })
}
