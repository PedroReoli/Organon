import { CardPriority, CardStatus, ChecklistItem } from './planner.types'

export interface StudyGoal {
  id: string
  title: string
  description?: string
  deadline?: string | null
  priority: CardPriority | null
  status: CardStatus
  checklist: ChecklistItem[]
  linkedPlanningCardId: string | null
  createdAt: string
  updatedAt: string
  category?: string
}

export interface StudySessionPreset {
  id: string
  name: string
  focusMinutes: number
  breakMinutes: number
  cyclesBeforeLongBreak: number
  longBreakMinutes: number
  isBuiltin?: boolean
  createdAt: string
}

export interface StudyMediaItem {
  id: string
  title: string
  url: string
  kind: 'youtube' | 'audio'
  youtubeVideoId: string | null
  volume: number
  loop: boolean
  showDock: boolean
}

export interface StudySessionLog {
  id: string
  completedAt: string
  focusSeconds: number
  goalId?: string | null
  presetName?: string
  category?: string
}

export interface StudyState {
  wallpaperUrl: string
  focusMinutes: number
  breakMinutes: number
  muteSound: boolean
  mediaItems: StudyMediaItem[]
  goals: StudyGoal[]
  sessions: StudySessionLog[]
  presets?: StudySessionPreset[]
  activePresetId?: string | null
  focusedGoalId?: string | null
}

export const BUILTIN_STUDY_PRESETS: StudySessionPreset[] = [
  {
    id: 'preset-classic',
    name: 'Classico 25/5',
    focusMinutes: 25,
    breakMinutes: 5,
    cyclesBeforeLongBreak: 4,
    longBreakMinutes: 15,
    isBuiltin: true,
    createdAt: '2026-04-11T00:00:00.000Z',
  },
  {
    id: 'preset-deep',
    name: 'Fluxo 50/10',
    focusMinutes: 50,
    breakMinutes: 10,
    cyclesBeforeLongBreak: 2,
    longBreakMinutes: 20,
    isBuiltin: true,
    createdAt: '2026-04-11T00:00:00.000Z',
  },
  {
    id: 'preset-sprint',
    name: 'Sprint 15/3',
    focusMinutes: 15,
    breakMinutes: 3,
    cyclesBeforeLongBreak: 6,
    longBreakMinutes: 15,
    isBuiltin: true,
    createdAt: '2026-04-11T00:00:00.000Z',
  },
  {
    id: 'preset-ultra',
    name: 'Ultra 90/20',
    focusMinutes: 90,
    breakMinutes: 20,
    cyclesBeforeLongBreak: 0,
    longBreakMinutes: 0,
    isBuiltin: true,
    createdAt: '2026-04-11T00:00:00.000Z',
  },
]

export const DEFAULT_STUDY_STATE: StudyState = {
  wallpaperUrl: '',
  focusMinutes: 25,
  breakMinutes: 5,
  muteSound: false,
  mediaItems: [],
  goals: [],
  sessions: [],
  presets: BUILTIN_STUDY_PRESETS,
  activePresetId: 'preset-classic',
  focusedGoalId: null,
}
