// Toolbar do planner: toggle de intervalo e modal de configurações de faixa horária
import { useState } from 'react'
import type { PlannerPreferences } from '@types'
import { Button } from '@shared/components/primitives'

interface PlannerToolbarProps {
  prefs: PlannerPreferences
  onSave: (updates: Partial<PlannerPreferences>) => void
}

export function PlannerToolbar({ prefs, onSave }: PlannerToolbarProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [startHour, setStartHour] = useState(String(prefs.plannerStartHour))
  const [endHour, setEndHour]     = useState(String(prefs.plannerEndHour))

  function handleOpenSettings() {
    setStartHour(String(prefs.plannerStartHour))
    setEndHour(String(prefs.plannerEndHour))
    setShowSettings(true)
  }

  function handleSaveSettings() {
    const sh = Math.max(0, Math.min(22, Number(startHour)))
    const eh = Math.max(sh + 1, Math.min(23, Number(endHour)))
    onSave({ plannerStartHour: sh, plannerEndHour: eh })
    setShowSettings(false)
  }

  return (
    <>
      <div className="planner-toolbar">
        {/* Toggle de intervalo */}
        <div className="planner-toolbar-intervals">
          <button
            className={`planner-toolbar-btn ${prefs.plannerInterval === 60 ? 'is-active' : ''}`}
            onClick={() => onSave({ plannerInterval: 60 })}
            title="Intervalos de 1 hora"
          >
            1h
          </button>
          <button
            className={`planner-toolbar-btn ${prefs.plannerInterval === 30 ? 'is-active' : ''}`}
            onClick={() => onSave({ plannerInterval: 30 })}
            title="Intervalos de 30 minutos"
          >
            30min
          </button>
        </div>

        {/* Faixa horária atual */}
        <span className="planner-toolbar-range">
          {String(prefs.plannerStartHour).padStart(2, '0')}:00 – {String(prefs.plannerEndHour).padStart(2, '0')}:00
        </span>

        {/* Botão de configuração */}
        <button
          className="planner-toolbar-settings"
          onClick={handleOpenSettings}
          title="Configurar faixa horária"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Modal de configuração de faixa horária */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Faixa horária</h3>
              <button className="modal-close" onClick={() => setShowSettings(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">Início</label>
                <input
                  type="number"
                  min={0}
                  max={22}
                  value={startHour}
                  onChange={e => setStartHour(e.target.value)}
                  className="form-input"
                  style={{ width: 70 }}
                />
                <span className="form-label">h</span>
              </div>
              <div className="form-row">
                <label className="form-label">Fim</label>
                <input
                  type="number"
                  min={1}
                  max={23}
                  value={endHour}
                  onChange={e => setEndHour(e.target.value)}
                  className="form-input"
                  style={{ width: 70 }}
                />
                <span className="form-label">h</span>
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowSettings(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleSaveSettings}>Salvar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
