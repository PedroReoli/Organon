import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { useAppwriteContext } from '../hooks/useAppwriteContext'
import { configureOrganon, organonApi } from '../api/organon'
import { THEMES, THEME_LABELS, type ThemeName } from '../types'

const THEME_NAMES = Object.keys(THEMES) as ThemeName[]

const SYNC_STATUS_LABELS = {
  idle: 'Aguardando alterações',
  pending: 'Aguardando...',
  syncing: 'Sincronizando...',
  synced: 'Sincronizado',
  error: 'Erro na sincronização',
} as const

const SYNC_STATUS_COLORS = {
  idle: '#6b7280',
  pending: '#f97316',
  syncing: '#3b82f6',
  synced: '#22c55e',
  error: '#ef4444',
} as const

const DEFAULT_BASE_URL = 'https://reolicodeapi.com'

export function SettingsScreen() {
  const theme = useTheme()
  const { store, updateSettings } = useStore()
  const { isConfigured, syncStatus } = useAppwriteContext()

  const [showTokenSheet, setShowTokenSheet] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [baseUrlInput, setBaseUrlInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const handleOpenTokenSheet = () => {
    setTokenInput(store.settings.apiToken ?? '')
    setBaseUrlInput(store.settings.apiBaseUrl ?? '')
    setTokenError(null)
    setShowTokenSheet(true)
  }

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) {
      setTokenError('O token não pode ser vazio.')
      return
    }
    setIsSaving(true)
    setTokenError(null)
    try {
      configureOrganon({ baseUrl: baseUrlInput.trim() || DEFAULT_BASE_URL, token: tokenInput.trim() })
      const ok = await organonApi.ping()
      if (!ok) {
        setTokenError('Token inválido ou API inacessível.')
        return
      }
      updateSettings({ apiToken: tokenInput.trim(), apiBaseUrl: baseUrlInput.trim() || DEFAULT_BASE_URL })
      setShowTokenSheet(false)
      Alert.alert('Conectado!', 'Token salvo. A sincronização será ativada na próxima vez que o app abrir.')
    } catch {
      setTokenError('Erro de conexão. Verifique a URL e o token.')
    } finally {
      setIsSaving(false)
    }
  }

  const s = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    scroll: { flex: 1, padding: 16 },
    section: { marginBottom: 24 },
    sectionTitle: { color: theme.text + '60', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
    card: { backgroundColor: theme.surface, borderRadius: 12, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: theme.text + '08' },
    rowLast: { borderBottomWidth: 0 },
    rowLabel: { flex: 1, color: theme.text, fontSize: 15 },
    rowValue: { color: theme.text + '60', fontSize: 14 },
    themeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      padding: 12,
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.text + '12',
    },
    themeCard: {
      width: '48.5%',
      borderRadius: 12,
      borderWidth: 1,
      padding: 10,
      minHeight: 96,
      justifyContent: 'space-between',
    },
    themeCardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    themeCardName: {
      flex: 1,
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 16,
    },
    themeActiveBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themePreviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
    },
    themeSwatch: {
      width: 18,
      height: 18,
      borderRadius: 6,
      borderWidth: 1,
    },
    syncRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: theme.surface, borderRadius: 12 },
    actionBtn: { padding: 14, backgroundColor: theme.primary + '20', borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
    actionBtnTxt: { color: theme.primary, fontSize: 15, fontWeight: '600' },
    syncBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    syncBadgeTxt: { fontSize: 12, fontWeight: '600' },
  })

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Configurações" />

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* API e Sincronização */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>API e sincronização</Text>

          {isConfigured ? (
            <>
              <View style={[s.syncRow, { justifyContent: 'space-between' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="cloud" size={16} color={SYNC_STATUS_COLORS[syncStatus]} />
                  <Text style={{ color: theme.text, fontSize: 14 }}>Status</Text>
                </View>
                <View style={[s.syncBadge, { backgroundColor: SYNC_STATUS_COLORS[syncStatus] + '20' }]}>
                  <Text style={[s.syncBadgeTxt, { color: SYNC_STATUS_COLORS[syncStatus] }]}>
                    {SYNC_STATUS_LABELS[syncStatus]}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={[s.actionBtn, { marginTop: 8 }]} onPress={handleOpenTokenSheet}>
                <Feather name="key" size={16} color={theme.primary} />
                <Text style={s.actionBtnTxt}>Alterar token</Text>
              </TouchableOpacity>

              <Text style={{ color: theme.text + '40', fontSize: 12, marginTop: 8, lineHeight: 17 }}>
                Sincronização automática a cada 10 segundos após uma alteração.
              </Text>
            </>
          ) : (
            <>
              <TouchableOpacity style={s.actionBtn} onPress={handleOpenTokenSheet}>
                <Feather name="key" size={18} color={theme.primary} />
                <Text style={s.actionBtnTxt}>Configurar token da API</Text>
              </TouchableOpacity>
              <Text style={{ color: theme.text + '40', fontSize: 12, marginTop: 8, lineHeight: 17 }}>
                O app funciona 100% offline. Configure o token para sincronizar entre dispositivos.
              </Text>
            </>
          )}
        </View>

        {/* Aparência */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Aparência</Text>
          <View style={s.themeGrid}>
            {THEME_NAMES.map(name => {
              const t = THEMES[name]
              const active = store.settings.themeName === name
              return (
                <TouchableOpacity
                  key={name}
                  style={[s.themeCard, {
                    borderColor: active ? t.primary : theme.text + '22',
                    backgroundColor: active ? t.primary + '16' : theme.background,
                  }]}
                  onPress={() => updateSettings({ themeName: name })}
                >
                  <View style={s.themeCardHeader}>
                    <Text numberOfLines={2} style={[s.themeCardName, { color: active ? t.primary : theme.text + 'd0' }]}>
                      {THEME_LABELS[name]}
                    </Text>
                    <View style={[s.themeActiveBadge, { backgroundColor: active ? t.primary : theme.text + '24' }]}>
                      {active ? <Feather name="check" size={12} color="#fff" /> : null}
                    </View>
                  </View>
                  <View style={s.themePreviewRow}>
                    <View style={[s.themeSwatch, { backgroundColor: t.background, borderColor: theme.text + '30' }]} />
                    <View style={[s.themeSwatch, { backgroundColor: t.surface, borderColor: theme.text + '30' }]} />
                    <View style={[s.themeSwatch, { backgroundColor: t.primary, borderColor: t.primary }]} />
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Preferências */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Preferências</Text>
          <View style={s.card}>
            <View style={[s.row, s.rowLast]}>
              <Text style={s.rowLabel}>Início da semana</Text>
              <TouchableOpacity
                style={{ flexDirection: 'row', gap: 6 }}
                onPress={() => updateSettings({ weekStart: store.settings.weekStart === 'sun' ? 'mon' : 'sun' })}
              >
                <Text style={[s.rowValue, store.settings.weekStart === 'sun' && { color: theme.primary, fontWeight: '600' }]}>Dom</Text>
                <Text style={s.rowValue}>·</Text>
                <Text style={[s.rowValue, store.settings.weekStart === 'mon' && { color: theme.primary, fontWeight: '600' }]}>Seg</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Sobre */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Sobre</Text>
          <View style={s.card}>
            <View style={s.row}>
              <Text style={s.rowLabel}>Organon Mobile</Text>
              <Text style={s.rowValue}>v1.0.0</Text>
            </View>
            <View style={[s.row, s.rowLast]}>
              <Text style={s.rowLabel}>Sincronização</Text>
              <Text style={s.rowValue}>Organon API</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Token Bottom Sheet */}
      <BottomSheet
        visible={showTokenSheet}
        onClose={() => setShowTokenSheet(false)}
        title="Token da API"
        onSave={handleSaveToken}
      >
        <FormInput
          label="URL da API (opcional)"
          value={baseUrlInput}
          onChangeText={setBaseUrlInput}
          placeholder="https://reolicodeapi.com"
          autoCapitalize="none"
          keyboardType="url"
        />
        <FormInput
          label="Token"
          value={tokenInput}
          onChangeText={setTokenInput}
          placeholder="Cole seu token aqui"
          secureTextEntry={true}
          autoFocus={true}
        />

        {tokenError ? (
          <View style={{ backgroundColor: '#ef444420', borderRadius: 8, padding: 10, marginTop: 4 }}>
            <Text style={{ color: '#ef4444', fontSize: 13 }}>{tokenError}</Text>
          </View>
        ) : null}

        {isSaving && (
          <Text style={{ color: theme.text + '60', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
            Validando token...
          </Text>
        )}

        <View style={{ height: 20 }} />
      </BottomSheet>
    </SafeAreaView>
  )
}
