import type { Playbook, PlaybookVariable } from '../../types'
import type { UpdateStoreFn } from './types'
import { generateId } from '../../utils'

export const createPlaybookExtrasSlice = (updateStore: UpdateStoreFn) => {
  const togglePlaybookFavorite = (playbookId: string) => {
    updateStore(prev => ({
      ...prev,
      playbooks: (prev.playbooks || []).map((pb: any) =>
        pb.id !== playbookId ? pb : { ...pb, isFavorite: !pb.isFavorite },
      ),
    }))
  }

  const togglePlaybookArchived = (playbookId: string) => {
    updateStore(prev => ({
      ...prev,
      playbooks: (prev.playbooks || []).map((pb: any) =>
        pb.id !== playbookId ? pb : { ...pb, isArchived: !pb.isArchived },
      ),
    }))
  }

  const movePlaybookToFolder = (playbookId: string, folderId: string | null) => {
    updateStore(prev => ({
      ...prev,
      playbooks: (prev.playbooks || []).map((pb: any) =>
        pb.id !== playbookId ? pb : { ...pb, folderId },
      ),
    }))
  }

  const addPlaybookFromTemplate = (input: {
    title: string
    sector?: string
    category?: string
    summary?: string
    content?: string
    dialogs: Array<{
      title: string
      text: string
      variables?: PlaybookVariable[]
    }>
  }) => {
    const title = input.title.trim()
    if (!title) return undefined

    const now = new Date().toISOString()
    const playbookId = generateId()
    const newPlaybook: Playbook = {
      id: playbookId,
      title,
      sector: (input.sector ?? 'Geral').trim() || 'Geral',
      category: (input.category ?? 'Geral').trim() || 'Geral',
      summary: (input.summary ?? '').trim(),
      content: input.content ?? '',
      dialogs: input.dialogs.map((d, index) => ({
        id: generateId(),
        title: d.title.trim() || `Dialogo ${index + 1}`,
        text: d.text,
        order: index,
        createdAt: now,
        updatedAt: now,
        variables: d.variables,
      })),
      order: 0,
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
      isArchived: false,
      folderId: null,
      viewCount: 0,
      versions: [],
    }

    updateStore(prev => {
      const playbooks = prev.playbooks || []
      const maxOrder = playbooks.length > 0
        ? Math.max(...playbooks.map((p: any) => p.order))
        : -1
      return {
        ...prev,
        playbooks: [...playbooks, { ...newPlaybook, order: maxOrder + 1 }],
      }
    })

    return playbookId
  }

  return {
    togglePlaybookFavorite,
    togglePlaybookArchived,
    movePlaybookToFolder,
    addPlaybookFromTemplate,
  }
}
