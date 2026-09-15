/**
 * Shape de um template builtin de playbook.
 * Definido no upgrade 15.
 */

import type { PlaybookVariable } from '@types'

export interface PlaybookTemplateDialog {
  title: string
  text: string
  variables?: PlaybookVariable[]
}

export interface PlaybookTemplate {
  id: string
  name: string
  description: string
  icon: string
  sector: string
  category: string
  summary: string
  content: string
  dialogs: PlaybookTemplateDialog[]
}
