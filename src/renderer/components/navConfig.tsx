import type {
  NavIconId,
  NavbarConfig,
  NavbarGroupConfig,
  NavbarGroupId,
  NavbarItemConfig,
  NavbarView,
} from '../types'

interface NavIconOption {
  id: NavIconId
  label: string
}

export const NAV_ICON_OPTIONS: NavIconOption[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'organization', label: 'Organizacao' },
  { id: 'tools', label: 'Ferramentas' },
  { id: 'content', label: 'Conteudo' },
  { id: 'personal', label: 'Pessoal' },
  { id: 'planner', label: 'Planejamento' },
  { id: 'calendar', label: 'Calendario' },
  { id: 'crm', label: 'CRM' },
  { id: 'playbook', label: 'Playbook' },
  { id: 'projects', label: 'Projetos' },
  { id: 'colors', label: 'Cores' },
  { id: 'paths', label: 'Paths' },
  { id: 'shortcuts', label: 'Atalhos' },
  { id: 'apps', label: 'Apps' },
  { id: 'notes', label: 'Notas' },
  { id: 'clipboard', label: 'Clipboard' },
  { id: 'files', label: 'Arquivos' },
  { id: 'habits', label: 'Habitos' },
  { id: 'study', label: 'Estudos' },
  { id: 'financial', label: 'Financeiro' },
]

const NAV_ICON_ID_SET = new Set<NavIconId>(NAV_ICON_OPTIONS.map(option => option.id))

const ICONS: Record<NavIconId, JSX.Element> = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4v4l2.5 2.5" />
    </svg>
  ),
  planner: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="11" rx="2" />
      <path d="M2 6h12" />
      <path d="M5 2v2M11 2v2" />
    </svg>
  ),
  calendar: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="11" rx="2" />
      <path d="M2 6h12" />
      <path d="M5 2v2M11 2v2" />
      <circle cx="8" cy="10" r="1" fill="currentColor" />
    </svg>
  ),
  shortcuts: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9.5 1.5L3 9.5h4.5L6.5 14.5L13 6.5H8.5L9.5 1.5Z" />
    </svg>
  ),
  paths: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 4.5h4l1.2 1.6h5.8v6.4a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" />
    </svg>
  ),
  projects: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="10 12 14 8 10 4" />
      <polyline points="6 4 2 8 6 12" />
    </svg>
  ),
  notes: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6l-4-4Z" />
      <path d="M9 2v4h4" />
      <path d="M5 8h6M5 11h4" />
    </svg>
  ),
  clipboard: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2H6a1 1 0 0 0-1 1v1h6V3a1 1 0 0 0-1-1Z" />
      <rect x="3" y="4" width="10" height="10" rx="1" />
    </svg>
  ),
  files: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <circle cx="5.5" cy="5.5" r="1.5" />
      <path d="M14 10l-3-3-5 5" />
    </svg>
  ),
  apps: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  ),
  habits: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13 3L6.5 10.5 3 7" />
      <circle cx="8" cy="8" r="6.5" />
    </svg>
  ),
  study: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 4.5L8 2l5.5 2.5L8 7 2.5 4.5Z" />
      <path d="M3 6.5V11l5 2.5 5-2.5V6.5" />
    </svg>
  ),
  financial: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="8" y1="2" x2="8" y2="14" />
      <path d="M11 4H6.5a2 2 0 0 0 0 4h3a2 2 0 0 1 0 4H5" />
    </svg>
  ),
  organization: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="11" rx="2" />
      <path d="M2 6h12" />
      <path d="M5 2v2M11 2v2" />
    </svg>
  ),
  content: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6l-4-4Z" />
      <path d="M9 2v4h4" />
    </svg>
  ),
  tools: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  ),
  personal: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13 3L6.5 10.5 3 7" />
      <circle cx="8" cy="8" r="6.5" />
    </svg>
  ),
  crm: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4z" />
      <path d="M6 8h4M6 10h4" />
      <circle cx="8" cy="6" r="1" fill="currentColor" />
    </svg>
  ),
  playbook: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3.5 2.5h7a2 2 0 0 1 2 2v9h-9a1 1 0 0 1-1-1v-8a2 2 0 0 1 2-2Z" />
      <path d="M5 5.5h6M5 8h6M5 10.5h4" />
    </svg>
  ),
  colors: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 2.5v11" />
      <path d="M2.5 8h11" />
    </svg>
  ),
}

