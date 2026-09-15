import type { Settings } from '@types'
import { Switch } from '@shared/components/primitives'

interface DebugSectionProps {
  activeSection: string
  settings: Settings
  onUpdateSettings: (updates: Partial<Settings>) => void
}

export const DebugSection = ({ activeSection, settings, onUpdateSettings }: DebugSectionProps) => {
  if (activeSection !== 'debug') return null

  const isDev = import.meta.env.DEV

  const titlebar = settings.debugHudTitlebar ?? false
  const inline = settings.debugHudInline ?? false
  const hover = settings.debugHudHover ?? true

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <h3>Debug</h3>
        <p className="settings-hint">
          Ferramentas visuais para identificar tela e componente sob o mouse.
          {!isDev && ' (apenas DEV)'}
        </p>
      </div>

      <div className="settings-row">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="settings-field-label">HUD no titlebar</div>
          <div className="settings-field-help">Mostra tela e hover no topo da janela.</div>
        </div>
        <Switch
          checked={titlebar}
          onCheckedChange={(checked) => onUpdateSettings({ debugHudTitlebar: checked })}
          disabled={!isDev}
        />
      </div>

      <div className="settings-row">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="settings-field-label">HUD na tela</div>
          <div className="settings-field-help">Mostra uma barra fina dentro do app.</div>
        </div>
        <Switch
          checked={inline}
          onCheckedChange={(checked) => onUpdateSettings({ debugHudInline: checked })}
          disabled={!isDev}
        />
      </div>

      <div className="settings-row">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="settings-field-label">Detalhes de hover</div>
          <div className="settings-field-help">Inclui o elemento atual sob o mouse no HUD.</div>
        </div>
        <Switch
          checked={hover}
          onCheckedChange={(checked) => onUpdateSettings({ debugHudHover: checked })}
          disabled={!isDev}
        />
      </div>

      <div className="settings-field">
        <div className="settings-field-label">Atalhos</div>
        <div className="settings-hint">
          <div>- Ctrl+K: focar busca (CRM)</div>
          <div>- Ctrl+F: alternar filtros (CRM)</div>
        </div>
      </div>
    </section>
  )
}
