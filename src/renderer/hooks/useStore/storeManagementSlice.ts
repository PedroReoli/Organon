import type { Store } from '../../types'

export const createStoreManagementSlice = (
  setStore: (updater: (prev: Store) => Store) => void,
  saveStore: (store: Store) => void,
  isElectron: () => boolean,
  getDefaultStore: () => Store
) => {
  const resetStore = async () => {
    const defaultStore = getDefaultStore()
    setStore(() => defaultStore)
    if (isElectron()) {
      await window.electronAPI.saveStore(defaultStore)
    } else {
      localStorage.setItem('organon-store', JSON.stringify(defaultStore))
    }
  }

  const clearUserData = async () => {
    const def = getDefaultStore()
    setStore(prev => {
      const cleared: Store = {
        ...def,
        settings: prev.settings,
        lastSyncAt: undefined,
      }
      if (isElectron()) {
        void window.electronAPI.saveStore(cleared)
      } else {
        localStorage.setItem('organon-store', JSON.stringify(cleared))
      }
      return cleared
    })
  }

  return {
    resetStore,
    clearUserData,
  }
}
