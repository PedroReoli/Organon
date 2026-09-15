export type SpeakerRole = 'user' | 'system' | 'interviewer' | 'candidate'
export type WhisperAudioSourceKind = 'microphone' | 'system' | 'mixed'

export interface SpeakerSegment {
  id: string
  speaker: SpeakerRole
  speakerName: string
  text: string
  timestamp: string
  sourceKind?: WhisperAudioSourceKind
  diarizationConfidence?: number
}

export interface LiveReport {
  currentQuestion?: string
  discussedConcepts: string[]
  forgottenPoints: string[]
  actionItems: string[]
  technicalFeedback?: string
  score?: number
}

export interface WhisperFolder {
  id: string
  name: string
  color?: string
  order: number
}

export interface WhisperRecord {
  intelligenceData?: import('../../../services/meetingIntelligence/types').MeetingIntelligenceData
  mode?: 'meeting' | 'interview' | 'prompt'
  id: string
  title: string
  folderId: string | null
  createdAt: string
  durationSeconds: number
  audioUrl?: string
  fullTranscript: string
  segments: SpeakerSegment[]
  liveReport?: LiveReport
  isFavorite?: boolean
  isArchived?: boolean
}

export interface WhisperCaptureCapability {
  kind: 'microphone' | 'speech-recognition' | 'display-capture' | 'electron-bridge'
  label: string
  available: boolean
  detail: string
}

export interface WhisperCaptureReadiness {
  capabilities: WhisperCaptureCapability[]
  microphoneReady: boolean
  speechRecognitionReady: boolean
  displayCaptureReady: boolean
  electronBridgeReady: boolean
  diarizationBaseReady: boolean
  summary: string
}

export const DEFAULT_WHISPER_FOLDERS: WhisperFolder[] = [
  { id: 'folder-interviews', name: 'Entrevistas & Tech Screen', color: '#6366f1', order: 1 },
  { id: 'folder-team-meetings', name: 'Reuniões de Time', color: '#22c55e', order: 2 },
  { id: 'folder-study', name: 'Aulas & Estudos', color: '#f59e0b', order: 3 },
  { id: 'folder-brainstorm', name: 'Brainstorm & Ideias', color: '#ec4899', order: 4 },
]
