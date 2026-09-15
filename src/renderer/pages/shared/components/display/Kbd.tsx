import React from 'react'
import './display.css'

interface KbdProps {
  children: React.ReactNode
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Renderiza uma tecla de atalho de teclado: <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd>.
 *
 * Definido no upgrade 19. Substitui `<kbd>` cru ou `<span class="kbd">`
 * espalhado em ShortcutsView, Settings, etc.
 */
export const Kbd = ({ children, size = 'sm', className = '' }: KbdProps) => {
  const classes = ['ds-kbd', `ds-kbd--${size}`, className].filter(Boolean).join(' ')
  return <kbd className={classes}>{children}</kbd>
}
