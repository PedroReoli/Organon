import { useState, useEffect } from 'react'
import { WhisperFolder, WhisperRecord, DEFAULT_WHISPER_FOLDERS } from '../types/whisper.types'
import { ProjectContextConfig } from '../../../services/meetingIntelligence/types'
import { fixMojibake } from '../utils/whisperUtils'

const STORAGE_RECORDS_KEY = 'organon-whisper-records'
const STORAGE_FOLDERS_KEY = 'organon-whisper-folders'
const STORAGE_PROJECT_CONTEXT_KEY = 'organon-meeting-project-context'

export function useWhisperPersistence() {
  const [folders, setFolders] = useState<WhisperFolder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_FOLDERS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return parsed.map((f: WhisperFolder) => ({ ...f, name: fixMojibake(f.name) }))
      }
    } catch {}
    return DEFAULT_WHISPER_FOLDERS
  })

  const [records, setRecords] = useState<WhisperRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_RECORDS_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        return parsed.map((rec: WhisperRecord) => ({
          ...rec,
          title: fixMojibake(rec.title),
          fullTranscript: fixMojibake(rec.fullTranscript),
          segments: (rec.segments || []).map(s => ({
            ...s,
            speakerName: fixMojibake(s.speakerName),
            text: fixMojibake(s.text),
          })),
        }))
      }
    } catch {}
    return []
  })

  const [projectContext, setProjectContext] = useState<ProjectContextConfig | undefined>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROJECT_CONTEXT_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return undefined
  })

  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(records[0]?.id || null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_RECORDS_KEY, JSON.stringify(records))
    } catch {}
  }, [records])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FOLDERS_KEY, JSON.stringify(folders))
    } catch {}
  }, [folders])

  useEffect(() => {
    try {
      if (projectContext) {
        localStorage.setItem(STORAGE_PROJECT_CONTEXT_KEY, JSON.stringify(projectContext))
      }
    } catch {}
  }, [projectContext])

  const selectedRecord = records.find(r => r.id === selectedRecordId)

  const handleAddFolder = (name: string) => {
    const newFolder: WhisperFolder = {
      id: `folder-${Date.now()}`,
      name,
      order: folders.length + 1,
    }
    setFolders(prev => [...prev, newFolder])
  }

  const handleRenameRecord = (id: string, newTitle: string) => {
    setRecords(prev => prev.map(r => (r.id === id ? { ...r, title: newTitle } : r)))
  }

  const handleMoveRecord = (id: string, folderId: string | null) => {
    setRecords(prev => prev.map(r => (r.id === id ? { ...r, folderId } : r)))
  }

  const handleDeleteRecord = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id))
    if (selectedRecordId === id) {
      setSelectedRecordId(null)
    }
  }

  const handleNewTranscript = () => {
    setSelectedRecordId(null)
  }

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
