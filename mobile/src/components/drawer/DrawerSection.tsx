import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../hooks/useTheme'
import { DrawerItem } from './DrawerItem'
import type { NavItem, ScreenName } from '../../constants/nav'

interface DrawerSectionProps {
  title: string
  items: NavItem[]
  currentRoute: string
  onNavigate: (name: ScreenName) => void
}

export function DrawerSection({ title, items, currentRoute, onNavigate }: DrawerSectionProps) {
  const theme = useTheme()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setCollapsed(c => !c)}
      >
        <Text style={[styles.sectionTitle, { color: theme.text + '60' }]}>{title}</Text>
        <Feather
          name={collapsed ? 'chevron-right' : 'chevron-down'}
          size={14}
          color={theme.text + '40'}
        />
      </TouchableOpacity>

      {!collapsed && items.map(item => (
        <DrawerItem
          key={item.name}
          item={item}
          isActive={currentRoute === item.name}
          onPress={() => onNavigate(item.name)}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
})
