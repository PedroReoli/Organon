import React from 'react'
import { isElectron } from '@utils'

interface SettingsNavProps {
  activeSection:    string
  setActiveSection: (id: string) => void
  /** Quando true, mostra indicador vermelho no item "Nuvem e sync". */
  hasSyncError?:    boolean
}

const NAV_GROUPS: { label: string; items: { id: string; label: string; electronOnly?: boolean; devOnly?: boolean; icon: React.ReactNode }[] }[] = [
  {
    label: 'Geral',
    items: [
      { id: 'theme', label: 'Aparencia', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><circle cx="8" cy="8" r="5.5" /><path d="M8 2.5v11M2.5 8h11" /></svg> },
      { id: 'audio', label: 'Áudio e Dispositivos', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><path d="M8 2a2 2 0 0 0-2 2v4a2 2 0 0 0 4 0V4a2 2 0 0 0-2-2z" /><path d="M12 7v1a4 4 0 0 1-8 0V7" /><line x1="8" y1="12" x2="8" y2="14" /></svg> },
      { id: 'shortcuts', label: 'Atalhos de teclado', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><rect x="2" y="4" width="4" height="3" rx="1" /><rect x="7" y="4" width="2" height="3" rx="1" /><rect x="10" y="4" width="4" height="3" rx="1" /><rect x="2" y="9" width="12" height="3" rx="1" /></svg> },
      { id: 'account', label: 'Conta', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><circle cx="8" cy="5.5" r="2.5" /><path d="M2.5 13c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5" /></svg> },
    ],
  },
  {
    label: 'Modulos',
    items: [
      { id: 'planner', label: 'Planejamento', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" /><line x1="1.5" y1="6" x2="14.5" y2="6" /><line x1="5.5" y1="2.5" x2="5.5" y2="6" /><line x1="10.5" y1="2.5" x2="10.5" y2="6" /></svg> },
      { id: 'ides', label: 'IDEs e editores', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><polyline points="10.5 11.5 13.5 8 10.5 4.5" /><polyline points="5.5 4.5 2.5 8 5.5 11.5" /></svg> },
      { id: 'financial', label: 'Financeiro', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><path d="M8 1.5v13M5 4.5h4.5a2 2 0 0 1 0 4H5.5M5 8.5h5a2 2 0 0 1 0 4H5" /></svg> },
      { id: 'notes', label: 'Notas', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><path d="M3 2.5h10a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" /><line x1="5" y1="5.5" x2="11" y2="5.5" /><line x1="5" y1="8" x2="11" y2="8" /><line x1="5" y1="10.5" x2="9" y2="10.5" /></svg> },
      { id: 'study', label: 'Estudos', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><circle cx="8" cy="8" r="5.5" /><polyline points="8 4.5 8 8 10.5 10" /></svg> },
      { id: 'crm', label: 'CRM', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><circle cx="6" cy="5" r="2" /><circle cx="11" cy="6" r="1.5" /><path d="M1.5 12c0-2.5 2-3.5 4.5-3.5s4.5 1 4.5 3.5" /><path d="M10 9c1.5 0 3 .7 3 2.5" /></svg> },
    ],
  },
  {
    label: 'Dados e sincronizacao',
    items: [
      { id: 'data', label: 'Armazenamento', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><ellipse cx="8" cy="5" rx="5.5" ry="2.5" /><path d="M2.5 5v6c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V5" /><path d="M2.5 8c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5" /></svg> },
      { id: 'cloud', label: 'Nuvem e sync', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><path d="M13 10a5 5 0 1 0-9.9-1H2.5A2.5 2.5 0 0 0 5 13.5h8a2 2 0 0 0 0-4H13z" /></svg> },
      { id: 'backup', label: 'Backup e restaurar', electronOnly: true, icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><path d="M13 10a5 5 0 1 0-9.9-1H2.5A2.5 2.5 0 0 0 5 13.5h8a2 2 0 0 0 0-4H13z" /><polyline points="8 6 8 10 10 9" /></svg> },
    ],
  },
  {
    label: 'Dev',
    items: [
      { id: 'debug', label: 'Debug', devOnly: true, icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14"><path d="M6 2.5h4M8 2.5v2" /><rect x="4" y="4.5" width="8" height="7.5" rx="2" /><path d="M3 7h10M2 10h2M12 10h2" /></svg> },
    ],
  },
]

export const SettingsNav = ({ activeSection, setActiveSection, hasSyncError }: SettingsNavProps) => (
  <aside className="projects-sidebar">
    <div className="projects-sidebar-header">
      <h2>Configurações</h2>
    </div>
    <div className="projects-sidebar-scroll">
      {NAV_GROUPS.map((group) => (
        <React.Fragment key={group.label}>
          <div style={{ padding: '16px 16px 8px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>{group.label}</div>
          {group.items
            .filter((item) => !item.electronOnly || isElectron())
            .filter((item) => !item.devOnly || import.meta.env.DEV)
            .map((item) => {
              const showErrorDot = hasSyncError && item.id === 'cloud'
              return (
                <button
                  key={item.id}
                  className={`projects-sidebar-item ${activeSection === item.id ? 'is-active' : ''}`}
                  onClick={() => setActiveSection(item.id)}
                >
                  <span style={{ marginRight: '8px', display: 'flex' }}>{item.icon}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                  {showErrorDot && (
                    <span
                      style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}
                      title="Falha na ultima sincronizacao"
                    />
                  )}
                </button>
              )
            })}
        </React.Fragment>
      ))}
    </div>
  </aside>
)
