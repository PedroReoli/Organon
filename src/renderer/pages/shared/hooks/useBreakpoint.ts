import { useEffect, useState } from 'react'

export type BreakpointName = 'sm' | 'md' | 'lg' | 'xl' | '2xl'

export interface BreakpointState {
  width: number
  isSm: boolean
  isMd: boolean
  isLg: boolean
  isXl: boolean
  is2xl: boolean
  /** maior breakpoint ativo */
  current: BreakpointName | 'base'
}

/**
 * Le os breakpoints definidos em foundation/tokens.css (`--bp-*`)
 * e expoe estado reativo conforme a janela redimensiona.
 *
 * Uso:
 *   const { isMd, current } = useBreakpoint()
 *   if (isMd) { ... }
 *
 * Definido no upgrade 20.
 */
export function useBreakpoint(): BreakpointState {
  const [width, setWidth] = useState<number>(() =>
    typeof window === 'undefined' ? 0 : window.innerWidth,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize, { passive: true })
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const bps = readBreakpointsFromCss()

  const isSm = width >= bps.sm
  const isMd = width >= bps.md
  const isLg = width >= bps.lg
  const isXl = width >= bps.xl
  const is2xl = width >= bps['2xl']

  let current: BreakpointName | 'base' = 'base'
  if (is2xl) current = '2xl'
  else if (isXl) current = 'xl'
  else if (isLg) current = 'lg'
  else if (isMd) current = 'md'
  else if (isSm) current = 'sm'

  return { width, isSm, isMd, isLg, isXl, is2xl, current }
}

interface BreakpointConfig {
  sm: number
  md: number
  lg: number
  xl: number
  '2xl': number
}

const FALLBACK: BreakpointConfig = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 }

let cached: BreakpointConfig | null = null

function readBreakpointsFromCss(): BreakpointConfig {
  if (cached) return cached
  if (typeof window === 'undefined') return FALLBACK

  const root = document.documentElement
  const styles = window.getComputedStyle(root)

  const parsePx = (value: string, fallback: number): number => {
    const trimmed = value.trim()
    if (!trimmed) return fallback
    const num = parseFloat(trimmed)
    return Number.isFinite(num) ? num : fallback
  }

  cached = {
    sm: parsePx(styles.getPropertyValue('--bp-sm'), FALLBACK.sm),
    md: parsePx(styles.getPropertyValue('--bp-md'), FALLBACK.md),
    lg: parsePx(styles.getPropertyValue('--bp-lg'), FALLBACK.lg),
    xl: parsePx(styles.getPropertyValue('--bp-xl'), FALLBACK.xl),
    '2xl': parsePx(styles.getPropertyValue('--bp-2xl'), FALLBACK['2xl']),
  }
  return cached
}
