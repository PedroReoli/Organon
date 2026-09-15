/**
 * SprintBoardConfigModal — modal de configuracao do Sprint Board.
 *
 * 3 toggles opt-in: lanes / grupos verticais / subsecoes.
 * + CRUD completo de colunas, grupos, lanes (CRUD condicional baseado nos toggles).
 *
 * Upgrade 01.
 */

import React, { useState } from 'react'
import type {
  SprintColumn,
  SprintColumnGroup,
  SprintColumnSection,
  SprintSwimLane,
  SprintBoardConfig,
} from '@types'
import { Button, Input } from '@shared/components/primitives'

interface SprintBoardConfigModalProps {
  config: SprintBoardConfig
  columns: SprintColumn[]
  groups: SprintColumnGroup[]
  sections: SprintColumnSection[]
  lanes: SprintSwimLane[]
  onClose: () => void
  onUpdateConfig: (updates: Partial<SprintBoardConfig>) => void
  onAddColumn: (name: string, color?: string) => void
  onUpdateColumn: (columnId: string, updates: Partial<Pick<SprintColumn, 'name' | 'color' | 'groupId'>>) => void
  onRemoveColumn: (columnId: string) => void
  onAddGroup: (name: string, color?: string) => void
  onUpdateGroup: (groupId: string, updates: Partial<Pick<SprintColumnGroup, 'name' | 'color'>>) => void
  onRemoveGroup: (groupId: string) => void
  onAddSection: (columnId: string, name: string) => void
  onRemoveSection: (sectionId: string) => void
  onAddLane: (name: string, color?: string) => void
  onUpdateLane: (laneId: string, updates: Partial<Pick<SprintSwimLane, 'name' | 'color'>>) => void
  onRemoveLane: (laneId: string) => void
}

const PRESET_COLORS = ['var(--color-primary)', 'var(--color-primary)', '#f59e0b', '#10b981', 'var(--color-primary)', 'var(--color-primary)', '#ef4444', 'var(--color-primary)', '#64748b']

type Tab = 'features' | 'columns' | 'groups' | 'lanes' | 'sections'

