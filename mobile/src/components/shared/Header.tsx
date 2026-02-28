import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useNavigation, DrawerActions } from '@react-navigation/native'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../hooks/useTheme'

interface HeaderProps {
  title: string
  rightIcon?: keyof typeof Feather.glyphMap
  onRightPress?: () => void
  rightLabel?: string
}

export function Header({ title, rightIcon, onRightPress, rightLabel }: HeaderProps) {
  const navigation = useNavigation()
  const theme = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderBottomColor: theme.text + '12' }]}>
      <TouchableOpacity
        style={styles.menuBtn}
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="menu" size={22} color={theme.text} />
      </TouchableOpacity>

      <View style={styles.titleWrap} pointerEvents="none">
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {rightIcon || rightLabel ? (
        <TouchableOpacity
          style={styles.rightBtn}
          onPress={onRightPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {rightIcon
            ? <Feather name={rightIcon} size={22} color={theme.primary} />
            : <Text style={[styles.rightLabel, { color: theme.primary }]}>{rightLabel}</Text>
          }
        </TouchableOpacity>
      ) : (
        <View style={styles.rightBtn} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 1.5,
  },
  menuBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    position: 'absolute',
    left: 56,
    right: 56,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  rightBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
})
