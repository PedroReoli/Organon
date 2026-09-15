import React from 'react'
import type { ThemeName } from '@types'
import { THEMES, THEME_LABELS } from '@types'

interface ThemeCardProps {
  themeName:  ThemeName
  isSelected: boolean
  onSelect:   () => void
}

export const ThemeCard = ({ themeName, isSelected, onSelect }: ThemeCardProps) => {
  const theme = THEMES[themeName]
  const label = THEME_LABELS[themeName]

  return (
    <button
      className={`theme-card ${isSelected ? 'theme-card-selected' : ''}`}
      onClick={onSelect}
      style={{
        '--preview-bg':      theme.background,
        '--preview-surface': theme.surface,
        '--preview-primary': theme.primary,
        '--preview-text':    theme.text,
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
