import 'react-native-gesture-handler'
import './global.css'
import React, { useCallback, useEffect, useRef } from 'react'
import { StatusBar, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StoreProvider, useStore } from './src/hooks/useMobileStore'
import { AppwriteProvider, useAppwriteContext } from './src/hooks/useAppwriteContext'
import { AppNavigator } from './src/navigation/AppNavigator'
import type { MobileStore } from './src/types'
import type { PartialSyncedStore } from './src/api/sync'

// ── Inner app: has access to StoreContext + SafeAreaProvider ───────────────────

function InnerApp() {
  const { isLoaded, store, loadStore } = useStore()
  const insets = useSafeAreaInsets()
  const storeRef = useRef<MobileStore>(store)
  storeRef.current = store

  const handlePullComplete = useCallback((partial: PartialSyncedStore, serverTime: string) => {
    const cur = storeRef.current
    loadStore({
      ...cur,
      cards: partial.cards,
      notes: partial.notes,
      noteFolders: partial.noteFolders,
      calendarEvents: partial.calendarEvents,
      habits: partial.habits,
      habitEntries: partial.habitEntries,
      crmContacts: partial.crmContacts,
      bills: partial.bills,
      expenses: partial.expenses,
      incomes: partial.incomes,
      savingsGoals: partial.savingsGoals,
      playbooks: partial.playbooks,
      study: {
        ...cur.study,
        goals: partial.studyGoals,
        mediaItems: partial.studyMediaItems,
      },
      lastSyncAt: serverTime,
    })
  }, [loadStore])

  if (!isLoaded) return null

  const { updateSettings } = useStore()

  return (
    <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <AppwriteProvider
        baseUrl={store.settings.apiBaseUrl}
        refreshToken={store.settings.apiRefreshToken}
        lastSyncAt={store.lastSyncAt}
        onPullComplete={handlePullComplete}
        onSessionChange={(rt, email) => updateSettings({ apiRefreshToken: rt, apiEmail: email })}
      >
        <StoreSyncBridge />
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AppwriteProvider>
    </View>
  )
}

function StoreSyncBridge() {
  const { isLoaded, store } = useStore()
  const { triggerSync } = useAppwriteContext()

  useEffect(() => {
    if (!isLoaded) return
    triggerSync(store)
  }, [isLoaded, store, triggerSync])

  return null
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
