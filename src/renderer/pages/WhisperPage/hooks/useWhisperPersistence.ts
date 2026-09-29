import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Meeting, Settings } from '@types'
import { WhisperFolder, WhisperRecord, DEFAULT_WHISPER_FOLDERS } from '../types/whisper.types'
import { ProjectContextConfig } from '../../../services/meetingIntelligence/types'
import { fixMojibake } from '../utils/whisperUtils'

const STORAGE_RECORDS_KEY = 'organon-whisper-records'
const STORAGE_FOLDERS_KEY = 'organon-whisper-folders'
const STORAGE_PROJECT_CONTEXT_KEY = 'organon-meeting-project-context'

interface PersistenceOptions {
  meetings: Meeting[]
  settings: Settings
  onUpdateMeeting: (meetingId: string, updates: Partial<Meeting>) => void
  onRemoveMeeting: (meetingId: string) => void
  onReplaceMeetings: (meetings: Meeting[]) => void
  onUpdateSettings: (settings: Partial<Settings>) => void
}

const parseLegacy = <T,>(key: string): T | undefined => {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : undefined
  } catch {
    return undefined
  }
}

const normalizeRecord = (meeting: Meeting): WhisperRecord => ({
  id: meeting.id,
  title: fixMojibake(meeting.title),
  folderId: meeting.folderId ?? null,
  createdAt: meeting.createdAt,
  durationSeconds: meeting.durationSeconds ?? meeting.duration ?? 0,
  audioUrl: meeting.audio?.path ?? meeting.audioPath ?? undefined,
  audio: meeting.audio ?? undefined,
  fullTranscript: fixMojibake(meeting.fullTranscript ?? meeting.transcription ?? ''),
  rawTranscript: fixMojibake(meeting.rawTranscript ?? meeting.fullTranscript ?? meeting.transcription ?? ''),
  cleanTranscript: fixMojibake(meeting.cleanTranscript ?? meeting.fullTranscript ?? meeting.transcription ?? ''),
  segments: ((meeting.segments || []) as unknown as WhisperRecord['segments']).map(segment => ({
    ...segment,
    speakerName: fixMojibake(segment.speakerName),
    text: fixMojibake(segment.text),
  })),
  intelligenceData: meeting.intelligenceData as WhisperRecord['intelligenceData'],
  liveReport: meeting.liveReport as WhisperRecord['liveReport'],
  mode: meeting.mode,
  timingPrecision: meeting.timingPrecision ?? 'none',
  transcriptionProvenance: meeting.transcriptionProvenance,
  isFavorite: meeting.isFavorite,
  isArchived: meeting.isArchived,
})

const toMeeting = (record: WhisperRecord, previous?: Meeting): Meeting => ({
  ...previous,
  id: record.id,
  title: record.title,
  transcription: record.fullTranscript,
  audioPath: record.audio?.path ?? record.audioUrl ?? null,
  duration: record.durationSeconds,
  createdAt: record.createdAt,
  updatedAt: new Date().toISOString(),
  folderId: record.folderId,
  durationSeconds: record.durationSeconds,
  fullTranscript: record.fullTranscript,
  rawTranscript: record.rawTranscript ?? record.fullTranscript,
  cleanTranscript: record.cleanTranscript ?? record.fullTranscript,
  segments: record.segments as unknown as Array<Record<string, unknown>>,
  intelligenceData: record.intelligenceData as unknown as Record<string, unknown>,
  liveReport: record.liveReport as unknown as Record<string, unknown>,
  mode: record.mode,
  timingPrecision: record.timingPrecision ?? 'none',
  transcriptionProvenance: record.transcriptionProvenance,
  audio: record.audio ?? previous?.audio ?? null,
  isFavorite: record.isFavorite,
  isArchived: record.isArchived,
})

export function useWhisperPersistence({
  meetings,
  settings,
  onUpdateMeeting,
  onRemoveMeeting,
  onReplaceMeetings,
  onUpdateSettings,
}: PersistenceOptions) {
  const records = useMemo(() => meetings.map(normalizeRecord), [meetings])
  const recordsRef = useRef(records)
  recordsRef.current = records

  const setRecords = useCallback<Dispatch<SetStateAction<WhisperRecord[]>>>((action) => {
    const next = typeof action === 'function' ? action(recordsRef.current) : action
    recordsRef.current = next
    const previousById = new Map(meetings.map(meeting => [meeting.id, meeting]))
    onReplaceMeetings(next.map(record => toMeeting(record, previousById.get(record.id))))
  }, [meetings, onReplaceMeetings])

  const [folders, setFolders] = useState<WhisperFolder[]>(() => {
    const source = settings.whisperFolders
      ?? parseLegacy<WhisperFolder[]>(STORAGE_FOLDERS_KEY)
      ?? DEFAULT_WHISPER_FOLDERS
    return source.map(folder => ({ ...folder, name: fixMojibake(folder.name) }))
  })

  const [projectContext, setProjectContext] = useState<ProjectContextConfig | undefined>(() => {
    return (settings.whisperProjectContext as unknown as ProjectContextConfig | undefined)
      ?? parseLegacy<ProjectContextConfig>(STORAGE_PROJECT_CONTEXT_KEY)
  })

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(records[0]?.id || null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)

  useEffect(() => {
    const legacyRecords = parseLegacy<WhisperRecord[]>(STORAGE_RECORDS_KEY)
    if (meetings.length === 0 && legacyRecords?.length) {
      onReplaceMeetings(legacyRecords.map(record => toMeeting(record)))
      return
    }
    if (meetings.length > 0 && legacyRecords?.length) localStorage.removeItem(STORAGE_RECORDS_KEY)
  }, [meetings.length, onReplaceMeetings])

  useEffect(() => {
    if (!selectedRecordId && records[0]) setSelectedRecordId(records[0].id)
  }, [records, selectedRecordId])

  useEffect(() => {
    onUpdateSettings({ whisperFolders: folders })
    if (settings.whisperFolders?.length) localStorage.removeItem(STORAGE_FOLDERS_KEY)
  }, [folders])

  useEffect(() => {
    if (projectContext) onUpdateSettings({ whisperProjectContext: projectContext as unknown as Record<string, unknown> })
    if (settings.whisperProjectContext) localStorage.removeItem(STORAGE_PROJECT_CONTEXT_KEY)
  }, [projectContext])

  const selectedRecord = records.find(record => record.id === selectedRecordId)

  const handleAddFolder = (name: string) => {
    const newFolder: WhisperFolder = {
      id: `folder-${Date.now()}`,
      name,
      order: folders.length + 1,
    }
    setFolders(previous => [...previous, newFolder])
  }

  const handleRenameRecord = (id: string, newTitle: string) => onUpdateMeeting(id, { title: newTitle })
  const handleMoveRecord = (id: string, folderId: string | null) => onUpdateMeeting(id, { folderId })

  const handleDeleteRecord = (id: string) => {
    onRemoveMeeting(id)
    if (selectedRecordId === id) setSelectedRecordId(null)
  }

  const handleNewTranscript = () => setSelectedRecordId(null)

  return {
    folders,
    setFolders,
    records,
    setRecords,
    projectContext,
    setProjectContext,
    selectedRecordId,
    setSelectedRecordId,
    selectedFolderId,
    setSelectedFolderId,
    selectedRecord,
    handleAddFolder,
    handleRenameRecord,
    handleMoveRecord,
    handleDeleteRecord,
    handleNewTranscript,
  }
}
