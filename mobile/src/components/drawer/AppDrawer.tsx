import React, { useState } from 'react'
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native'
import { DrawerContentComponentProps } from '@react-navigation/drawer'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../hooks/useTheme'
import { NAV_SECTIONS, type ScreenName } from '../../constants/nav'
import { DrawerSection } from './DrawerSection'

export function AppDrawer(props: DrawerContentComponentProps) {
  const theme = useTheme()
  const [search, setSearch] = useState('')

  const navigateTo = (name: ScreenName) => {
    props.navigation.navigate(name)
    props.navigation.closeDrawer()
  }

  const filteredSections = search
    ? NAV_SECTIONS.map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.label.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(s => s.items.length > 0)
    : NAV_SECTIONS

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* Logo */}
      <View style={styles.logoRow}>
        <Text style={[styles.logo, { color: theme.primary }]}>Organon</Text>
        <TouchableOpacity onPress={() => props.navigation.closeDrawer()}>
          <Feather name="x" size={20} color={theme.text + '60'} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: theme.background, borderColor: theme.text + '20' }]}>
        <Feather name="search" size={16} color={theme.text + '60'} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Buscar tela..."
          placeholderTextColor={theme.text + '50'}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x" size={14} color={theme.text + '60'} />
          </TouchableOpacity>
        )}
      </View>

      {/* Navigation */}
      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        {filteredSections.map(section => (
          <DrawerSection
            key={section.title}
            title={section.title}
            items={section.items}
            currentRoute={props.state.routeNames[props.state.index]}
            onNavigate={navigateTo}
          />
        ))}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Today shortcut at bottom */}
      <TouchableOpacity
        style={[styles.todayBtn, { borderTopColor: theme.text + '15' }]}
        onPress={() => navigateTo('Today')}
      >
        <Feather name="sun" size={16} color={theme.primary} />
        <Text style={[styles.todayLabel, { color: theme.primary }]}>Ir para Hoje</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  logo: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  nav: {
    flex: 1,
  },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 10,
  },
  todayLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
})
