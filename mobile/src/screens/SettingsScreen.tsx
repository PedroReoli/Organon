import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { useAppwriteContext } from '../hooks/useAppwriteContext'
import { organonApi, getOrganonConfig } from '../api/organon'
import { THEMES, THEME_LABELS, type ThemeName } from '../types'

const THEME_NAMES = Object.keys(THEMES) as ThemeName[]

const SYNC_STATUS_COLORS = {
  idle: '#6b7280', pending: '#f97316', syncing: '#3b82f6', synced: '#22c55e', error: '#ef4444',
} as const

const SYNC_STATUS_LABELS = {
  idle: 'Aguardando alterações',
  pending: 'Aguardando 10s...',
  syncing: 'Sincronizando...',
  synced: 'Sincronizado',
  error: 'Erro na sincronização',
} as const

export function SettingsScreen() {
  const theme = useTheme()
  const { store, updateSettings } = useStore()
  const { isConfigured, syncStatus } = useAppwriteContext()

  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')

  useEffect(() => {
    if (isConfigured) {
      organonApi.ping().then(ok => setPingStatus(ok ? 'ok' : 'error'))
    }
  }, [isConfigured])

  const handlePing = async () => {
    setPingStatus('testing')
    const ok = await organonApi.ping()
    setPingStatus(ok ? 'ok' : 'error')
  }

  const connectivityColor = !isConfigured ? '#6b7280'
    : pingStatus === 'ok' ? '#22c55e'
    : pingStatus === 'error' ? '#ef4444'
    : '#6b7280'

  const connectivityLabel = !isConfigured ? 'API não configurada'
    : pingStatus === 'ok' ? 'Conectado à API Organon'
    : pingStatus === 'error' ? 'Sem conexão com a API'
    : pingStatus === 'testing' ? 'Testando...'
    : 'Verificando...'

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
    themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 12, backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.text + '12' },
    themeCard: { width: '48.5%', borderRadius: 12, borderWidth: 1, padding: 10, minHeight: 96, justifyContent: 'space-between' },
    themeCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
    themeCardName: { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 16 },
    themeActiveBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    themePreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    themeSwatch: { width: 18, height: 18, borderRadius: 6, borderWidth: 1 },
    cloudCard: { backgroundColor: theme.surface, borderRadius: 12, padding: 14, marginBottom: 8 },
    cloudRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cloudTitle: { color: theme.text + '50', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
    cloudValue: { color: theme.text, fontSize: 14 },
    cloudSub: { color: theme.text + '40', fontSize: 12, marginTop: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    pingBtn: { marginTop: 12, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 8, backgroundColor: theme.primary + '18', alignItems: 'center' },
    pingBtnTxt: { color: theme.primary, fontSize: 14, fontWeight: '600' },
    accountCard: { backgroundColor: theme.surface, borderRadius: 12, padding: 16 },
    avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.primary + '22', alignItems: 'center', justifyContent: 'center' },
    accountName: { color: theme.text, fontSize: 16, fontWeight: '700' },
    accountSub: { color: theme.text + '50', fontSize: 12, marginTop: 2 },
    comingSoon: { fontSize: 10, color: theme.text + '40', marginLeft: 6, backgroundColor: theme.text + '14', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
    disabledBtn: { marginTop: 10, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.text + '18', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', opacity: 0.5 },
    disabledBtnTxt: { color: theme.text + '80', fontSize: 14 },
  })

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Configurações" />

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Conta */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Conta</Text>
          <View style={s.accountCard}>
            <View style={[s.cloudRow, { marginBottom: 14 }]}>
              <View style={s.avatar}>
                <Feather name="user" size={24} color={theme.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={s.accountName}>Organon Personal</Text>
                <Text style={s.accountSub}>Local + sincronização via API</Text>
              </View>
            </View>
            <Text style={{ color: theme.text + '40', fontSize: 12, marginBottom: 12, lineHeight: 17 }}>
              Login com Google e criação de conta chegam em breve.
            </Text>
            <View style={[s.disabledBtn, { marginTop: 0 }]}>
              <Text style={s.disabledBtnTxt}>Entrar com Google</Text>
              <Text style={s.comingSoon}>Em breve</Text>
            </View>
            <View style={s.disabledBtn}>
              <Text style={s.disabledBtnTxt}>Criar conta</Text>
              <Text style={s.comingSoon}>Em breve</Text>
            </View>
          </View>
        </View>

        {/* Nuvem */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Nuvem</Text>

          <View style={s.cloudCard}>
            <Text style={s.cloudTitle}>CONECTIVIDADE</Text>
            <View style={s.cloudRow}>
              <View style={[s.dot, { backgroundColor: connectivityColor }]} />
              <Text style={s.cloudValue}>{connectivityLabel}</Text>
            </View>
            <Text style={s.cloudSub}>{getOrganonConfig().baseUrl}</Text>
            <TouchableOpacity
              style={[s.pingBtn, (!isConfigured || pingStatus === 'testing') && { opacity: 0.4 }]}
              onPress={handlePing}
              disabled={!isConfigured || pingStatus === 'testing'}
            >
              <Text style={s.pingBtnTxt}>{pingStatus === 'testing' ? 'Testando...' : 'Testar conexão'}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.cloudCard}>
            <Text style={s.cloudTitle}>SINCRONIZAÇÃO</Text>
            <View style={s.cloudRow}>
              <View style={[s.dot, { backgroundColor: SYNC_STATUS_COLORS[syncStatus] }]} />
              <Text style={s.cloudValue}>{SYNC_STATUS_LABELS[syncStatus]}</Text>
            </View>
            <Text style={s.cloudSub}>Dados enviados 10s após cada alteração</Text>
          </View>
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
    </SafeAreaView>
  )
}
