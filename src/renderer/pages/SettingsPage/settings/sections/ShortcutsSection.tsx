
import type { KeyboardShortcut } from '@types'
import { KeyboardShortcutCapture } from '../KeyboardShortcutCapture'
import { formatShortcut } from '@Settings/settings/utils'
import { IconButton } from '@shared/components/primitives'
import { Kbd } from '@shared/components/display'

interface ShortcutsSectionProps {
  activeSection:       string
  shortcuts:           KeyboardShortcut[]
  editingShortcutId:   string | null
  setEditingShortcutId:(id: string | null) => void
  handleSaveShortcut:  (id: string, keys: KeyboardShortcut['keys']) => void
  handleResetShortcut: (id: string) => void
}

export const ShortcutsSection = ({
  activeSection, shortcuts, editingShortcutId, setEditingShortcutId,
  handleSaveShortcut, handleResetShortcut,
}: ShortcutsSectionProps) => (
  <section className={`settings-section ${activeSection !== 'shortcuts' ? 'settings-section-hidden' : ''}`}>
    <div className="settings-section-header">
      <h3>Atalhos de Teclado</h3>
    </div>

    {editingShortcutId && (
      <div className="keyboard-shortcut-capture-overlay">
        <KeyboardShortcutCapture
          shortcut={shortcuts.find(s => s.id === editingShortcutId)!}
          onSave={keys => handleSaveShortcut(editingShortcutId, keys)}
          onCancel={() => setEditingShortcutId(null)}
        />
      </div>
    )}

    <div className="settings-shortcuts">
      {shortcuts.map(shortcut => {
        const keyParts = formatShortcut(shortcut.keys)
        return (
          <div key={shortcut.id} className="settings-shortcut-item">
            <div className="settings-shortcut-keys">
              {keyParts.map((part, idx) => (
                <span key={idx}>
                  <Kbd>{part}</Kbd>
                  {idx < keyParts.length - 1 && <span>+</span>}
                </span>
              ))}
            </div>
            <div className="settings-shortcut-description">
              <span className="settings-shortcut-action">{shortcut.action}</span>
              <span className="settings-shortcut-hint">{shortcut.description}</span>
            </div>
            <div className="settings-shortcut-actions">
              <IconButton
                variant="default"
                size="sm"
                onClick={() => setEditingShortcutId(shortcut.id)}
                aria-label="Editar atalho"
                title="Editar atalho"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </IconButton>
              <IconButton
                variant="default"
                size="sm"
                onClick={() => handleResetShortcut(shortcut.id)}
                aria-label="Restaurar padrao"
                title="Restaurar padrao"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </IconButton>
            </div>
          </div>
        )
      })}
    </div>
  </section>
)
