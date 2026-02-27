import React from 'react'
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

interface FormInputProps extends TextInputProps {
  label?: string
}

export function FormInput({ label, style, ...props }: FormInputProps) {
  const theme = useTheme()

  return (
    <View style={styles.wrapper}>
      {label && <Text style={[styles.label, { color: theme.text + 'aa' }]}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          { color: theme.text, borderColor: theme.text + '25', backgroundColor: theme.background },
          style,
        ]}
        placeholderTextColor={theme.text + '50'}
        {...props}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
})
