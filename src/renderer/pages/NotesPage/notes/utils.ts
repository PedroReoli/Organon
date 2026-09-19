import type { TreeItemKind, TreeItemKey } from '@types'

export const noteTreeKey  = (id: string): TreeItemKey => `note:${id}`
export const folderTreeKey = (id: string): TreeItemKey => `folder:${id}`
export const folderContentPath = (folderId: string): string => `folders/${folderId}.md`

export const parseTreeKey = (key: TreeItemKey): { kind: TreeItemKind; id: string } | null => {
  if (key.startsWith('note:'))   return { kind: 'note',   id: key.slice(5) }
  if (key.startsWith('folder:')) return { kind: 'folder', id: key.slice(7) }
  return null
}

import { advancedMarkdownToHtml } from '../editor/markdownPasteHelper'

export const markdownToHtml = (md: string): string => {
  return advancedMarkdownToHtml(md)
}
