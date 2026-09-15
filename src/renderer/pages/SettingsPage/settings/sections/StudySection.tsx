import { useState } from 'react'
import { BUILTIN_STUDY_PRESETS } from '@types'

interface StudySectionProps {
  activeSection: string
  defaultPresetName: string
  muteSound: boolean
  onSave: (data: { defaultPresetName: string; muteSound: boolean }) => void
}

export const StudySection = ({
  activeSection, defaultPresetName, muteSound, onSave,
}: StudySectionProps) => {
  const [preset, setPreset] = useState(defaultPresetName || BUILTIN_STUDY_PRESETS[0].name)
  const [mute, setMute]     = useState(muteSound)
  const [saved, setSaved]   = useState(false)

  if (activeSection !== 'study') return null

  const handleSave = () => {
    onSave({ defaultPresetName: preset, muteSound: mute })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const selectedPreset = BUILTIN_STUDY_PRESETS.find(p => p.name === preset)

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <h3>Estudos</h3>
        <p className="settings-hint">Pomodoro: preset padrao e notificacoes.</p>
      </div>

      <div className="settings-grid">
        <div className="settings-field">
          <label className="settings-field-label">Preset padrao</label>
          <span className="settings-field-help">
            Selecione o preset usado ao iniciar uma sessao de estudo.
          </span>
          <select
            className="settings-input"
            value={preset}
            onChange={e => setPreset(e.target.value)}
          >
            {BUILTIN_STUDY_PRESETS.map(p => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
          {selectedPreset && (
            <span className="settings-field-help">
              Foco: {selectedPreset.focusMinutes}min — Pausa: {selectedPreset.breakMinutes}min —
              Ciclos: {selectedPreset.cyclesBeforeLongBreak} — Pausa longa: {selectedPreset.longBreakMinutes}min
            </span>
          )}
        </div>

        <div className="settings-field">
          <label className="settings-field-label">Som</label>
          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              checked={mute}
              onChange={e => setMute(e.target.checked)}
            />
            Silenciar notificacoes sonoras
          </label>
        </div>
      </div>

      <div className="settings-section-actions">
        <button className="settings-btn-primary" onClick={handleSave}>
          {saved ? 'Salvo' : 'Salvar'}
        </button>
      </div>
    </section>
  )
}
