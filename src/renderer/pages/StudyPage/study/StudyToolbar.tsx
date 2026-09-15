
import type { StudyPanel } from '@Study/study/types'

interface StudyToolbarProps {
  activePanel: StudyPanel
  setActivePanel: (updater: (prev: StudyPanel) => StudyPanel) => void
}

export const StudyToolbar = ({ activePanel, setActivePanel }: StudyToolbarProps) => (
  <aside className="study-right-toolbar">
    <button
      type="button"
      className={`study-toolbar-btn ${activePanel === 'wallpaper' ? 'is-active' : ''}`}
      onClick={() => setActivePanel(prev => prev === 'wallpaper' ? null : 'wallpaper')}
      title="Fundo"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
    </button>
    <button
      type="button"
      className={`study-toolbar-btn ${activePanel === 'audio' ? 'is-active' : ''}`}
      onClick={() => setActivePanel(prev => prev === 'audio' ? null : 'audio')}
      title="Audio"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    </button>
    <button
      type="button"
      className={`study-toolbar-btn ${activePanel === 'quote' ? 'is-active' : ''}`}
      onClick={() => setActivePanel(prev => prev === 'quote' ? null : 'quote')}
      title="Quote"
    >
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.17 6A4.17 4.17 0 0 0 3 10.17V18a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-5a3 3 0 0 0-3-3H7V9a2.17 2.17 0 0 1 2.17-2.17H10V4H7.17Zm10 0A4.17 4.17 0 0 0 13 10.17V18a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3v-5a3 3 0 0 0-3-3h-3V9a2.17 2.17 0 0 1 2.17-2.17H20V4h-2.83Z" />
      </svg>
    </button>
    <button
      type="button"
      className={`study-toolbar-btn ${activePanel === 'stats' ? 'is-active' : ''}`}
      onClick={() => setActivePanel(prev => prev === 'stats' ? null : 'stats')}
      title="Estatisticas"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" />
        <rect x="7" y="12" width="3" height="6" />
        <rect x="12" y="8" width="3" height="10" />
        <rect x="17" y="5" width="3" height="13" />
      </svg>
    </button>
    <button
      type="button"
      className={`study-toolbar-btn ${activePanel === 'goals' ? 'is-active' : ''}`}
      onClick={() => setActivePanel(prev => prev === 'goals' ? null : 'goals')}
      title="Metas"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </button>
    <button
      type="button"
      className={`study-toolbar-btn ${activePanel === 'analytics' ? 'is-active' : ''}`}
      onClick={() => setActivePanel(prev => prev === 'analytics' ? null : 'analytics')}
      title="Analytics"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 21H4.6A1.6 1.6 0 0 1 3 19.4V3" />
        <polyline points="21 7 17 11 13 7 8 12" />
      </svg>
    </button>
    <button
      type="button"
      className={`study-toolbar-btn ${activePanel === 'presets' ? 'is-active' : ''}`}
      onClick={() => setActivePanel(prev => prev === 'presets' ? null : 'presets')}
      title="Presets"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    </button>
    <button
      type="button"
      className={`study-toolbar-btn ${activePanel === 'history' ? 'is-active' : ''}`}
      onClick={() => setActivePanel(prev => prev === 'history' ? null : 'history')}
      title="Historico"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    </button>
  </aside>
)
