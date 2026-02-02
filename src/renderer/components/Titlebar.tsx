import { useState, useEffect } from 'react'
import { isElectron } from '../utils'
import { APP_VERSION } from '../config/app.config'

export const Titlebar = () => {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (isElectron()) {
      window.electronAPI.isMaximized().then(setIsMaximized)
    }
  }, [])

  const handleMinimize = () => {
    if (isElectron()) {
      window.electronAPI.minimizeWindow()
    }
  }

  const handleMaximize = async () => {
    if (isElectron()) {
      await window.electronAPI.maximizeWindow()
      const maximized = await window.electronAPI.isMaximized()
      setIsMaximized(maximized)
    }
  }

  const handleClose = () => {
    if (isElectron()) {
      window.electronAPI.closeWindow()
    }
  }

  return (
    <header className="titlebar">
      {/* Área arrastável */}
      <div className="titlebar-drag">
        <div className="titlebar-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <span className="titlebar-title">
          Organon • {APP_VERSION}
        </span>
      </div>

      {/* Controles da janela */}
      <div className="titlebar-controls">
        <button
          className="titlebar-btn titlebar-btn-minimize"
          onClick={handleMinimize}
          title="Minimizar"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect y="5" width="12" height="2" fill="currentColor" />
          </svg>
        </button>

        <button
          className="titlebar-btn titlebar-btn-maximize"
          onClick={handleMaximize}
          title={isMaximized ? 'Restaurar' : 'Maximizar'}
        >
          {isMaximized ? (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path
                d="M2 4h6v6H2V4zm1 1v4h4V5H3zm2-3h6v6h-1V3H5V2z"
                fill="currentColor"
              />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          )}
        </button>

        <button
          className="titlebar-btn titlebar-btn-close"
          onClick={handleClose}
          title="Fechar"
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path
              d="M1 1l10 10M11 1L1 11"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </header>
  )
}