export const renderNavIcon = (iconId: NavIconId): JSX.Element => ICONS[iconId] ?? ICONS.dashboard

export const DEFAULT_NAVBAR_GROUPS: NavbarGroupConfig[] = [
  { id: 'organization', label: 'Organizacao', iconId: 'organization', enabled: true, order: 0 },
  { id: 'work', label: 'Trabalho', iconId: 'projects', enabled: true, order: 1 },
  { id: 'tools', label: 'Ferramentas', iconId: 'tools', enabled: true, order: 2 },
  { id: 'content', label: 'Conteudo', iconId: 'content', enabled: true, order: 3 },
  { id: 'personal', label: 'Pessoal', iconId: 'personal', enabled: true, order: 4 },
]

export const DEFAULT_NAVBAR_ITEMS: NavbarItemConfig[] = [
  { view: 'planner', label: 'Planejamento', iconId: 'planner', groupId: 'organization', order: 0 },
  { view: 'calendar', label: 'Calendario', iconId: 'calendar', groupId: 'organization', order: 1 },
  { view: 'crm', label: 'CRM', iconId: 'crm', groupId: 'work', order: 0 },
  { view: 'playbook', label: 'Playbook', iconId: 'playbook', groupId: 'work', order: 1 },
  { view: 'projects', label: 'Projetos', iconId: 'projects', groupId: 'work', order: 2 },
  { view: 'colors', label: 'Cores', iconId: 'colors', groupId: 'work', order: 3 },
  { view: 'paths', label: 'Paths', iconId: 'paths', groupId: 'tools', order: 0 },
  { view: 'shortcuts', label: 'Atalhos', iconId: 'shortcuts', groupId: 'tools', order: 1 },
  { view: 'apps', label: 'Apps', iconId: 'apps', groupId: 'tools', order: 2 },
  { view: 'notes', label: 'Notas', iconId: 'notes', groupId: 'content', order: 0 },
  { view: 'clipboard', label: 'Clipboard', iconId: 'clipboard', groupId: 'content', order: 1 },
  { view: 'files', label: 'Arquivos', iconId: 'files', groupId: 'content', order: 2 },
  { view: 'habits', label: 'Habitos', iconId: 'habits', groupId: 'personal', order: 0 },
  { view: 'study', label: 'Estudos', iconId: 'study', groupId: 'personal', order: 1 },
  { view: 'financial', label: 'Financeiro', iconId: 'financial', groupId: 'personal', order: 2 },
]

export const NAVBAR_VIEW_LABELS: Record<NavbarView, string> = DEFAULT_NAVBAR_ITEMS.reduce((acc, item) => {
  acc[item.view] = item.label
  return acc
}, {} as Record<NavbarView, string>)

const DEFAULT_GROUP_BY_ID: Record<NavbarGroupId, NavbarGroupConfig> = DEFAULT_NAVBAR_GROUPS.reduce((acc, group) => {
  acc[group.id] = group
  return acc
}, {} as Record<NavbarGroupId, NavbarGroupConfig>)

const DEFAULT_ITEM_BY_VIEW: Record<NavbarView, NavbarItemConfig> = DEFAULT_NAVBAR_ITEMS.reduce((acc, item) => {
  acc[item.view] = item
  return acc
}, {} as Record<NavbarView, NavbarItemConfig>)

