import 'react-native-gesture-handler'
import './global.css'
import React, { useCallback, useEffect } from 'react'
import { StatusBar, useColorScheme } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StoreProvider, useStore } from './src/hooks/useMobileStore'
import { AppwriteProvider } from './src/hooks/useAppwriteContext'
import { AppNavigator } from './src/navigation/AppNavigator'
import type { MobileStore } from './src/types'

// ── Inner app: has access to StoreContext ──────────────────────────────────────

function InnerApp() {
  const { store, isLoaded } = useStore()

  // Cloud store downloaded callback: replace local store with cloud data
  // (handled inside StoreProvider via onStoreChange)
  const handleCloudStore = useCallback((cloudStore: MobileStore) => {
    // Compare timestamps; if cloud is newer, we'd want to apply it.
    // For simplicity: the StoreProvider is aware of cloud state via this callback.
    // In a full implementation, you would call a method to overwrite the local state.
    // For now, we log it — a more complete approach would call setStore via ref.
    console.log('[sync] Cloud store downloaded, storeUpdatedAt:', cloudStore.storeUpdatedAt)
  }, [])

  if (!isLoaded) return null

  return (
    <AppwriteProvider onCloudStoreDownloaded={handleCloudStore}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AppwriteProvider>
  )
}

// ── Root app ───────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <StoreProvider>
          <InnerApp />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
