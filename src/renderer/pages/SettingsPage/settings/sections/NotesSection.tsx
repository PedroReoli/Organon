import { useState } from 'react'

interface NotesSectionProps {
  activeSection: string
  trashRetentionDays: number
  dailyNotesEnabled: boolean
  dailyNotesFolder: string
  dailyNotesTitleFormat: string
  onSave: (data: {
    trashRetentionDays: number
    dailyNotesEnabled: boolean
    dailyNotesFolder: string
    dailyNotesTitleFormat: string
  }) => void
}

export const NotesSection = ({
  activeSection,
  trashRetentionDays,
  dailyNotesEnabled,
  dailyNotesFolder,
  dailyNotesTitleFormat,
  onSave,
}: NotesSectionProps) => {
  const [retention, setRetention] = useState(String(trashRetentionDays))
  const [dailyEnabled, setDailyEnabled] = useState(dailyNotesEnabled)
  const [folder, setFolder] = useState(dailyNotesFolder)
  const [titleFmt, setTitleFmt] = useState(dailyNotesTitleFormat)
  const [saved, setSaved] = useState(false)

  if (activeSection !== 'notes') return null

  const handleSave = () => {
    onSave({
      trashRetentionDays: Math.max(0, parseInt(retention) || 30),
      dailyNotesEnabled: dailyEnabled,
      dailyNotesFolder: folder,
      dailyNotesTitleFormat: titleFmt,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <h3>Notas</h3>
        <p className="settings-hint">Lixeira, daily notes e busca.</p>
      </div>

      <div className="settings-grid">
        <div className="settings-field">
          <label className="settings-field-label">Retencao da lixeira (dias)</label>
          <span className="settings-field-help">
            Itens na lixeira sao removidos permanentemente apos este periodo. 0 = nunca.
          </span>
          <input
            className="settings-input"
            type="number"
            min={0}
            value={retention}
            onChange={e => setRetention(e.target.value)}
          />
        </div>

        <div className="settings-field">
          <label className="settings-field-label">Daily notes</label>
          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              checked={dailyEnabled}
              onChange={e => setDailyEnabled(e.target.checked)}
            />
            Criar nota diaria automaticamente
          </label>
        </div>

        {dailyEnabled && (
          <>
            <div className="settings-field">
              <label className="settings-field-label">Pasta destino</label>
              <input
                className="settings-input"
                type="text"
                value={folder}
                onChange={e => setFolder(e.target.value)}
                placeholder="Daily"
              />
            </div>

            <div className="settings-field">
              <label className="settings-field-label">Formato do titulo</label>
              <span className="settings-field-help">
                Variaveis: {'{{date}}'}, {'{{day}}'}, {'{{month}}'}, {'{{year}}'}
              </span>
              <input
                className="settings-input"
                type="text"
                value={titleFmt}
                onChange={e => setTitleFmt(e.target.value)}
                placeholder="{{date}}"
              />
            </div>
          </>
        )}
      </div>

      <div className="settings-section-actions">
        <button className="settings-btn-primary" onClick={handleSave}>
          {saved ? 'Salvo' : 'Salvar'}
        </button>
      </div>
    </section>
  )
}