const NAVBAR_VIEW_SET = new Set<NavbarView>(DEFAULT_NAVBAR_ITEMS.map(item => item.view))

const isValidIconId = (value: unknown): value is NavIconId => typeof value === 'string' && NAV_ICON_ID_SET.has(value as NavIconId)
const isValidGroupId = (value: unknown): value is NavbarGroupId => typeof value === 'string' && value in DEFAULT_GROUP_BY_ID

export const createDefaultNavbarConfig = (): NavbarConfig => ({
  groups: DEFAULT_NAVBAR_GROUPS.map(group => ({ ...group })),
  items: DEFAULT_NAVBAR_ITEMS.map(item => ({ ...item })),
})

export const resolveNavbarConfig = (raw?: NavbarConfig | null): NavbarConfig => {
  const rawGroups = Array.isArray(raw?.groups) ? raw.groups : []
  const rawItems = Array.isArray(raw?.items) ? raw.items : []

  const groups: NavbarGroupConfig[] = DEFAULT_NAVBAR_GROUPS.map(defaultGroup => {
    const candidate = rawGroups.find(group => group.id === defaultGroup.id)
    return {
      id: defaultGroup.id,
      label: typeof candidate?.label === 'string' && candidate.label.trim() ? candidate.label.trim() : defaultGroup.label,
      iconId: isValidIconId(candidate?.iconId) ? candidate.iconId : defaultGroup.iconId,
      enabled: typeof candidate?.enabled === 'boolean' ? candidate.enabled : defaultGroup.enabled,
      order: Number.isFinite(candidate?.order) ? Number(candidate?.order) : defaultGroup.order,
    }
  })

  groups.sort((a, b) => a.order - b.order)
  groups.forEach((group, index) => {
    group.order = index
  })

  const validGroupIdSet = new Set(groups.map(group => group.id))
  const enabledGroupIdSet = new Set(groups.filter(group => group.enabled).map(group => group.id))

  const items = DEFAULT_NAVBAR_ITEMS.map(defaultItem => {
    const candidate = rawItems.find(item => item.view === defaultItem.view)
    const defaultGroupId = enabledGroupIdSet.has(defaultItem.groupId) ? defaultItem.groupId : null
    const candidateGroupId = isValidGroupId(candidate?.groupId) && validGroupIdSet.has(candidate.groupId)
      ? candidate.groupId
      : null
    const groupId = candidateGroupId && enabledGroupIdSet.has(candidateGroupId)
      ? candidateGroupId
      : defaultGroupId

    return {
      view: defaultItem.view,
      label: typeof candidate?.label === 'string' && candidate.label.trim() ? candidate.label.trim() : defaultItem.label,
      iconId: isValidIconId(candidate?.iconId) ? candidate.iconId : defaultItem.iconId,
      groupId,
      order: Number.isFinite(candidate?.order) ? Number(candidate?.order) : defaultItem.order,
    }
  })

  const itemsByGroup = new Map<NavbarGroupId | null, NavbarItemConfig[]>()
  for (const item of items) {
    const list = itemsByGroup.get(item.groupId) ?? []
    list.push(item)
    itemsByGroup.set(item.groupId, list)
  }

  const normalizedItems: NavbarItemConfig[] = []
  for (const group of groups.filter(item => item.enabled)) {
    const groupItems = (itemsByGroup.get(group.id) ?? []).sort((a, b) => a.order - b.order)
    groupItems.forEach((item, index) => {
      normalizedItems.push({ ...item, order: index })
    })
  }

  const unassignedItems = (itemsByGroup.get(null) ?? []).sort((a, b) => a.order - b.order)
  unassignedItems.forEach((item, index) => {
    normalizedItems.push({ ...item, order: index })
  })

  return {
    groups,
    items: normalizedItems,
  }
}

export const isNavbarView = (value: string): value is NavbarView => NAVBAR_VIEW_SET.has(value as NavbarView)
