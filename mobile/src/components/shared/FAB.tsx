import React from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../hooks/useTheme'

interface FABProps {
  onPress: () => void
  icon?: keyof typeof Feather.glyphMap
}

export function FAB({ onPress, icon = 'plus' }: FABProps) {
  const theme = useTheme()

  return (
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: theme.primary }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Feather name={icon} size={24} color="#fff" />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
})
