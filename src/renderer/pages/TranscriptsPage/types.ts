export interface Transcript {
  id: string
  text: string
  timestamp: string
  source?: 'whisper' | 'manual'
}

export type TranscriptFilter = 'all' | 'today' | 'week' | 'month'

export type TranscriptViewMode = 'grid' | 'list'
