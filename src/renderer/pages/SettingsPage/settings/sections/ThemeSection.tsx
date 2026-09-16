import React from 'react'
import type { Settings, ThemeName } from '@types'
import { THEMES } from '@types'
import { ThemeCard } from '../ThemeCard'

interface ThemeSectionProps {
  activeSection:     string
  settings:          Settings
  themeCarouselRef:  React.RefObject<HTMLDivElement>
  scrollThemes:      (direction: 'left' | 'right') => void
  handleSelectTheme: (themeName: ThemeName) => void
}

export const ThemeSection = ({
  activeSection, settings, handleSelectTheme,
}: ThemeSectionProps) => {
  if (activeSection !== 'theme') return null

  return (
    <section className="settings-section">
      <div className="settings-section-header">
        <h3>Aparência & Temas</h3>
        <p className="settings-hint">Selecione o tema visual e a paleta do aplicativo.</p>
      </div>

      <div className="theme-grid">
        {(Object.keys(THEMES) as ThemeName[]).map(themeName => (
          <ThemeCard
            key={themeName}
            themeName={themeName}
            isSelected={settings.themeName === themeName}
            onSelect={() => handleSelectTheme(themeName)}
          />
        ))}
      </div>
    </section>
  )
}
