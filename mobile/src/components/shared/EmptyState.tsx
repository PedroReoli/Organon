import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../hooks/useTheme'

interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap
  title: string
  subtitle?: string
}

export function EmptyState({ icon = 'inbox', title, subtitle }: EmptyStateProps) {
  const theme = useTheme()

  return (
    <View style={styles.container}>
      <Feather name={icon} size={48} color={theme.text} style={styles.icon} />
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: theme.text }]}>{subtitle}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  icon: {
    opacity: 0.3,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.4,
    marginTop: 6,
    textAlign: 'center',
  },
})
