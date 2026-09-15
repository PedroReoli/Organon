export type CRMPriority = 'alta' | 'media' | 'baixa'

export const CRM_PRIORITY_LABELS: Record<CRMPriority, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
}

export const CRM_PRIORITY_COLORS: Record<CRMPriority, string> = {
  alta: '#ef4444',
  media: '#f97316',
  baixa: '#22c55e',
}

export type CRMStageId =
  | 'prospeccao'
  | 'contato'
  | 'proposta'
  | 'cliente-ativo'
  | 'perdeu'

export interface CRMStage {
  id: CRMStageId
  label: string
  description: string
  order: number
}

export const CRM_STAGES: CRMStage[] = [
  { id: 'prospeccao', label: 'Prospecção', description: 'Contato identificado, sem qualificação', order: 0 },
  { id: 'contato', label: 'Em Contato', description: 'Conversa iniciada, entendendo necessidade', order: 1 },
  { id: 'proposta', label: 'Proposta', description: 'Proposta enviada ou em negociação', order: 2 },
  { id: 'cliente-ativo', label: 'Cliente Ativo', description: 'Contrato fechado, projeto em execução', order: 3 },
  { id: 'perdeu', label: 'Perdeu', description: 'Negócio não fechado', order: 4 },
]

export type CRMStageOrder = CRMStageId[]

export interface CRMTag {
  id: string
  name: string
  color: string
  createdAt: string
}

export type CRMInteractionType = 'nota' | 'ligacao' | 'email' | 'reuniao' | 'mensagem' | 'outro'

export const CRM_INTERACTION_TYPES: Record<CRMInteractionType, string> = {
  nota: 'Nota',
  ligacao: 'Ligação',
  email: 'E-mail',
  reuniao: 'Reunião',
  mensagem: 'Mensagem',
  outro: 'Outro',
}

export interface CRMInteraction {
  id: string
  contactId: string
  type: CRMInteractionType
  content: string
  date: string
  time: string
  createdAt: string
}

export interface CRMContactLinks {
  noteIds: string[]
  calendarEventIds: string[]
  fileIds: string[]
  cardIds: string[]
  projectIds: string[]
}

export interface CRMContact {
  id: string
  name: string
  company: string | null
  role: string | null
  phone: string | null
  email: string | null
  socialMedia: string | null
  context: string | null
  interests: string | null
  priority: CRMPriority
  tags: string[]
  stageId: CRMStageId
  description: string
  followUpDate: string | null
  links: CRMContactLinks
  createdAt: string
  updatedAt: string
  order: number
}

export interface CRMSettings {
  stageOrder: CRMStageOrder
  defaultStageId: CRMStageId
}

export interface CRMSnapshot {
  id: string
  month: number
  year: number
  totalContacts: number
  byStage: Record<string, number>
  newContacts: number
  conversions: number
  lost: number
  interactions: number
  createdAt: string
}
