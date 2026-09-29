export interface WhisperTranscriptionSegment {
  text: string
  startMs: number
  endMs: number
  confidence?: number
  words?: Array<{
    text: string
    startMs: number
    endMs: number
    confidence?: number
  }>
}

export interface WhisperTranscriptionResult {
  text: string
  provider: 'local' | 'groq' | 'openai' | 'custom'
  model: string
  language?: string
  timingPrecision: 'word' | 'segment' | 'none'
  segments: WhisperTranscriptionSegment[]
}
