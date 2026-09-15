/**
 * CRMToolbar — barra superior com busca global + filtros do CRM.
 *
 * Consome e controla o estado de CRMFilters definido em useCRMFilters.
 * Upgrade 03.
 */

import React from 'react'
import type { CRMStageId, CRMTag } from '@types'
import { CRM_STAGES, CRM_PRIORITY_LABELS } from '@types'
import type { CRMFilters } from '@hooks/useCRMFilters'
import { createEmptyCRMFilters } from '@hooks/useCRMFilters'
import { Button, Input } from '@shared/components/primitives'

interface CRMToolbarProps {
  filters: CRMFilters
  onChange: (next: CRMFilters) => void
  tags: CRMTag[]
  totalCount: number
  filteredCount: number
  onAddContact?: () => void
}

const PRIORITIES: Array<'alta' | 'media' | 'baixa'> = ['alta', 'media', 'baixa']

export const CRMToolbar: React.FC<CRMToolbarProps> = ({
  filters,
  onChange,
  tags,
  totalCount,
  filteredCount,
  onAddContact,
}) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [draftQuery, setDraftQuery] = React.useState(filters.query)
  const [filtersOpen, setFiltersOpen] = React.useState(false)

  React.useEffect(() => {
    setDraftQuery(filters.query)
  }, [filters.query])

  React.useEffect(() => {
    const hasAny =
      filters.query.length > 0 ||
      filters.stages.size > 0 ||
      filters.tagIds.size > 0 ||
      filters.priorities.size > 0 ||
      filters.hasProject ||
      filters.hasNote ||
      filters.recentInteractionDays > 0
    if (hasAny) setFiltersOpen(true)
  }, [filters])

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
      if (e.key === 'Escape') {
        if (document.activeElement === inputRef.current) {
          e.preventDefault()
          setDraftQuery('')
          onChange({ ...filters, query: '' })
        }
      }
      if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setFiltersOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [filters, onChange])

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      if (draftQuery !== filters.query) onChange({ ...filters, query: draftQuery })
    }, 120)
    return () => window.clearTimeout(handle)
  }, [draftQuery, filters, onChange])

  const toggleInSet = <T,>(set: Set<T>, value: T): Set<T> => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  const setStage = (stage: CRMStageId) => {
    onChange({ ...filters, stages: toggleInSet(filters.stages, stage) })
  }

  const setTag = (tagId: string) => {
    onChange({ ...filters, tagIds: toggleInSet(filters.tagIds, tagId) })
  }

  const setPriority = (p: string) => {
    onChange({ ...filters, priorities: toggleInSet(filters.priorities, p) })
  }

  const clearAll = () => onChange(createEmptyCRMFilters())

  const hasAnyFilter =
    filters.query.length > 0 ||
    filters.stages.size > 0 ||
    filters.tagIds.size > 0 ||
    filters.priorities.size > 0 ||
    filters.hasProject ||
    filters.hasNote ||
    filters.recentInteractionDays > 0

  const activeFiltersCount =
    (filters.stages.size > 0 ? 1 : 0) +
    (filters.tagIds.size > 0 ? 1 : 0) +
    (filters.priorities.size > 0 ? 1 : 0) +
    (filters.hasProject ? 1 : 0) +
    (filters.hasNote ? 1 : 0) +
    (filters.recentInteractionDays > 0 ? 1 : 0)

  return (
    <div className="crm-toolbar" data-debug-name="CRMToolbar">
      <div className="crm-toolbar-row">
        <div className="crm-toolbar-search">
          <Input
            type="search"
            ref={inputRef}
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            placeholder="Buscar (Ctrl+K) — nome, empresa, email, tags, etc."
            fullWidth
          />
        </div>
        <div className="crm-toolbar-meta">
          {hasAnyFilter ? (
            <span className="crm-toolbar-count">
              {filteredCount} / {totalCount}
            </span>
          ) : (
            <span className="crm-toolbar-count">{totalCount} contatos</span>
          )}
          <Button
            size="sm"
            variant={filtersOpen ? 'primary' : 'secondary'}
            onClick={() => setFiltersOpen((v) => !v)}
          >
            Filtros{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
          </Button>
          {onAddContact && (
            <Button size="sm" variant="primary" onClick={onAddContact}>
              + Contato
            </Button>
          )}
          {hasAnyFilter && (
            <Button size="sm" variant="ghost" onClick={clearAll}>
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className="crm-toolbar-row crm-toolbar-chips">
          <div className="crm-chip-group">
            <span className="crm-chip-label">Estágio:</span>
            {CRM_STAGES.map((s) => {
              const active = filters.stages.has(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`crm-chip ${active ? 'is-active' : ''}`}
                  onClick={() => setStage(s.id)}
                >
                  {s.label}
                </button>
              )
            })}
          </div>

          <div className="crm-chip-group">
            <span className="crm-chip-label">Prioridade:</span>
            {PRIORITIES.map((p) => {
              const active = filters.priorities.has(p)
              return (
                <button
                  key={p}
                  type="button"
                  className={`crm-chip ${active ? 'is-active' : ''}`}
                  onClick={() => setPriority(p)}
                >
                  {CRM_PRIORITY_LABELS[p]}
                </button>
              )
            })}
          </div>

          {tags.length > 0 && (
            <div className="crm-chip-group">
              <span className="crm-chip-label">Tags:</span>
              {tags.slice(0, 12).map((t) => {
                const active = filters.tagIds.has(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`crm-chip crm-chip-tag ${active ? 'is-active' : ''}`}
                    style={active ? { backgroundColor: t.color, borderColor: t.color } : { borderColor: t.color }}
                    onClick={() => setTag(t.id)}
                  >
                    {t.name}
                  </button>
                )
              })}
            </div>
          )}

          <div className="crm-chip-group">
            <button
              type="button"
              className={`crm-chip ${filters.hasProject ? 'is-active' : ''}`}
              onClick={() => onChange({ ...filters, hasProject: !filters.hasProject })}
            >
              Com projeto
            </button>
            <button
              type="button"
              className={`crm-chip ${filters.hasNote ? 'is-active' : ''}`}
              onClick={() => onChange({ ...filters, hasNote: !filters.hasNote })}
            >
              Com nota
            </button>
            <select
              className="crm-chip-select"
              value={filters.recentInteractionDays}
              onChange={(e) =>
                onChange({ ...filters, recentInteractionDays: Number(e.target.value) })
              }
            >
              <option value={0}>Qualquer interação</option>
              <option value={7}>Últimos 7 dias</option>
              <option value={14}>Últimos 14 dias</option>
              <option value={30}>Últimos 30 dias</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
