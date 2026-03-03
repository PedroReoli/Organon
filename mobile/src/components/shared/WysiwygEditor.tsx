import React, { useMemo, useState } from 'react'
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { useTheme } from '../../hooks/useTheme'

type Mode = 'edit' | 'preview'

interface WysiwygEditorProps {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  minHeight?: number
  onBlur?: () => void
  showPreviewToggle?: boolean
  initialMode?: Mode
}

const removeInlineMarkers = (text: string): string =>
  text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')

const renderPreview = (content: string, palette: { text: string; surface: string; primary: string }) => {
  if (!content.trim()) {
    return <Text style={{ color: palette.text + '45', fontSize: 14 }}>Conteudo vazio.</Text>
  }

  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const nodes: React.ReactNode[] = []
  let inCode = false
  let codeLines: string[] = []

  const flushCode = (key: string) => {
    if (codeLines.length === 0) return
    nodes.push(
      <View
        key={key}
        style={{
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.text + '18',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 8,
          marginBottom: 8,
        }}
      >
        <Text style={{ color: palette.text + 'd0', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), fontSize: 13, lineHeight: 19 }}>
          {codeLines.join('\n')}
        </Text>
      </View>,
    )
    codeLines = []
  }

  lines.forEach((rawLine, idx) => {
    const line = rawLine ?? ''

    if (line.trim().startsWith('```')) {
      if (inCode) {
        flushCode(`code-${idx}`)
        inCode = false
      } else {
        inCode = true
        codeLines = []
      }
      return
    }

    if (inCode) {
      codeLines.push(line)
      return
    }

    if (!line.trim()) {
      nodes.push(<View key={`sp-${idx}`} style={{ height: 8 }} />)
      return
    }

    if (/^###\s+/.test(line)) {
      nodes.push(
        <Text key={`h3-${idx}`} style={{ color: palette.text, fontSize: 17, fontWeight: '700', marginBottom: 6 }}>
          {removeInlineMarkers(line.replace(/^###\s+/, ''))}
        </Text>,
      )
      return
    }

    if (/^##\s+/.test(line)) {
      nodes.push(
        <Text key={`h2-${idx}`} style={{ color: palette.text, fontSize: 19, fontWeight: '700', marginBottom: 7 }}>
          {removeInlineMarkers(line.replace(/^##\s+/, ''))}
        </Text>,
      )
      return
    }

    if (/^#\s+/.test(line)) {
      nodes.push(
        <Text key={`h1-${idx}`} style={{ color: palette.text, fontSize: 22, fontWeight: '800', marginBottom: 8 }}>
          {removeInlineMarkers(line.replace(/^#\s+/, ''))}
        </Text>,
      )
      return
    }

    if (/^>\s+/.test(line)) {
      nodes.push(
        <View key={`q-${idx}`} style={{ borderLeftWidth: 3, borderLeftColor: palette.primary, paddingLeft: 10, marginBottom: 7 }}>
          <Text style={{ color: palette.text + 'b5', fontSize: 15, lineHeight: 23 }}>{removeInlineMarkers(line.replace(/^>\s+/, ''))}</Text>
        </View>,
      )
      return
    }

    if (/^[-*]\s+/.test(line)) {
      nodes.push(
        <View key={`ul-${idx}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
          <Text style={{ color: palette.primary, marginTop: 1 }}>•</Text>
          <Text style={{ color: palette.text, flex: 1, fontSize: 15, lineHeight: 23 }}>{removeInlineMarkers(line.replace(/^[-*]\s+/, ''))}</Text>
        </View>,
      )
      return
    }

    const ordered = line.match(/^(\d+)\.\s+(.*)$/)
    if (ordered) {
      nodes.push(
        <View key={`ol-${idx}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
          <Text style={{ color: palette.primary, marginTop: 1 }}>{ordered[1]}.</Text>
          <Text style={{ color: palette.text, flex: 1, fontSize: 15, lineHeight: 23 }}>{removeInlineMarkers(ordered[2])}</Text>
        </View>,
      )
      return
    }

    nodes.push(
      <Text key={`p-${idx}`} style={{ color: palette.text, fontSize: 15, lineHeight: 24, marginBottom: 6 }}>
        {removeInlineMarkers(line)}
      </Text>,
    )
  })

  if (inCode) flushCode('code-final')
  return <>{nodes}</>
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function WysiwygEditor({
  value,
  onChangeText,
  placeholder = 'Digite aqui...',
  minHeight = 220,
  onBlur,
  showPreviewToggle = true,
  initialMode = 'edit',
}: WysiwygEditorProps) {
  const theme = useTheme()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [selection, setSelection] = useState({ start: 0, end: 0 })

  const applyChange = (nextValue: string, nextSelection: { start: number; end: number }) => {
    onChangeText(nextValue)
    setSelection(nextSelection)
  }

  const wrapSelection = (prefix: string, suffix = prefix) => {
    const start = selection.start
    const end = selection.end

    if (start === end) {
      const inserted = `${prefix}${suffix}`
      const next = value.slice(0, start) + inserted + value.slice(end)
      applyChange(next, { start: start + prefix.length, end: start + prefix.length })
      return
    }

    const selected = value.slice(start, end)
    const next = value.slice(0, start) + prefix + selected + suffix + value.slice(end)
    applyChange(next, { start: start + prefix.length, end: start + prefix.length + selected.length })
  }

  const toggleLinePrefix = (prefix: string, matcher?: RegExp) => {
    const start = selection.start
    const end = selection.end
    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
    const lineEndIndex = value.indexOf('\n', end)
    const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex

    const block = value.slice(lineStart, lineEnd)
    const lines = block.split('\n')
    const lineMatcher = matcher ?? new RegExp(`^${escapeRegex(prefix)}`)
    const hasAllPrefix = lines.filter(line => line.trim().length > 0).every(line => lineMatcher.test(line))

    const transformed = lines.map((line, index) => {
      if (!line.trim()) return line
      if (hasAllPrefix) return line.replace(lineMatcher, '')
      if (prefix === '1. ') return `${index + 1}. ${line.replace(/^\d+\.\s+/, '')}`
      return `${prefix}${line}`
    }).join('\n')

    const next = value.slice(0, lineStart) + transformed + value.slice(lineEnd)
    const delta = transformed.length - block.length
    applyChange(next, { start: start + delta, end: end + delta })
  }

  const insertLink = () => {
    const start = selection.start
    const end = selection.end
    const selected = value.slice(start, end) || 'texto'
    const template = `[${selected}](https://)`
    const next = value.slice(0, start) + template + value.slice(end)
    const cursor = start + template.length - 1
    applyChange(next, { start: cursor, end: cursor })
  }

  const actions = useMemo(() => [
    { id: 'h1', icon: 'type', onPress: () => toggleLinePrefix('# ', /^#{1,3}\s+/), label: 'Titulo' },
    { id: 'bold', icon: 'bold', onPress: () => wrapSelection('**'), label: 'Negrito' },
    { id: 'italic', icon: 'italic', onPress: () => wrapSelection('*'), label: 'Italico' },
    { id: 'quote', icon: 'message-square', onPress: () => toggleLinePrefix('> ', /^>\s+/), label: 'Citacao' },
    { id: 'list', icon: 'list', onPress: () => toggleLinePrefix('- ', /^[-*]\s+/), label: 'Lista' },
    { id: 'order', icon: 'list', onPress: () => toggleLinePrefix('1. ', /^\d+\.\s+/), label: 'Numerada' },
    { id: 'code', icon: 'code', onPress: () => wrapSelection('```\n', '\n```'), label: 'Codigo' },
    { id: 'link', icon: 'link', onPress: insertLink, label: 'Link' },
  ], [selection, value])

  const s = StyleSheet.create({
    root: {
      borderWidth: 1,
      borderColor: theme.text + '22',
      borderRadius: 12,
      backgroundColor: theme.surface,
      overflow: 'hidden',
      marginTop: 6,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.text + '14',
      backgroundColor: theme.background,
    },
    topTitle: { color: theme.text + '88', fontSize: 12, fontWeight: '700' },
    modeBtn: {
      borderWidth: 1,
      borderColor: theme.text + '2a',
      borderRadius: 8,
      paddingHorizontal: 10,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: mode === 'preview' ? theme.primary + '20' : theme.surface,
    },
    modeBtnTxt: {
      color: mode === 'preview' ? theme.primary : theme.text + 'b0',
      fontSize: 12,
      fontWeight: '700',
    },
    toolbar: {
      borderBottomWidth: mode === 'edit' ? 1 : 0,
      borderBottomColor: theme.text + '14',
      backgroundColor: theme.background,
    },
    toolbarInner: {
      paddingHorizontal: 8,
      paddingVertical: 8,
      gap: 8,
      alignItems: 'center',
    },
    toolBtn: {
      width: 34,
      height: 34,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: theme.text + '2c',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.surface,
    },
    input: {
      minHeight,
      color: theme.text,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 15,
      lineHeight: 22,
      textAlignVertical: 'top',
    },
    previewWrap: {
      minHeight,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
  })

  return (
    <View style={s.root}>
      <View style={s.topBar}>
        <Text style={s.topTitle}>Editor</Text>
        {showPreviewToggle ? (
          <TouchableOpacity style={s.modeBtn} onPress={() => setMode(prev => prev === 'edit' ? 'preview' : 'edit')}>
            <Text style={s.modeBtnTxt}>{mode === 'edit' ? 'Visualizar' : 'Editar'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {mode === 'edit' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.toolbar} contentContainerStyle={s.toolbarInner}>
            {actions.map(action => (
              <TouchableOpacity key={action.id} style={s.toolBtn} onPress={action.onPress} accessibilityLabel={action.label}>
                <Feather name={action.icon as keyof typeof Feather.glyphMap} size={15} color={theme.text + 'd0'} />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onBlur={onBlur}
            multiline
            placeholder={placeholder}
            placeholderTextColor={theme.text + '45'}
            style={s.input}
            selection={selection}
            onSelectionChange={(event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
              setSelection(event.nativeEvent.selection)
            }}
          />
        </>
      ) : (
        <ScrollView style={s.previewWrap} contentContainerStyle={{ paddingBottom: 8 }}>
          {renderPreview(value, { text: theme.text, surface: theme.surface, primary: theme.primary })}
        </ScrollView>
      )}
    </View>
  )
}
