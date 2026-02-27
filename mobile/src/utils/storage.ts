import AsyncStorage from '@react-native-async-storage/async-storage'

export async function getItem<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn('[storage] setItem error:', err)
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key)
  } catch (err) {
    console.warn('[storage] removeItem error:', err)
  }
}

export const STORAGE_KEYS = {
  THEME:         'organon:theme',
  WEEK_START:    'organon:weekStart',
  STORE_VERSION: 'organon:storeVersion',
} as const
