import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { FAB } from '../components/shared/FAB'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { EmptyState } from '../components/shared/EmptyState'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { now } from '../utils/date'
import type { ColorPalette } from '../types'

export function ColorsScreen() {
  const theme = useTheme()
  const { store, addColorPalette, updateColorPalette, deleteColorPalette } = useStore()
  const [showSheet, setShowSheet] = useState(false)
  const [editingPalette, setEditingPalette] = useState<ColorPalette | null>(null)
  const [form, setForm] = useState({ name: '', colorsText: '' })

  const openNew = () => {
    setEditingPalette(null)
    setForm({ name: '', colorsText: '' })
    setShowSheet(true)
  }

  const openEdit = (p: ColorPalette) => {
    setEditingPalette(p)
    setForm({ name: p.name, colorsText: p.colors.join(', ') })
    setShowSheet(true)
  }

  const handleSave = () => {
    if (!form.name.trim()) return
    const colors = form.colorsText
      .split(/[,\n]/)
      .map(c => c.trim())
      .filter(c => /^#[0-9a-fA-F]{3,8}$/.test(c))
    if (editingPalette) {
      updateColorPalette(editingPalette.id, { name: form.name, colors, updatedAt: now() })
    } else {
      addColorPalette({ name: form.name, colors, order: store.colorPalettes.length, createdAt: now(), updatedAt: now() })
    }
    setShowSheet(false)
  }

  const copyColor = (hex: string) => {
    Clipboard.setStringAsync(hex).catch(() => {})
    Alert.alert('Copiado!', `${hex} copiado para a área de transferência.`)
  }

  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    list: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },
    card: { backgroundColor: theme.surface, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 10 },
    cardTitle: { flex: 1, color: theme.text, fontSize: 15, fontWeight: '600' },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingBottom: 12, gap: 8 },
    colorSwatch: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    colorHex: { fontSize: 9, fontWeight: '700', color: '#fff', textShadowColor: '#00000060', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    emptyColors: { color: theme.text + '40', fontSize: 13, padding: 14, textAlign: 'center' },
  })

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Cores" />

      <ScrollView style={s.list}>
        {store.colorPalettes.length === 0 && (
          <EmptyState icon="droplet" title="Nenhuma paleta" subtitle="Toque no + para criar uma paleta de cores" />
        )}

        {store.colorPalettes.sort((a, b) => a.order - b.order).map(palette => (
          <View key={palette.id} style={s.card}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>{palette.name}</Text>
              <TouchableOpacity onPress={() => openEdit(palette)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="edit-2" size={15} color={theme.text + '50'} />
              </TouchableOpacity>
            </View>

            {palette.colors.length === 0 ? (
              <Text style={s.emptyColors}>Nenhuma cor nesta paleta</Text>
            ) : (
              <View style={s.colorRow}>
                {palette.colors.map((hex, i) => (
                  <TouchableOpacity key={i} style={[s.colorSwatch, { backgroundColor: hex }]} onPress={() => copyColor(hex)}>
                    <Text style={s.colorHex}>{hex}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB onPress={openNew} />

      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)} title={editingPalette ? 'Editar paleta' : 'Nova paleta'} onSave={handleSave}>
        <FormInput label="Nome da paleta *" value={form.name} onChangeText={n => setForm(f => ({ ...f, name: n }))} placeholder="Ex: Marca, UI Kit, Natureza..." autoFocus />
        <FormInput
          label="Cores (hex separados por vírgula)"
          value={form.colorsText}
          onChangeText={n => setForm(f => ({ ...f, colorsText: n }))}
          placeholder="#6366f1, #22c55e, #ef4444..."
          multiline
          numberOfLines={4}
        />
        <Text style={{ color: theme.text + '50', fontSize: 12, marginTop: 4 }}>
          Cole os códigos hex separados por vírgula. Ex: #6366f1, #22c55e
        </Text>

        {editingPalette && (
          <TouchableOpacity style={{ marginTop: 12, padding: 14, backgroundColor: '#ef444420', borderRadius: 10, alignItems: 'center' }}
            onPress={() => { setShowSheet(false); Alert.alert('Excluir', `Excluir "${editingPalette.name}"?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => deleteColorPalette(editingPalette.id) }]) }}>
            <Text style={{ color: '#ef4444', fontWeight: '600' }}>Excluir paleta</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 20 }} />
      </BottomSheet>
    </SafeAreaView>
  )
}
