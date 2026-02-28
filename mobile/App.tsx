import 'react-native-gesture-handler'
import './global.css'
import React, { useCallback } from 'react'
import { StatusBar, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StoreProvider, useStore } from './src/hooks/useMobileStore'
import { AppwriteProvider } from './src/hooks/useAppwriteContext'
import { AppNavigator } from './src/navigation/AppNavigator'
import type { MobileStore } from './src/types'

// ── Inner app: has access to StoreContext + SafeAreaProvider ───────────────────

function InnerApp() {
  const { isLoaded, loadStore } = useStore()
  const insets = useSafeAreaInsets()

  const handleCloudStore = useCallback((cloudStore: MobileStore) => {
    loadStore(cloudStore)
  }, [loadStore])

  if (!isLoaded) return null

  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <AppwriteProvider onCloudStoreDownloaded={handleCloudStore}>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AppwriteProvider>
    </View>
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
