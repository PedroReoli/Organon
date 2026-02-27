import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../hooks/useTheme'
import type { NavItem } from '../../constants/nav'

interface DrawerItemProps {
  item: NavItem
  isActive: boolean
  onPress: () => void
}

export function DrawerItem({ item, isActive, onPress }: DrawerItemProps) {
  const theme = useTheme()

  return (
    <TouchableOpacity
      style={[
        styles.item,
        isActive && { backgroundColor: theme.primary + '20' },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Feather
        name={item.icon as keyof typeof Feather.glyphMap}
        size={18}
        color={isActive ? theme.primary : theme.text + '80'}
        style={styles.icon}
      />
      <Text
        style={[
          styles.label,
          { color: isActive ? theme.primary : theme.text },
          isActive && styles.labelActive,
        ]}
      >
        {item.label}
      </Text>
      {isActive && (
        <Feather name="chevron-right" size={14} color={theme.primary} />
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 1,
  },
  icon: {
    marginRight: 14,
    width: 20,
  },
  label: {
    flex: 1,
    fontSize: 14,
  },
  labelActive: {
    fontWeight: '600',
  },
})
