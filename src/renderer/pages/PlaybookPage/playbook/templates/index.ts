/**
 * Registry de templates builtin de playbook.
 * Upgrade 15.
 */

import type { PlaybookTemplate } from '@types'
import { VendasTemplate } from './VendasTemplate'
import { SuporteTemplate } from './SuporteTemplate'
import { RecrutamentoTemplate } from './RecrutamentoTemplate'
import { ReunioesTemplate } from './ReunioesTemplate'

export const BUILTIN_PLAYBOOK_TEMPLATES: PlaybookTemplate[] = [
  VendasTemplate,
  SuporteTemplate,
  RecrutamentoTemplate,
  ReunioesTemplate,
]

export type { PlaybookTemplate, PlaybookTemplateDialog } from '@types'
