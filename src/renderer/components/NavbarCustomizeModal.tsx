import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Settings, NavbarConfig, NavbarGroupConfig, NavbarGroupId, NavbarItemConfig, NavbarView } from '../types'
import { DndContext, PointerSensor, closestCenter, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { NAVBAR_VIEW_LABELS, NAV_ICON_OPTIONS, createDefaultNavbarConfig, renderNavIcon, resolveNavbarConfig } from './navConfig'

interface NavbarCustomizeModalProps {
  isOpen: boolean
  onClose: () => void
  settings: Settings
  onUpdateSettings: (updates: Partial<Settings>) => void
}

const GROUP_DRAG_PREFIX = 'group:'
const VIEW_DRAG_PREFIX = 'view:'
const GROUP_BUCKET_PREFIX = 'bucket:group:'
const UNASSIGNED_BUCKET_ID = 'bucket:unassigned'
const UNASSIGNED_KEY = 'unassigned'

const getGroupDragId = (groupId: NavbarGroupId) => `${GROUP_DRAG_PREFIX}${groupId}`
const getViewDragId = (view: NavbarView) => `${VIEW_DRAG_PREFIX}${view}`
const getGroupBucketId = (groupId: NavbarGroupId) => `${GROUP_BUCKET_PREFIX}${groupId}`
const getBucketKey = (groupId: NavbarGroupId | null) => groupId ?? UNASSIGNED_KEY

const parseGroupId = (raw: string): NavbarGroupId | null => raw.startsWith(GROUP_DRAG_PREFIX)
  ? raw.slice(GROUP_DRAG_PREFIX.length) as NavbarGroupId
  : null

const parseViewId = (raw: string): NavbarView | null => raw.startsWith(VIEW_DRAG_PREFIX)
  ? raw.slice(VIEW_DRAG_PREFIX.length) as NavbarView
  : null

const parseBucketGroupId = (raw: string): NavbarGroupId | null => raw.startsWith(GROUP_BUCKET_PREFIX)
  ? raw.slice(GROUP_BUCKET_PREFIX.length) as NavbarGroupId
  : null

const DroppableBucket = ({ id, className, children }: { id: string; className: string; children: ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? 'is-drop-over' : ''}`}>
      {children}
    </div>
  )
}

const SortableGroupCard = ({
  group,
  onUpdateLabel,
  onUpdateIcon,
  onRemove,
}: {
  group: NavbarGroupConfig
  onUpdateLabel: (groupId: NavbarGroupId, label: string) => void
  onUpdateIcon: (groupId: NavbarGroupId, iconId: NavbarConfig['groups'][number]['iconId']) => void
  onRemove: (groupId: NavbarGroupId) => void
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: getGroupDragId(group.id) })

  return (
    <div
      ref={setNodeRef}
      className={`navbar-group-card ${isDragging ? 'is-dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="navbar-group-card-top">
        <button type="button" className="navbar-drag-handle" {...attributes} {...listeners} title="Arrastar item">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="4" cy="4" r="1" /><circle cx="12" cy="4" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="12" cy="12" r="1" />
          </svg>
        </button>

        <span className="settings-navbar-icon" aria-hidden="true">{renderNavIcon(group.iconId)}</span>

        <button type="button" className="navbar-group-remove" onClick={() => onRemove(group.id)} title="Remover da navbar">
          Remover
        </button>
      </div>

      <input
        className="form-input"
        value={group.label}
        onChange={event => onUpdateLabel(group.id, event.target.value)}
        placeholder="Nome do item"
      />

      <select
        className="form-input"
        value={group.iconId}
        onChange={event => onUpdateIcon(group.id, event.target.value as NavbarConfig['groups'][number]['iconId'])}
      >
        {NAV_ICON_OPTIONS.map(option => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}

const SortableViewCard = ({
  item,
  onUpdateIcon,
}: {
  item: NavbarItemConfig
  onUpdateIcon: (view: NavbarView, iconId: NavbarConfig['items'][number]['iconId']) => void
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: getViewDragId(item.view) })

  return (
    <div
      ref={setNodeRef}
      className={`navbar-view-card ${isDragging ? 'is-dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button type="button" className="navbar-drag-handle" {...attributes} {...listeners} title="Arrastar view">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="4" cy="4" r="1" /><circle cx="12" cy="4" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="12" cy="12" r="1" />
        </svg>
      </button>

      <span className="settings-navbar-icon" aria-hidden="true">{renderNavIcon(item.iconId)}</span>
      <span className="navbar-view-label">{NAVBAR_VIEW_LABELS[item.view]}</span>

      <select
        className="form-input navbar-view-icon-select"
        value={item.iconId}
        onChange={event => onUpdateIcon(item.view, event.target.value as NavbarConfig['items'][number]['iconId'])}
        onPointerDown={event => event.stopPropagation()}
      >
        {NAV_ICON_OPTIONS.map(option => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}

export const NavbarCustomizeModal = ({ isOpen, onClose, settings, onUpdateSettings }: NavbarCustomizeModalProps) => {
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const navbarConfig = useMemo(() => resolveNavbarConfig(settings.navbarConfig), [settings.navbarConfig])

  const orderedGroups = useMemo(() => [...navbarConfig.groups].sort((a, b) => a.order - b.order), [navbarConfig.groups])
  const activeGroups = useMemo(() => orderedGroups.filter(group => group.enabled), [orderedGroups])
  const hiddenGroups = useMemo(() => orderedGroups.filter(group => !group.enabled), [orderedGroups])

  const itemsByBucket = useMemo(() => {
    const buckets = new Map<string, NavbarItemConfig[]>()
    const enabledGroupSet = new Set(activeGroups.map(group => group.id))

    for (const group of activeGroups) {
      buckets.set(group.id, [])
    }
    buckets.set(UNASSIGNED_KEY, [])

    const orderedItems = [...navbarConfig.items].sort((a, b) => a.order - b.order)
    for (const item of orderedItems) {
      const bucketKey = item.groupId && enabledGroupSet.has(item.groupId) ? item.groupId : UNASSIGNED_KEY
      const list = buckets.get(bucketKey) ?? []
      list.push({ ...item, groupId: bucketKey === UNASSIGNED_KEY ? null : item.groupId })
      buckets.set(bucketKey, list)
    }

    return buckets
  }, [activeGroups, navbarConfig.items])

  const viewToGroup = useMemo(() => {
    const map = new Map<NavbarView, NavbarGroupId | null>()
    for (const [bucket, items] of itemsByBucket) {
      const groupId = bucket === UNASSIGNED_KEY ? null : bucket as NavbarGroupId
      for (const item of items) {
        map.set(item.view, groupId)
      }
    }
    return map
  }, [itemsByBucket])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const applyNavbarConfig = (updater: (current: NavbarConfig) => NavbarConfig) => {
    const nextConfig = resolveNavbarConfig(updater(navbarConfig))
    onUpdateSettings({ navbarConfig: nextConfig })
  }

  const updateGroupLabel = (groupId: NavbarGroupId, label: string) => {
    applyNavbarConfig(current => ({
      ...current,
      groups: current.groups.map(group => group.id === groupId ? { ...group, label } : group),
    }))
  }

  const updateGroupIcon = (groupId: NavbarGroupId, iconId: NavbarConfig['groups'][number]['iconId']) => {
    applyNavbarConfig(current => ({
      ...current,
      groups: current.groups.map(group => group.id === groupId ? { ...group, iconId } : group),
    }))
  }

  const updateViewIcon = (view: NavbarView, iconId: NavbarConfig['items'][number]['iconId']) => {
    applyNavbarConfig(current => ({
      ...current,
      items: current.items.map(item => item.view === view ? { ...item, iconId } : item),
    }))
  }

  const setGroupEnabled = (groupId: NavbarGroupId, enabled: boolean) => {
    applyNavbarConfig(current => {
      const enabledGroups = current.groups.filter(group => group.enabled && group.id !== groupId)
      const targetGroup = current.groups.find(group => group.id === groupId)

      const nextGroups = current.groups.map(group => {
        if (group.id !== groupId) return group
        return {
          ...group,
          enabled,
          order: enabled ? enabledGroups.length : group.order,
        }
      })

      const orderedEnabled = [
        ...nextGroups.filter(group => group.enabled).sort((a, b) => a.order - b.order),
        ...nextGroups.filter(group => !group.enabled).sort((a, b) => a.order - b.order),
      ].map((group, index) => ({ ...group, order: index }))

      if (enabled || !targetGroup) {
        return { ...current, groups: orderedEnabled }
      }

      let unassignedOrder = current.items.filter(item => item.groupId === null).length
      const nextItems = current.items.map(item => {
        if (item.groupId !== groupId) return item
        const movedItem = { ...item, groupId: null, order: unassignedOrder }
        unassignedOrder += 1
        return movedItem
      })

      return { ...current, groups: orderedEnabled, items: nextItems }
    })
  }

  const reorderGroups = (activeGroupId: NavbarGroupId, overGroupId: NavbarGroupId) => {
    if (activeGroupId === overGroupId) return

    applyNavbarConfig(current => {
      const enabledGroups = current.groups.filter(group => group.enabled).sort((a, b) => a.order - b.order)
      const disabledGroups = current.groups.filter(group => !group.enabled).sort((a, b) => a.order - b.order)

      const oldIndex = enabledGroups.findIndex(group => group.id === activeGroupId)
      const newIndex = enabledGroups.findIndex(group => group.id === overGroupId)
      if (oldIndex === -1 || newIndex === -1) return current

      const movedEnabled = arrayMove(enabledGroups, oldIndex, newIndex)
      const orderedGroups = [...movedEnabled, ...disabledGroups].map((group, index) => ({ ...group, order: index }))
      return { ...current, groups: orderedGroups }
    })
  }

  const moveView = (activeView: NavbarView, targetGroupId: NavbarGroupId | null, overView: NavbarView | null) => {
    applyNavbarConfig(current => {
      const orderedGroups = [...current.groups].sort((a, b) => a.order - b.order)
      const enabledGroups = orderedGroups.filter(group => group.enabled)
      const enabledGroupSet = new Set(enabledGroups.map(group => group.id))

      const buckets = new Map<string, NavbarItemConfig[]>()
      for (const group of enabledGroups) {
        buckets.set(group.id, [])
      }
      buckets.set(UNASSIGNED_KEY, [])

      const orderedItems = [...current.items].sort((a, b) => a.order - b.order)
      for (const item of orderedItems) {
        const bucketKey = item.groupId && enabledGroupSet.has(item.groupId) ? item.groupId : UNASSIGNED_KEY
        const list = buckets.get(bucketKey) ?? []
        list.push({ ...item, groupId: bucketKey === UNASSIGNED_KEY ? null : item.groupId })
        buckets.set(bucketKey, list)
      }

      let sourceBucketKey: string | null = null
      let sourceIndex = -1
      let movingItem: NavbarItemConfig | null = null

      for (const [bucketKey, list] of buckets) {
        const index = list.findIndex(item => item.view === activeView)
        if (index !== -1) {
          sourceBucketKey = bucketKey
          sourceIndex = index
          movingItem = list[index]
          break
        }
      }

      if (!movingItem || sourceBucketKey === null) return current

      const safeTargetGroupId = targetGroupId && enabledGroupSet.has(targetGroupId) ? targetGroupId : null
      const targetBucketKey = getBucketKey(safeTargetGroupId)

      const sourceList = [...(buckets.get(sourceBucketKey) ?? [])]
      sourceList.splice(sourceIndex, 1)
      buckets.set(sourceBucketKey, sourceList)

      const targetList = sourceBucketKey === targetBucketKey
        ? sourceList
        : [...(buckets.get(targetBucketKey) ?? [])]

      let insertIndex = targetList.length
      if (overView) {
        const overIndex = targetList.findIndex(item => item.view === overView)
        if (overIndex !== -1) {
          insertIndex = overIndex
          if (sourceBucketKey === targetBucketKey && sourceIndex < overIndex) {
            insertIndex -= 1
          }
        }
      }

      targetList.splice(insertIndex, 0, { ...movingItem, groupId: safeTargetGroupId })
      buckets.set(targetBucketKey, targetList)

      const nextItems: NavbarItemConfig[] = []
      for (const group of enabledGroups) {
        const list = buckets.get(group.id) ?? []
        list.forEach((item, index) => {
          nextItems.push({ ...item, groupId: group.id, order: index })
        })
      }

      const unassignedItems = buckets.get(UNASSIGNED_KEY) ?? []
      unassignedItems.forEach((item, index) => {
        nextItems.push({ ...item, groupId: null, order: index })
      })

      return { ...current, items: nextItems }
    })
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    setActiveDragId(null)

    if (!overId) return

    const activeGroupId = parseGroupId(activeId)
    const overGroupId = parseGroupId(overId)

    if (activeGroupId) {
      if (overGroupId) {
        reorderGroups(activeGroupId, overGroupId)
      }
      return
    }

    const activeView = parseViewId(activeId)
    if (!activeView) return

    let targetGroupId: NavbarGroupId | null = null
    let overView: NavbarView | null = null

    if (overId === UNASSIGNED_BUCKET_ID) {
      targetGroupId = null
    } else {
      const bucketGroupId = parseBucketGroupId(overId)
      if (bucketGroupId) {
        targetGroupId = bucketGroupId
      } else if (overGroupId) {
        targetGroupId = overGroupId
      } else {
        overView = parseViewId(overId)
        targetGroupId = overView ? (viewToGroup.get(overView) ?? null) : null
      }
    }

    moveView(activeView, targetGroupId, overView)
  }

  const handleDragCancel = () => {
    setActiveDragId(null)
  }

  const handleResetNavbar = () => {
    onUpdateSettings({ navbarConfig: createDefaultNavbarConfig() })
  }

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const activeGroupDragIds = activeGroups.map(group => getGroupDragId(group.id))
  const activeDragGroup = activeDragId ? parseGroupId(activeDragId) : null
  const activeDragView = activeDragId ? parseViewId(activeDragId) : null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal navbar-customize-modal" onClick={event => event.stopPropagation()}>
        <header className="modal-header">
          <h2>Personalizar Navbar</h2>
          <button className="modal-close-btn" onClick={onClose} title="Fechar">&times;</button>
        </header>

        <div className="modal-body navbar-customize-body">
          <p className="settings-help-text">
            Arraste para ordenar. Remova/adicione itens da navbar e arraste views entre os itens.
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <section className="navbar-customize-section">
              <div className="navbar-customize-section-head">
                <h3>Itens da Navbar</h3>
                <span>{activeGroups.length} ativo(s)</span>
              </div>

              <SortableContext items={activeGroupDragIds} strategy={horizontalListSortingStrategy}>
                <div className="navbar-group-strip">
                  {activeGroups.map(group => (
                    <SortableGroupCard
                      key={group.id}
                      group={group}
                      onUpdateLabel={updateGroupLabel}
                      onUpdateIcon={updateGroupIcon}
                      onRemove={(groupId) => setGroupEnabled(groupId, false)}
                    />
                  ))}
                </div>
              </SortableContext>

              <div className="navbar-group-pool">
                <span className="navbar-group-pool-label">Adicionar item:</span>
                {hiddenGroups.length === 0 && <span className="navbar-group-pool-empty">Todos os itens estao ativos</span>}
                {hiddenGroups.map(group => (
                  <button
                    key={group.id}
                    className="btn btn-secondary btn-sm"
                    onClick={() => setGroupEnabled(group.id, true)}
                    title="Adicionar item na navbar"
                  >
                    + {group.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="navbar-customize-section">
              <div className="navbar-customize-section-head">
                <h3>Views</h3>
                <span>Arraste para mover entre itens</span>
              </div>

              <div className="navbar-view-board">
                {activeGroups.map(group => {
                  const bucketId = getGroupBucketId(group.id)
                  const views = itemsByBucket.get(group.id) ?? []
                  const sortableIds = views.map(item => getViewDragId(item.view))

                  return (
                    <div key={group.id} className="navbar-view-column">
                      <div className="navbar-view-column-head">
                        <span className="settings-navbar-icon" aria-hidden="true">{renderNavIcon(group.iconId)}</span>
                        <strong>{group.label}</strong>
                        <span>{views.length}</span>
                      </div>

                      <DroppableBucket id={bucketId} className="navbar-view-column-body">
                        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                          <div className="navbar-view-list">
                            {views.map(item => (
                              <SortableViewCard key={item.view} item={item} onUpdateIcon={updateViewIcon} />
                            ))}
                            {views.length === 0 && <div className="navbar-view-empty">Solte views aqui</div>}
                          </div>
                        </SortableContext>
                      </DroppableBucket>
                    </div>
                  )
                })}

                <div className="navbar-view-column navbar-view-column-unassigned">
                  <div className="navbar-view-column-head">
                    <strong>Fora da Navbar</strong>
                    <span>{(itemsByBucket.get(UNASSIGNED_KEY) ?? []).length}</span>
                  </div>

                  <DroppableBucket id={UNASSIGNED_BUCKET_ID} className="navbar-view-column-body">
                    <SortableContext
                      items={(itemsByBucket.get(UNASSIGNED_KEY) ?? []).map(item => getViewDragId(item.view))}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="navbar-view-list">
                        {(itemsByBucket.get(UNASSIGNED_KEY) ?? []).map(item => (
                          <SortableViewCard key={item.view} item={item} onUpdateIcon={updateViewIcon} />
                        ))}
                        {(itemsByBucket.get(UNASSIGNED_KEY) ?? []).length === 0 && (
                          <div className="navbar-view-empty">Sem views fora da navbar</div>
                        )}
                      </div>
                    </SortableContext>
                  </DroppableBucket>
                </div>
              </div>
            </section>

            {(activeDragGroup || activeDragView) && (
              <div className="navbar-drag-overlay">
                {activeDragGroup && <span>{orderedGroups.find(group => group.id === activeDragGroup)?.label ?? 'Item'}</span>}
                {activeDragView && <span>{NAVBAR_VIEW_LABELS[activeDragView]}</span>}
              </div>
            )}
          </DndContext>
        </div>

        <footer className="modal-footer">
          <button className="btn btn-secondary" onClick={handleResetNavbar}>Restaurar padrao</button>
          <button className="btn btn-primary" onClick={onClose}>Fechar</button>
        </footer>
      </div>
    </div>
  )
}
