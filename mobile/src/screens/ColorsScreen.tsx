import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutChangeEvent,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { EmptyState } from '../components/shared/EmptyState'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { now } from '../utils/date'
import type { ColorPalette } from '../types'

const HEX_TOKEN_REGEX = /#?[0-9a-fA-F]{3,8}\b/g

function normalizeHex(value: string): string | null {
  const raw = value.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]+$/.test(raw)) return null
  if (raw.length !== 3 && raw.length !== 4 && raw.length !== 6 && raw.length !== 8) return null
  return `#${raw.toUpperCase()}`
}

function extractHexColors(input: string): string[] {
  const matches = input.match(HEX_TOKEN_REGEX) ?? []
  const colors: string[] = []
  const seen = new Set<string>()
  for (const token of matches) {
    const hex = normalizeHex(token)
    if (!hex || seen.has(hex)) continue
    seen.add(hex)
    colors.push(hex)
  }
  return colors
}

export function ColorsScreen() {
  const { width: viewportWidth } = useWindowDimensions()
  const theme = useTheme()
  const { store, addColorPalette, updateColorPalette, deleteColorPalette } = useStore()

  const [showSheet, setShowSheet] = useState(false)
  const [editingPalette, setEditingPalette] = useState<ColorPalette | null>(null)
  const [form, setForm] = useState({ name: '', colorsText: '' })
  const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null)
  const [copiedPalette, setCopiedPalette] = useState(false)
  const [copiedColorKey, setCopiedColorKey] = useState<string | null>(null)
  const [canvasWidth, setCanvasWidth] = useState(0)

  const pagerRef = useRef<ScrollView | null>(null)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sortedPalettes = useMemo(
    () => [...store.colorPalettes].sort((a, b) => b.order - a.order),
    [store.colorPalettes],
  )

  const selectedIndex = useMemo(
    () => sortedPalettes.findIndex(p => p.id === selectedPaletteId),
    [selectedPaletteId, sortedPalettes],
  )

  const selectedPalette = useMemo(
    () => (selectedIndex >= 0 ? sortedPalettes[selectedIndex] : null),
    [selectedIndex, sortedPalettes],
  )

  const parsedColors = useMemo(() => extractHexColors(form.colorsText), [form.colorsText])
  const pageWidth = canvasWidth > 0 ? canvasWidth : Math.max(1, viewportWidth - 24)

  useEffect(() => {
    if (sortedPalettes.length === 0) {
      setSelectedPaletteId(null)
      return
    }

    if (!selectedPaletteId || !sortedPalettes.some(p => p.id === selectedPaletteId)) {
      setSelectedPaletteId(sortedPalettes[0].id)
    }
  }, [selectedPaletteId, sortedPalettes])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!pagerRef.current || selectedIndex < 0) return
    pagerRef.current.scrollTo({ x: selectedIndex * pageWidth, y: 0, animated: false })
  }, [selectedIndex, pageWidth])

  const onCanvasLayout = (e: LayoutChangeEvent) => {
    const width = Math.floor(e.nativeEvent.layout.width)
    if (width > 0 && width !== canvasWidth) setCanvasWidth(width)
  }

  const onPagerScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (sortedPalettes.length === 0) return
    const x = e.nativeEvent.contentOffset.x
    const idx = Math.max(0, Math.min(sortedPalettes.length - 1, Math.round(x / pageWidth)))
    setSelectedPaletteId(sortedPalettes[idx].id)
  }

  const scrollToPalette = (index: number, animated = true) => {
    if (!pagerRef.current) return
    if (index < 0 || index >= sortedPalettes.length) return
    pagerRef.current.scrollTo({ x: index * pageWidth, y: 0, animated })
    setSelectedPaletteId(sortedPalettes[index].id)
  }

  const openEditSelected = () => {
    if (!selectedPalette) return
    openEdit(selectedPalette)
  }

  const openNew = () => {
    setEditingPalette(null)
    setForm({ name: '', colorsText: '' })
    setShowSheet(true)
  }

  const openEdit = (palette: ColorPalette) => {
    setEditingPalette(palette)
    setForm({ name: palette.name, colorsText: palette.colors.join(', ') })
    setShowSheet(true)
  }

  const handleSave = () => {
    const name = form.name.trim()
    if (!name) return

    const colors = extractHexColors(form.colorsText)
    if (colors.length === 0) {
      Alert.alert('Paleta invalida', 'Informe pelo menos uma cor HEX valida.')
      return
    }

    if (editingPalette) {
      updateColorPalette(editingPalette.id, { name, colors, updatedAt: now() })
      setSelectedPaletteId(editingPalette.id)
    } else {
      const created = addColorPalette({ name, colors, order: store.colorPalettes.length, createdAt: now(), updatedAt: now() })
      setSelectedPaletteId(created.id)
    }

    setShowSheet(false)
  }

  const markCopied = (payload: { palette?: boolean; colorKey?: string | null }) => {
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    setCopiedPalette(Boolean(payload.palette))
    setCopiedColorKey(payload.colorKey ?? null)
    copyTimeoutRef.current = setTimeout(() => {
      setCopiedPalette(false)
      setCopiedColorKey(null)
    }, 1200)
  }

  const copyText = async (value: string): Promise<boolean> => {
    try {
      await Clipboard.setStringAsync(value)
      return true
    } catch {
      return false
    }
  }

  const copyColor = (hex: string, colorKey: string) => {
    void (async () => {
      if (await copyText(hex)) markCopied({ colorKey })
    })()
  }

  const copyPalette = () => {
    if (!selectedPalette) return
    void (async () => {
      if (await copyText(selectedPalette.colors.join(', '))) markCopied({ palette: true })
    })()
  }

  const removeSelectedPalette = () => {
    if (!selectedPalette) return

    Alert.alert('Excluir paleta', `Excluir "${selectedPalette.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => deleteColorPalette(selectedPalette.id),
      },
    ])
  }

  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    body: { flex: 1, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10, gap: 10 },

    topBar: {
      borderWidth: 1,
      borderColor: theme.text + '14',
      borderRadius: 12,
      backgroundColor: theme.surface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    topBarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    topBarTitle: { color: theme.text + '90', fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
    newBtn: {
      height: 30,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.primary + '66',
      backgroundColor: theme.primary + '14',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    newBtnText: { color: theme.primary, fontSize: 12, fontWeight: '700' },

    paletteInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    paletteTitle: { color: theme.text, fontSize: 18, fontWeight: '800', flex: 1 },
    paletteMeta: { color: theme.text + '72', fontSize: 12, fontWeight: '600' },

    dotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 2 },
    dot: { width: 7, height: 7, borderRadius: 99 },

    actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    actionBtn: {
      height: 32,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionTxt: { fontSize: 12, fontWeight: '700' },

    workspace: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.text + '14',
      borderRadius: 12,
      backgroundColor: theme.surface,
      overflow: 'hidden',
    },
    pager: { flex: 1, backgroundColor: theme.background },
    page: { flex: 1, padding: 8 },

    stackWrap: {
      flex: 1,
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#ffffff22',
      backgroundColor: '#111827',
    },
    colorBar: {
      flex: 1,
      minHeight: 0,
      borderBottomWidth: 1,
      borderBottomColor: '#ffffff33',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
    },
    colorBarLast: { borderBottomWidth: 0 },
    colorHex: {
      fontSize: 17,
      fontWeight: '800',
      letterSpacing: 0.6,
      color: '#ffffffee',
      textShadowColor: '#00000066',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    copyBadge: {
      width: 30,
      height: 30,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: '#ffffff66',
      backgroundColor: '#00000033',
      alignItems: 'center',
      justifyContent: 'center',
    },

    footer: {
      height: 66,
      borderTopWidth: 1,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    footerSide: { width: 112, alignItems: 'flex-start' },
    footerBtn: {
      height: 42,
      paddingHorizontal: 14,
      borderRadius: 13,
      borderWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    footerBtnTxt: { fontSize: 13, fontWeight: '600' },
    footerAddBtn: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 6,
    },

    emptyBlock: {
      margin: 12,
      minHeight: 160,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.text + '22',
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    emptyText: { color: theme.text + '65', fontSize: 13, textAlign: 'center', fontWeight: '600' },
  })

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Cores" />

      <View style={s.body}>
        <View style={s.topBar}>
          <View style={s.topBarRow}>
            <Text style={s.topBarTitle}>Paletas</Text>
            <TouchableOpacity style={s.newBtn} onPress={openNew} activeOpacity={0.9}>
              <Feather name="plus" size={14} color={theme.primary} />
              <Text style={s.newBtnText}>Nova</Text>
            </TouchableOpacity>
          </View>

          {selectedPalette && (
            <View style={s.paletteInfoRow}>
              <Text style={s.paletteTitle} numberOfLines={1}>{selectedPalette.name}</Text>
              <Text style={s.paletteMeta}>{selectedIndex + 1}/{sortedPalettes.length}</Text>
            </View>
          )}

          {sortedPalettes.length > 1 && (
            <View style={s.dotsRow}>
              {sortedPalettes.map((palette, idx) => {
                const active = palette.id === selectedPaletteId
                return <View key={palette.id} style={[s.dot, { backgroundColor: active ? theme.primary : theme.text + '35', width: active ? 16 : 7 }]} />
              })}
            </View>
          )}

          <View style={s.actionsRow}>
            <TouchableOpacity
              style={[s.actionBtn, { borderColor: theme.text + '22', backgroundColor: theme.text + '08' }]}
              onPress={() => selectedPalette && openEdit(selectedPalette)}
              disabled={!selectedPalette}
            >
              <Feather name="edit-2" size={13} color={theme.text + 'c0'} />
              <Text style={[s.actionTxt, { color: theme.text + 'c0' }]}>Atualizar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.actionBtn, { borderColor: theme.primary + '55', backgroundColor: theme.primary + '14' }]}
              onPress={copyPalette}
              disabled={!selectedPalette}
            >
              <Feather name={copiedPalette ? 'check' : 'copy'} size={13} color={copiedPalette ? '#22c55e' : theme.primary} />
              <Text style={[s.actionTxt, { color: theme.primary }]}>Copiar paleta</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.actionBtn, { borderColor: '#ef444466', backgroundColor: '#ef444414' }]}
              onPress={removeSelectedPalette}
              disabled={!selectedPalette}
            >
              <Feather name="trash-2" size={13} color="#ef4444" />
              <Text style={[s.actionTxt, { color: '#ef4444' }]}>Remover</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.workspace} onLayout={onCanvasLayout}>
          {sortedPalettes.length === 0 ? (
            <EmptyState icon="droplet" title="Nenhuma paleta" subtitle="Toque em Nova para criar uma paleta de cores" />
          ) : (
            <ScrollView
              ref={pagerRef}
              horizontal
              pagingEnabled
              style={s.pager}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onPagerScrollEnd}
              decelerationRate="fast"
            >
              {sortedPalettes.map(palette => (
                <View key={palette.id} style={[s.page, { width: pageWidth }]}> 
                  {palette.colors.length === 0 ? (
                    <View style={s.emptyBlock}>
                      <Text style={s.emptyText}>Informe codigos HEX validos para visualizar</Text>
                    </View>
                  ) : (
                    <View style={s.stackWrap}>
                      {palette.colors.map((hex, idx) => (
                        <TouchableOpacity
                          key={`${palette.id}-${idx}-${hex}`}
                          style={[
                            s.colorBar,
                            idx === palette.colors.length - 1 ? s.colorBarLast : null,
                            { backgroundColor: hex },
                          ]}
                          onPress={() => copyColor(hex, `${palette.id}-${idx}`)}
                          activeOpacity={0.9}
                        >
                          <Text style={s.colorHex}>{hex}</Text>
                          <View style={[s.copyBadge, copiedColorKey === `${palette.id}-${idx}` ? { borderColor: '#22c55e99', backgroundColor: '#16a34a44' } : null]}>
                            <Feather name={copiedColorKey === `${palette.id}-${idx}` ? 'check' : 'copy'} size={14} color="#fff" />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      <View style={[s.footer, { backgroundColor: theme.surface, borderTopColor: theme.text + '12' }]}>
        <View style={s.footerSide}>
          <TouchableOpacity
            style={[s.footerBtn, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '42' }]}
            onPress={() => scrollToPalette(0)}
            disabled={sortedPalettes.length === 0}
          >
            <Feather name="droplet" size={15} color={theme.primary} />
            <Text style={[s.footerBtnTxt, { color: theme.primary }]}>Paletas</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[s.footerAddBtn, { backgroundColor: theme.primary }]}
          onPress={openNew}
          activeOpacity={0.9}
        >
          <Feather name="plus" size={21} color="#fff" />
        </TouchableOpacity>

        <View style={[s.footerSide, { alignItems: 'flex-end' }]}>
          <TouchableOpacity
            style={[s.footerBtn, { backgroundColor: theme.text + '0a', borderColor: theme.text + '12' }]}
            onPress={openEditSelected}
            disabled={!selectedPalette}
          >
            <Feather name="edit-2" size={15} color={theme.text + '85'} />
            <Text style={[s.footerBtnTxt, { color: theme.text + '85' }]}>Editar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)} title={editingPalette ? 'Editar paleta' : 'Nova paleta'} onSave={handleSave}>
        <FormInput label="Nome da paleta *" value={form.name} onChangeText={n => setForm(f => ({ ...f, name: n }))} placeholder="Ex: Marca, UI Kit, Natureza..." autoFocus />
        <FormInput
          label="Cores (HEX)"
          value={form.colorsText}
          onChangeText={n => setForm(f => ({ ...f, colorsText: n }))}
          placeholder="#6366f1, #22c55e, #ef4444..."
          multiline
          numberOfLines={4}
        />
        <Text style={{ color: theme.text + '65', fontSize: 12, marginTop: 4 }}>
          Cores validas: {parsedColors.length}
        </Text>

        {editingPalette && (
          <TouchableOpacity
            style={{ marginTop: 12, padding: 14, backgroundColor: '#ef444420', borderRadius: 10, alignItems: 'center' }}
            onPress={() => {
              setShowSheet(false)
              Alert.alert('Excluir', `Excluir "${editingPalette.name}"?`, [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Excluir', style: 'destructive', onPress: () => deleteColorPalette(editingPalette.id) },
              ])
            }}
          >
            <Text style={{ color: '#ef4444', fontWeight: '700' }}>Excluir paleta</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 20 }} />
      </BottomSheet>
    </SafeAreaView>
  )
}
