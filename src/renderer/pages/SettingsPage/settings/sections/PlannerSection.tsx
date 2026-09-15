import { useEffect, useState } from 'react'
import { usePlannerPreferences } from '@hooks/usePlannerPreferences'
import { Button, Input } from '@shared/components/primitives'

interface PlannerSectionProps {
  activeSection: string
  userLoggedIn?: boolean
}

export const PlannerSection = ({ activeSection, userLoggedIn }: PlannerSectionProps) => {
  const { prefs, loading, savePrefs } = usePlannerPreferences(userLoggedIn ?? false)

  const [startHour, setStartHour] = useState(String(prefs.plannerStartHour))
  const [endHour,   setEndHour]   = useState(String(prefs.plannerEndHour))
  const [faixaDirty, setFaixaDirty] = useState(false)
  const [saving,    setSaving]    = useState(false)

  useEffect(() => {
    setStartHour(String(prefs.plannerStartHour))
    setEndHour(String(prefs.plannerEndHour))
    setFaixaDirty(false)
  }, [prefs.plannerStartHour, prefs.plannerEndHour])

  if (activeSection !== 'planner') return null

  const handleStartChange = (val: string) => { setStartHour(val); setFaixaDirty(true) }
  const handleEndChange   = (val: string) => { setEndHour(val);   setFaixaDirty(true) }

  const handleSaveFaixa = async () => {
    const sh = Math.max(0, Math.min(22, Number(startHour)))
    const eh = Math.max(sh + 1, Math.min(23, Number(endHour)))
    setSaving(true)
    await savePrefs({ plannerStartHour: sh, plannerEndHour: eh })
    setFaixaDirty(false)
    setSaving(false)
  }

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <h3>Planner</h3>
        <p className="settings-hint">Configurações da grade horária do Planner.</p>
      </div>

      {loading ? (
        <p className="settings-hint">Carregando preferências…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Intervalo de slots */}
          <div>
            <div className="settings-field-label">Intervalo de slots</div>
            <div className="settings-hint" style={{ marginBottom: 10 }}>
              Define a granularidade da grade horária.
            </div>
            <div className="planner-interval-toggle">
              <button
                className={`planner-interval-btn${prefs.plannerInterval === 60 ? ' is-active' : ''}`}
                onClick={() => savePrefs({ plannerInterval: 60 })}
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
                  <circle cx="8" cy="8" r="6" />
                  <polyline points="8 4 8 8 10.5 10.5" />
                </svg>
                1 hora
              </button>
              <button
                className={`planner-interval-btn${prefs.plannerInterval === 30 ? ' is-active' : ''}`}
                onClick={() => savePrefs({ plannerInterval: 30 })}
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12">
                  <circle cx="8" cy="8" r="6" />
                  <polyline points="8 4 8 8 10.5 10.5" />
                </svg>
                30 min
              </button>
            </div>
          </div>

          {/* Faixa horária */}
          <div>
            <div className="settings-field-label">Faixa horária visível</div>
            <div className="settings-hint" style={{ marginBottom: 10 }}>
              Define o intervalo de horas exibido na grade (0–23h).
            </div>
            <div className="planner-range-row">
              <div className="planner-range-field">
                <label className="planner-range-label">Início</label>
                <div className="planner-range-input-wrap">
                  <Input
                    type="number"
                    min={0}
                    max={22}
                    value={startHour}
                    onChange={e => handleStartChange(e.target.value)}
                    style={{ width: 64, textAlign: 'center' }}
                  />
                  <span className="planner-range-unit">h</span>
                </div>
              </div>

              <span className="planner-range-sep">—</span>

              <div className="planner-range-field">
                <label className="planner-range-label">Fim</label>
                <div className="planner-range-input-wrap">
                  <Input
                    type="number"
                    min={1}
                    max={23}
                    value={endHour}
                    onChange={e => handleEndChange(e.target.value)}
                    style={{ width: 64, textAlign: 'center' }}
                  />
                  <span className="planner-range-unit">h</span>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={handleSaveFaixa}
                disabled={saving || !faixaDirty}
                style={{ alignSelf: 'flex-end' }}
              >
                {saving ? 'Salvando…' : 'Aplicar'}
              </Button>
            </div>

            {/* Preview da faixa */}
            <div className="planner-range-preview">
              <span className="planner-range-preview-label">Faixa atual:</span>
              <strong>
                {String(prefs.plannerStartHour).padStart(2, '0')}:00
                {' – '}
                {String(prefs.plannerEndHour).padStart(2, '0')}:00
              </strong>
              <span className="planner-range-preview-sub">
                ({prefs.plannerEndHour - prefs.plannerStartHour}h visíveis,
                {' '}slots de {prefs.plannerInterval} min)
              </span>
            </div>
          </div>

        </div>
      )}
    </section>
  )
}
