/**
 * SessionPresets — painel de presets de pomodoro (builtin + custom).
 *
 * Usuario pode:
 * - Ver todos os presets
 * - Ativar um preset (seta como default)
 * - Criar preset custom
 * - Remover preset custom
 *
 * Upgrade 14.
 */

import React, { useState } from 'react'
import type { StudySessionPreset, StudyState } from '@types'
import { Button, Input } from '@shared/components/primitives'

interface SessionPresetsProps {
  study: StudyState
  onUpdateStudy: (updater: (prev: StudyState) => StudyState) => void
}

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export const SessionPresets: React.FC<SessionPresetsProps> = ({
  study,
  onUpdateStudy,
}) => {
  const [isCreating, setIsCreating] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftFocus, setDraftFocus] = useState(25)
  const [draftBreak, setDraftBreak] = useState(5)

  const presets = study.presets ?? []
  const activeId = study.activePresetId ?? null

  const handleActivate = (preset: StudySessionPreset) => {
    onUpdateStudy((prev) => ({
      ...prev,
      activePresetId: preset.id,
      focusMinutes: preset.focusMinutes,
      breakMinutes: preset.breakMinutes,
    }))
  }

  const handleCreate = () => {
    const name = draftName.trim()
    if (!name) return
    const newPreset: StudySessionPreset = {
      id: generateId(),
      name,
      focusMinutes: Math.max(1, draftFocus),
      breakMinutes: Math.max(0, draftBreak),
      cyclesBeforeLongBreak: 0,
      longBreakMinutes: 0,
      isBuiltin: false,
      createdAt: new Date().toISOString(),
    }
    onUpdateStudy((prev) => ({
      ...prev,
      presets: [...(prev.presets ?? []), newPreset],
    }))
    setDraftName('')
    setDraftFocus(25)
    setDraftBreak(5)
    setIsCreating(false)
  }

  const handleRemove = (presetId: string) => {
    onUpdateStudy((prev) => ({
      ...prev,
      presets: (prev.presets ?? []).filter((p) => p.id !== presetId),
      activePresetId: prev.activePresetId === presetId ? null : prev.activePresetId,
    }))
  }

  return (
    <div className="study-presets-panel">
      <header className="study-presets-header">
        <h3>Presets de pomodoro</h3>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setIsCreating(!isCreating)}
        >
          {isCreating ? 'Cancelar' : '+ Novo'}
        </Button>
      </header>

      {isCreating && (
        <div className="study-presets-form">
          <Input
            type="text"
            placeholder="Nome (ex: Concentracao profunda)"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            autoFocus
            fullWidth
          />
          <div className="study-presets-form-row">
            <label>
              <span>Foco (min)</span>
              <Input
                type="number"
                min={1}
                value={draftFocus}
                onChange={(e) => setDraftFocus(Number(e.target.value))}
              />
            </label>
            <label>
              <span>Pausa (min)</span>
              <Input
                type="number"
                min={0}
                value={draftBreak}
                onChange={(e) => setDraftBreak(Number(e.target.value))}
              />
            </label>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleCreate}
            disabled={!draftName.trim()}
          >
            Criar preset
          </Button>
        </div>
      )}

      <div className="study-presets-list">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className={`study-preset-card ${activeId === preset.id ? 'is-active' : ''}`}
          >
            <div className="study-preset-card-main">
              <strong>{preset.name}</strong>
              <span>
                {preset.focusMinutes} / {preset.breakMinutes}min
              </span>
              {preset.cyclesBeforeLongBreak > 0 && (
                <span className="study-preset-card-meta">
                  Long break a cada {preset.cyclesBeforeLongBreak} ciclos
                </span>
              )}
            </div>
            <div className="study-preset-card-actions">
              <Button
                type="button"
                variant={activeId === preset.id ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleActivate(preset)}
              >
                {activeId === preset.id ? 'Ativo' : 'Ativar'}
              </Button>
              {!preset.isBuiltin && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemove(preset.id)}
                >
                  Excluir
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
