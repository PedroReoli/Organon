import type { Meeting } from '../../types'
import type { UpdateStoreFn } from './types'

export const createMeetingSlice = (updateStore: UpdateStoreFn) => {
  const addMeeting = (meeting: Meeting) => {
    updateStore(prev => ({
      ...prev,
      meetings: [...prev.meetings, meeting],
    }))
  }

  const updateMeeting = (meetingId: string, updates: Partial<Pick<Meeting, 'title' | 'transcription'>>) => {
    updateStore(prev => ({
      ...prev,
      meetings: prev.meetings.map((m: any) =>
        m.id !== meetingId ? m : { ...m, ...updates, updatedAt: new Date().toISOString() },
      ),
    }))
  }

  const removeMeeting = (meetingId: string) => {
    updateStore(prev => ({
      ...prev,
      meetings: prev.meetings.filter((m: any) => m.id !== meetingId),
      pendingDeletes: [...(prev.pendingDeletes ?? []), { resource: 'meetings', id: meetingId }],
    }))
  }

  return {
    addMeeting,
    updateMeeting,
    removeMeeting,
  }
}
