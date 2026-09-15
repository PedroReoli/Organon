export type StudyPanel   = 'wallpaper' | 'audio' | 'quote' | 'stats' | 'goals' | 'analytics' | 'presets' | 'history' | null
export type PomodoroPhase = 'focus' | 'break'

export interface SearchImageResult {
  id:        string
  title:     string
  thumbUrl:  string
  fullUrl:   string
  sourceUrl: string
}

export const STORAGE_KEY        = 'organon.study.v2'
export const LEGACY_STORAGE_KEY = 'organon.study.v1'
export const IMAGE_PAGE_SIZE    = 6
export const IMAGE_SEARCH_LIMIT = 30
