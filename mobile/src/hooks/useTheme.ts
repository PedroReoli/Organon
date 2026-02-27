import { useContext } from 'react'
import { StoreContext } from './useMobileStore'
import { THEMES, type ThemeSettings } from '../types'

export function useTheme(): ThemeSettings {
  const { store } = useContext(StoreContext)
  return THEMES[store.settings.themeName] ?? THEMES['dark-default']
}
