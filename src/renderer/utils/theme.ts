import type { ThemeSettings } from '../types'

export const isValidHexColor = (value: string): boolean => {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim())
}

export const normalizeHexColor = (value: string): string | null => {
  const trimmed = value.trim()
  if (!isValidHexColor(trimmed)) return null
  if (trimmed.length === 4) {
    const r = trimmed[1]
    const g = trimmed[2]
    const b = trimmed[3]
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }
  return trimmed.toLowerCase()
}

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value))
}

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const normalized = normalizeHexColor(hex)
  if (!normalized) return null
  const value = normalized.slice(1)
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return { r, g, b }
}

export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (channel: number) => channel.toString(16).padStart(2, '0')
  return `#${toHex(clamp(Math.round(r), 0, 255))}${toHex(clamp(Math.round(g), 0, 255))}${toHex(clamp(Math.round(b), 0, 255))}`
}

export const mixColor = (base: string, mix: string, amount: number): string => {
  const baseRgb = hexToRgb(base)
  const mixRgb = hexToRgb(mix)
  if (!baseRgb || !mixRgb) return base
  const ratio = clamp(amount, 0, 1)
  const r = baseRgb.r + (mixRgb.r - baseRgb.r) * ratio
  const g = baseRgb.g + (mixRgb.g - baseRgb.g) * ratio
  const b = baseRgb.b + (mixRgb.b - baseRgb.b) * ratio
  return rgbToHex(r, g, b)
}

export const adjustColor = (base: string, amount: number): string => {
  if (amount === 0) return base
  if (amount > 0) {
    return mixColor(base, '#ffffff', amount)
  }
  return mixColor(base, '#000000', Math.abs(amount))
}

export const toRgba = (hex: string, alpha: number): string => {
  const rgb = hexToRgb(hex)
  if (!rgb) return `rgba(0, 0, 0, ${alpha})`
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1)})`
}

export const applyTheme = (theme: ThemeSettings): void => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const primary = theme.primary
  const background = theme.background
  const surface = theme.surface
  const text = theme.text

  const rgb = hexToRgb(primary)
  const isLightPrimary = rgb ? (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000 > 180 : false
  const primaryText = isLightPrimary ? '#09090b' : '#ffffff'

  root.style.setProperty('--color-primary', primary)
  root.style.setProperty('--color-primary-text', primaryText)
  root.style.setProperty('--color-primary-hover', adjustColor(primary, isLightPrimary ? -0.15 : 0.18))
  root.style.setProperty('--color-primary-light', toRgba(primary, 0.15))
  root.style.setProperty('--color-primary-glow', toRgba(primary, 0.4))

  root.style.setProperty('--color-background', background)
  root.style.setProperty('--color-background-secondary', adjustColor(background, 0.08))
  root.style.setProperty('--color-background-tertiary', adjustColor(background, 0.16))
  root.style.setProperty('--color-background-elevated', adjustColor(background, 0.1))

  root.style.setProperty('--color-surface', surface)
  root.style.setProperty('--color-surface-hover', adjustColor(surface, 0.08))
  root.style.setProperty('--color-surface-light', adjustColor(surface, 0.16))

  root.style.setProperty('--color-border', adjustColor(background, 0.14))
  root.style.setProperty('--color-border-light', adjustColor(background, 0.2))
  root.style.setProperty('--color-border-focus', primary)

  root.style.setProperty('--color-text', text)
  root.style.setProperty('--color-text-secondary', toRgba(text, 0.65))
  root.style.setProperty('--color-text-muted', toRgba(text, 0.45))
  root.style.setProperty('--color-text-inverse', background)

  root.style.setProperty('--color-backlog-bg', background)
  root.style.setProperty('--color-backlog-header', adjustColor(background, 0.08))
  root.style.setProperty('--color-titlebar-bg', background)
  root.style.setProperty('--color-titlebar-text', toRgba(text, 0.65))
  root.style.setProperty('--color-titlebar-btn-hover', adjustColor(background, 0.18))

  root.style.setProperty('--color-drag-highlight', toRgba(primary, 0.2))
  root.style.setProperty('--color-drag-active', toRgba(primary, 0.3))
  root.style.setProperty('--color-drag-placeholder', toRgba(text, 0.2))
}
