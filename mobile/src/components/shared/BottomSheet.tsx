import React from 'react'
import {
  Modal, View, Text, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, StyleSheet, SafeAreaView,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../hooks/useTheme'

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  onSave?: () => void
  saveLabel?: string
  maxHeight?: number | `${number}%`
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  onSave,
  saveLabel = 'Salvar',
  maxHeight = '90%',
}: BottomSheetProps) {
  const theme = useTheme()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.wrapper, { backgroundColor: theme.background }]}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.text + '14' }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: '#ef444422', borderColor: '#ef444477' }]}
              onPress={onClose}
            >
              <Feather name="x" size={16} color="#ef4444" />
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{title}</Text>

            {onSave ? (
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                onPress={onSave}
              >
                <Text style={styles.saveBtnText}>{saveLabel}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.spacer} />
            )}
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.content}
            contentContainerStyle={[styles.contentInner, { paddingBottom: 24 }]}
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  cancelBtn: {
    minWidth: 110,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cancelBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  saveBtn: {
    minWidth: 96,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  spacer: {
    minWidth: 96,
    height: 40,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
})
