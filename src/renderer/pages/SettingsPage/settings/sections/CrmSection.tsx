import { useState } from 'react'

interface CrmSectionProps {
  activeSection: string
  stages: string[]
  priorities: string[]
  onSave: (data: { stages: string[]; priorities: string[] }) => void
}

export const CrmSection = ({
  activeSection, stages, priorities, onSave,
}: CrmSectionProps) => {
  const [localStages, setLocalStages]       = useState<string[]>(stages)
  const [localPriorities, setLocalPriorities] = useState<string[]>(priorities)
  const [newStage, setNewStage]             = useState('')
  const [newPriority, setNewPriority]       = useState('')
  const [saved, setSaved]                   = useState(false)
  const [confirmRemove, setConfirmRemove]   = useState<{ type: 'stage' | 'priority'; value: string } | null>(null)

  if (activeSection !== 'crm') return null

  const handleSave = () => {
    onSave({ stages: localStages, priorities: localPriorities })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addStage = () => {
    const val = newStage.trim()
    if (!val || localStages.includes(val)) return
    setLocalStages([...localStages, val])
    setNewStage('')
  }

  const confirmAndRemove = () => {
    if (!confirmRemove) return
    if (confirmRemove.type === 'stage') {
      setLocalStages(localStages.filter(x => x !== confirmRemove.value))
    } else {
      setLocalPriorities(localPriorities.filter(x => x !== confirmRemove.value))
    }
    setConfirmRemove(null)
  }

  const moveStage = (idx: number, dir: -1 | 1) => {
    const arr = [...localStages]
    const target = idx + dir
    if (target < 0 || target >= arr.length) return
    ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
    setLocalStages(arr)
  }

  const addPriority = () => {
    const val = newPriority.trim()
    if (!val || localPriorities.includes(val)) return
    setLocalPriorities([...localPriorities, val])
    setNewPriority('')
  }

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <h3>CRM</h3>
        <p className="settings-hint">Stages do pipeline e prioridades.</p>
      </div>

      <div className="settings-module-cols">
        {/* Stages */}
        <div className="settings-module-col">
          <div className="settings-field-label">Stages do pipeline</div>
          <span className="settings-field-help">Use as setas para reordenar.</span>

          <div className="settings-list">
            {localStages.map((s, i) => (
              <div key={s} className="settings-list-item">
                <button
                  className="settings-icon-btn"
                  onClick={() => moveStage(i, -1)}
                  disabled={i === 0}
                  title="Mover para cima"
                >&#9650;</button>
                <button
                  className="settings-icon-btn"
                  onClick={() => moveStage(i, 1)}
                  disabled={i === localStages.length - 1}
                  title="Mover para baixo"
                >&#9660;</button>
                <span className="settings-list-item-label">{s}</span>
                <button
                  className="settings-icon-btn settings-icon-btn--danger"
                  onClick={() => setConfirmRemove({ type: 'stage', value: s })}
                  title="Remover"
                >&#10005;</button>
              </div>
            ))}
          </div>

          <div className="settings-inline-add">
            <input
              className="settings-input"
              value={newStage}
              onChange={e => setNewStage(e.target.value)}
              placeholder="Novo stage..."
              onKeyDown={e => e.key === 'Enter' && addStage()}
            />
            <button className="settings-btn-primary" onClick={addStage}>Adicionar</button>
          </div>
        </div>

        {/* Prioridades */}
        <div className="settings-module-col">
          <div className="settings-field-label">Prioridades</div>

          <div className="settings-tags">
            {localPriorities.map(p => (
              <span key={p} className="settings-tag">
                {p}
                <button
                  className="settings-tag-remove"
                  onClick={() => setConfirmRemove({ type: 'priority', value: p })}
                >&#10005;</button>
              </span>
            ))}
          </div>

          <div className="settings-inline-add">
            <input
              className="settings-input"
              value={newPriority}
              onChange={e => setNewPriority(e.target.value)}
              placeholder="Nova prioridade..."
              onKeyDown={e => e.key === 'Enter' && addPriority()}
            />
            <button className="settings-btn-primary" onClick={addPriority}>Adicionar</button>
          </div>
        </div>
      </div>

      <div className="settings-section-actions">
        <button className="settings-btn-primary" onClick={handleSave}>
          {saved ? 'Salvo' : 'Salvar'}
        </button>
      </div>

      {/* Modal de confirmacao de remocao */}
      {confirmRemove && (
        <div className="settings-confirm-overlay" onClick={() => setConfirmRemove(null)}>
          <div className="settings-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="settings-confirm-title">Confirmar remocao</div>
            <p className="settings-confirm-text">
              Remover {confirmRemove.type === 'stage' ? 'o stage' : 'a prioridade'}{' '}
              <strong>{confirmRemove.value}</strong>?
            </p>
            <div className="settings-confirm-actions">
              <button
                className="settings-btn-secondary"
                onClick={() => setConfirmRemove(null)}
              >
                Cancelar
              </button>
              <button
                className="settings-btn-danger"
                onClick={confirmAndRemove}
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