export const SprintBoardConfigModal: React.FC<SprintBoardConfigModalProps> = ({
  config,
  columns,
  groups,
  sections,
  lanes,
  onClose,
  onUpdateConfig,
  onAddColumn,
  onUpdateColumn,
  onRemoveColumn,
  onAddGroup,
  onUpdateGroup,
  onRemoveGroup,
  onAddSection,
  onRemoveSection,
  onAddLane,
  onUpdateLane,
  onRemoveLane,
}) => {
  const [tab, setTab] = useState<Tab>('features')
  const [newColName, setNewColName] = useState('')
  const [newColColor, setNewColColor] = useState(PRESET_COLORS[0])
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState(PRESET_COLORS[1])
  const [newLaneName, setNewLaneName] = useState('')
  const [newLaneColor, setNewLaneColor] = useState(PRESET_COLORS[2])
  const [newSectionName, setNewSectionName] = useState('')
  const [newSectionColumnId, setNewSectionColumnId] = useState('')

  const handleAddColumn = () => {
    if (!newColName.trim()) return
    onAddColumn(newColName.trim(), newColColor)
    setNewColName('')
  }

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return
    onAddGroup(newGroupName.trim(), newGroupColor)
    setNewGroupName('')
  }

  const handleAddLane = () => {
    if (!newLaneName.trim()) return
    onAddLane(newLaneName.trim(), newLaneColor)
    setNewLaneName('')
  }

  const handleAddSection = () => {
    if (!newSectionName.trim() || !newSectionColumnId) return
    onAddSection(newSectionColumnId, newSectionName.trim())
    setNewSectionName('')
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal sprint-config-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Configurar Sprint Board</h2>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </header>

        <div className="sprint-config-tabs">
          {(['features', 'columns', 'groups', 'sections', 'lanes'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`sprint-config-tab ${tab === t ? 'is-active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'features' && 'Features'}
              {t === 'columns' && `Colunas (${columns.length})`}
              {t === 'groups' && `Grupos (${groups.length})`}
              {t === 'sections' && `Subsecoes (${sections.length})`}
              {t === 'lanes' && `Lanes (${lanes.length})`}
            </button>
          ))}
        </div>

        <div className="modal-body sprint-config-body">
          {tab === 'features' && (
            <div className="sprint-config-features">
              <p className="sprint-config-help">
                Ative as features que voce quer usar no seu Sprint Board. Voce pode
                ligar/desligar a qualquer momento sem perder dados.
              </p>
              <label className="sprint-config-toggle">
                <input
                  type="checkbox"
                  checked={config.lanesEnabled}
                  onChange={(e) => onUpdateConfig({ lanesEnabled: e.target.checked })}
                />
                <div>
                  <strong>Swim lanes horizontais</strong>
                  <span>Linhas que cortam todas as colunas. Cards classificados manualmente.</span>
                </div>
              </label>
              <label className="sprint-config-toggle">
                <input
                  type="checkbox"
                  checked={config.groupsEnabled}
                  onChange={(e) => onUpdateConfig({ groupsEnabled: e.target.checked })}
                />
                <div>
                  <strong>Grupos verticais de colunas</strong>
                  <span>Agrupamentos coloridos sobre colunas afins (ex: To-do, Em curso, Final).</span>
                </div>
              </label>
              <label className="sprint-config-toggle">
                <input
                  type="checkbox"
                  checked={config.sectionsEnabled}
                  onChange={(e) => onUpdateConfig({ sectionsEnabled: e.target.checked })}
                />
                <div>
                  <strong>Subsecoes dentro de colunas</strong>
                  <span>Sub-headers internos dentro de cada coluna (ex: Top priority / Nice to have).</span>
                </div>
              </label>
            </div>
          )}

          {tab === 'columns' && (
            <div className="sprint-config-list">
              <div className="sprint-config-add-row">
                <Input
                  type="text"
                  placeholder="Nome da coluna"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  fullWidth
                />
                <div className="sprint-config-color-picker">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`sprint-config-color ${newColColor === c ? 'is-active' : ''}`}
                      style={{ background: c }}
                      onClick={() => setNewColColor(c)}
                    />
                  ))}
                </div>
                <Button size="sm" variant="primary" onClick={handleAddColumn}>+ Coluna</Button>
              </div>
              <ul>
                {columns.map((col) => (
                  <li key={col.id} className="sprint-config-row">
                    <span className="sprint-config-dot" style={{ background: col.color }} />
                    <input
                      type="text"
                      className="form-input"
                      value={col.name}
                      onChange={(e) => onUpdateColumn(col.id, { name: e.target.value })}
                    />
                    {config.groupsEnabled && groups.length > 0 && (
                      <select
                        className="form-input"
                        value={col.groupId ?? ''}
                        onChange={(e) =>
                          onUpdateColumn(col.id, { groupId: e.target.value || null })
                        }
                      >
                        <option value="">(sem grupo)</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      className="sprint-config-remove"
                      onClick={() => onRemoveColumn(col.id)}
                      title="Excluir coluna"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'groups' && (
            <div className="sprint-config-list">
              {!config.groupsEnabled && (
                <p className="sprint-config-warning">Ative grupos verticais na aba Features para usar.</p>
              )}
              <div className="sprint-config-add-row">
                <Input
                  type="text"
                  placeholder="Nome do grupo"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  fullWidth
                />
                <div className="sprint-config-color-picker">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`sprint-config-color ${newGroupColor === c ? 'is-active' : ''}`}
                      style={{ background: c }}
                      onClick={() => setNewGroupColor(c)}
                    />
                  ))}
                </div>
                <Button size="sm" variant="primary" onClick={handleAddGroup}>+ Grupo</Button>
              </div>
              <ul>
                {groups.map((g) => (
                  <li key={g.id} className="sprint-config-row">
                    <span className="sprint-config-dot" style={{ background: g.color }} />
                    <input
                      type="text"
                      className="form-input"
                      value={g.name}
                      onChange={(e) => onUpdateGroup(g.id, { name: e.target.value })}
                    />
                    <button
                      type="button"
                      className="sprint-config-remove"
                      onClick={() => onRemoveGroup(g.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'sections' && (
            <div className="sprint-config-list">
              {!config.sectionsEnabled && (
                <p className="sprint-config-warning">Ative subsecoes na aba Features para usar.</p>
              )}
              <div className="sprint-config-add-row">
                <select
                  className="form-input"
                  value={newSectionColumnId}
                  onChange={(e) => setNewSectionColumnId(e.target.value)}
                >
                  <option value="">Selecione coluna</option>
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <Input
                  type="text"
                  placeholder="Nome da subsecao"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  fullWidth
                />
                <Button size="sm" variant="primary" onClick={handleAddSection}>+ Subsecao</Button>
              </div>
              <ul>
                {sections.map((s) => {
                  const col = columns.find((c) => c.id === s.columnId)
                  return (
                    <li key={s.id} className="sprint-config-row">
                      <span className="sprint-config-dot" style={{ background: col?.color ?? '#888' }} />
                      <span className="sprint-config-section-col">{col?.name ?? '?'}</span>
                      <span className="sprint-config-section-name">{s.name}</span>
                      <button
                        type="button"
                        className="sprint-config-remove"
                        onClick={() => onRemoveSection(s.id)}
                      >
                        ×
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {tab === 'lanes' && (
            <div className="sprint-config-list">
              {!config.lanesEnabled && (
                <p className="sprint-config-warning">Ative swim lanes na aba Features para usar.</p>
              )}
              <div className="sprint-config-add-row">
                <Input
                  type="text"
                  placeholder="Nome da lane"
                  value={newLaneName}
                  onChange={(e) => setNewLaneName(e.target.value)}
                  fullWidth
                />
                <div className="sprint-config-color-picker">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`sprint-config-color ${newLaneColor === c ? 'is-active' : ''}`}
                      style={{ background: c }}
                      onClick={() => setNewLaneColor(c)}
                    />
                  ))}
                </div>
                <Button size="sm" variant="primary" onClick={handleAddLane}>+ Lane</Button>
              </div>
              <ul>
                {lanes.map((lane) => (
                  <li key={lane.id} className="sprint-config-row">
                    <span className="sprint-config-dot" style={{ background: lane.color }} />
                    <input
                      type="text"
                      className="form-input"
                      value={lane.name}
                      onChange={(e) => onUpdateLane(lane.id, { name: e.target.value })}
                    />
                    <button
                      type="button"
                      className="sprint-config-remove"
                      onClick={() => onRemoveLane(lane.id)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <footer className="modal-footer">
          <Button variant="primary" onClick={onClose}>Fechar</Button>
        </footer>
      </div>
    </div>
  )
}
