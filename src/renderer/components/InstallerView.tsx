import { useState } from 'react'
import type { ThemeName } from '../types'
import { THEMES, THEME_LABELS } from '../types'
import { applyTheme, isElectron } from '../utils'

interface InstallerViewProps {
  onComplete: () => void
}

type InstallerStep = 'welcome' | 'data-folder' | 'theme' | 'finishing'

interface ThemeCardProps {
  themeName: ThemeName
  isSelected: boolean
  onSelect: () => void
}

const ThemeCard = ({ themeName, isSelected, onSelect }: ThemeCardProps) => {
  const theme = THEMES[themeName]
  const label = THEME_LABELS[themeName]

  return (
    <button
      className={`theme-card ${isSelected ? 'theme-card-selected' : ''}`}
      onClick={onSelect}
      style={{
        '--preview-bg': theme.background,
        '--preview-surface': theme.surface,
        '--preview-primary': theme.primary,
        '--preview-text': theme.text,
      } as React.CSSProperties}
    >
      <div className="theme-card-preview">
        <div className="theme-preview-sidebar" />
        <div className="theme-preview-content">
          <div className="theme-preview-header" />
          <div className="theme-preview-cards">
            <div className="theme-preview-card" />
            <div className="theme-preview-card" />
          </div>
        </div>
      </div>
      <div className="theme-card-label">{label}</div>
      {isSelected && (
        <div className="theme-card-check">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </button>
  )
}

export const InstallerView = ({ onComplete }: InstallerViewProps) => {
  const [step, setStep] = useState<InstallerStep>('welcome')
  const [dataDir, setDataDir] = useState<string | null>(null)
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>('dark-default')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectFolder = async () => {
    if (!isElectron()) return
    try {
      const selected = await window.electronAPI.selectDataDir()
      if (selected) {
        setDataDir(selected)
      }
    } catch (err) {
      console.error('Erro ao selecionar pasta:', err)
    }
  }

  const handleThemeSelect = (themeName: ThemeName) => {
    setSelectedTheme(themeName)
    applyTheme(THEMES[themeName])
  }

  const handleFinish = async () => {
    if (!isElectron()) {
      onComplete()
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await window.electronAPI.completeInstaller(dataDir, selectedTheme)
      if (result.success) {
        onComplete()
      } else {
        setError(result.error ?? 'Erro ao completar instalacao')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="installer-container">
      <div className="installer-content">
        {step === 'welcome' && (
          <div className="installer-step">
            <div className="installer-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="64" height="64">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h1>Bem-vindo ao Organon</h1>
            <p>Vamos configurar o aplicativo para voce.</p>
            <p className="installer-subtitle">Este assistente vai ajudar a escolher onde salvar seus dados e selecionar um tema visual.</p>
            <button className="btn btn-primary installer-btn" onClick={() => setStep('data-folder')}>
              Comecar
            </button>
          </div>
        )}

        {step === 'data-folder' && (
          <div className="installer-step">
            <h2>Pasta de Dados</h2>
            <p>Escolha onde seus dados serao salvos.</p>
            <p className="installer-subtitle">Voce pode usar a pasta padrao ou selecionar uma pasta personalizada (ex: Dropbox, OneDrive).</p>

            <div className="installer-folder-options">
              <button
                className={`installer-folder-option ${dataDir === null ? 'selected' : ''}`}
                onClick={() => setDataDir(null)}
              >
                <div className="installer-folder-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="installer-folder-label">Pasta Padrao</div>
                <div className="installer-folder-hint">Recomendado para a maioria dos usuarios</div>
              </button>

              <button
                className={`installer-folder-option ${dataDir !== null ? 'selected' : ''}`}
                onClick={handleSelectFolder}
              >
                <div className="installer-folder-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    <line x1="12" y1="11" x2="12" y2="17" />
                    <line x1="9" y1="14" x2="15" y2="14" />
                  </svg>
                </div>
                <div className="installer-folder-label">Pasta Personalizada</div>
                <div className="installer-folder-hint">
                  {dataDir ? dataDir : 'Clique para selecionar'}
                </div>
              </button>
            </div>

            <div className="installer-nav">
              <button className="btn btn-secondary" onClick={() => setStep('welcome')}>
                Voltar
              </button>
              <button className="btn btn-primary" onClick={() => setStep('theme')}>
                Proximo
              </button>
            </div>
          </div>
        )}

        {step === 'theme' && (
          <div className="installer-step">
            <h2>Escolha um Tema</h2>
            <p>Selecione o tema visual do aplicativo.</p>

            <div className="theme-grid installer-theme-grid">
              {(Object.keys(THEMES) as ThemeName[]).map((themeName) => (
                <ThemeCard
                  key={themeName}
                  themeName={themeName}
                  isSelected={selectedTheme === themeName}
                  onSelect={() => handleThemeSelect(themeName)}
                />
              ))}
            </div>

            <div className="installer-nav">
              <button className="btn btn-secondary" onClick={() => setStep('data-folder')}>
                Voltar
              </button>
              <button className="btn btn-primary" onClick={() => setStep('finishing')}>
                Proximo
              </button>
            </div>
          </div>
        )}

        {step === 'finishing' && (
          <div className="installer-step">
            <h2>Tudo Pronto!</h2>
            <p>Suas configuracoes:</p>

            <div className="installer-summary">
              <div className="installer-summary-item">
                <span className="installer-summary-label">Pasta de dados:</span>
                <span className="installer-summary-value">{dataDir ?? 'Pasta padrao'}</span>
              </div>
              <div className="installer-summary-item">
                <span className="installer-summary-label">Tema:</span>
                <span className="installer-summary-value">{THEME_LABELS[selectedTheme]}</span>
              </div>
            </div>

            {error && (
              <div className="installer-error">
                {error}
              </div>
            )}

            <div className="installer-nav">
              <button className="btn btn-secondary" onClick={() => setStep('theme')} disabled={isLoading}>
                Voltar
              </button>
              <button className="btn btn-primary" onClick={handleFinish} disabled={isLoading}>
                {isLoading ? 'Configurando...' : 'Concluir'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="installer-progress">
        <div className={`installer-progress-step ${step === 'welcome' ? 'active' : ''} ${['data-folder', 'theme', 'finishing'].includes(step) ? 'completed' : ''}`} />
        <div className={`installer-progress-step ${step === 'data-folder' ? 'active' : ''} ${['theme', 'finishing'].includes(step) ? 'completed' : ''}`} />
        <div className={`installer-progress-step ${step === 'theme' ? 'active' : ''} ${step === 'finishing' ? 'completed' : ''}`} />
        <div className={`installer-progress-step ${step === 'finishing' ? 'active' : ''}`} />
      </div>
    </div>
  )
}
