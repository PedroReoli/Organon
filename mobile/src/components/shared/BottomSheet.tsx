import React from 'react'
import {
  Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback,
  ScrollView, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native'
import { useTheme } from '../../hooks/useTheme'

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  onSave?: () => void
  saveLabel?: string
}

export function BottomSheet({ visible, onClose, title, children, onSave, saveLabel = 'Salvar' }: BottomSheetProps) {
  const theme = useTheme()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrapper}
      >
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: theme.text + '30' }]} />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.cancelBtn, { color: theme.text + '80' }]}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            {onSave ? (
              <TouchableOpacity onPress={onSave}>
                <Text style={[styles.saveBtn, { color: theme.primary }]}>{saveLabel}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.spacer} />
            )}
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={styles.content}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000060',
  },
  sheetWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cancelBtn: {
    fontSize: 14,
    minWidth: 60,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  saveBtn: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
  spacer: {
    minWidth: 60,
  },
  content: {
    paddingHorizontal: 20,
  },
})
