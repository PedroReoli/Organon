import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { Header } from '../components/shared/Header'
import { BottomSheet } from '../components/shared/BottomSheet'
import { FormInput } from '../components/shared/FormInput'
import { useStore } from '../hooks/useMobileStore'
import { useTheme } from '../hooks/useTheme'
import { useAppwriteContext } from '../hooks/useAppwriteContext'
import { downloadStore } from '../api/sync'
import { THEMES, THEME_LABELS, type ThemeName } from '../types'

const THEME_NAMES = Object.keys(THEMES) as ThemeName[]

const SYNC_STATUS_LABELS = {
  idle: 'Sincronizado',
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

export function SettingsScreen() {
  const theme = useTheme()
  const { store, updateSettings, loadStore } = useStore()
  const { user, isLoadingAuth, authError, syncStatus, login, register, logout, clearAuthError } = useAppwriteContext()

  const [showAuthSheet, setShowAuthSheet] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleDownloadNow = async () => {
    if (!user) return
    setDownloading(true)
    try {
      const cloudStore = await downloadStore(user.$id)
      if (cloudStore) {
        loadStore(cloudStore)
        Alert.alert('Sincronizado!', 'Dados da nuvem carregados com sucesso.')
      } else {
        Alert.alert('Nenhum dado', 'Nenhum backup encontrado na nuvem para esta conta.')
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível baixar os dados. Verifique sua conexão.')
    } finally {
      setDownloading(false)
    }
  }
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authLoading, setAuthLoading] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: '', password: '', name: '' })

  const handleLogin = async () => {
    if (!loginForm.email.trim() || !loginForm.password) return
    setAuthLoading(true)
    try {
      await login(loginForm.email.trim(), loginForm.password)
      setShowAuthSheet(false)
      setLoginForm({ email: '', password: '', name: '' })
    } catch { /* error shown via authError */ } finally {
      setAuthLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!loginForm.email.trim() || !loginForm.password || !loginForm.name.trim()) return
    setAuthLoading(true)
    try {
      await register(loginForm.email.trim(), loginForm.password, loginForm.name.trim())
      setShowAuthSheet(false)
      setLoginForm({ email: '', password: '', name: '' })
    } catch { /* error shown via authError */ } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => logout() },
    ])
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
    // Theme grid
    themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, backgroundColor: theme.surface, borderRadius: 12 },
    themeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 2, marginBottom: 4 },
    themeChipTxt: { fontSize: 12, fontWeight: '600' },
    // Auth
    authRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: theme.surface, borderRadius: 12 },
    authAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.primary + '30', alignItems: 'center', justifyContent: 'center' },
    authName: { flex: 1, color: theme.text, fontSize: 15, fontWeight: '500' },
    authEmail: { color: theme.text + '60', fontSize: 12 },
    loginBtn: { padding: 14, backgroundColor: theme.primary + '20', borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
    loginBtnTxt: { color: theme.primary, fontSize: 15, fontWeight: '600' },
    syncBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    syncBadgeTxt: { fontSize: 12, fontWeight: '600' },
  })

  return (
    <SafeAreaView style={s.screen}>
      <Header title="Configurações" />

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Account & Sync */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Conta e sincronização</Text>

          {isLoadingAuth ? (
            <Text style={{ color: theme.text + '50', padding: 14 }}>Verificando sessão...</Text>
          ) : user ? (
            <>
              <View style={s.authRow}>
                <View style={s.authAvatar}>
                  <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 16 }}>
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.authName} numberOfLines={1}>{user.name || 'Usuário'}</Text>
                  <Text style={s.authEmail} numberOfLines={1}>{user.email}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout}>
                  <Feather name="log-out" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <View style={[s.authRow, { marginTop: 8, justifyContent: 'space-between' }]}>
                <Text style={{ color: theme.text + '80', fontSize: 14 }}>Status da sincronização</Text>
                <View style={[s.syncBadge, { backgroundColor: SYNC_STATUS_COLORS[syncStatus] + '20' }]}>
                  <Text style={[s.syncBadgeTxt, { color: SYNC_STATUS_COLORS[syncStatus] }]}>
                    {SYNC_STATUS_LABELS[syncStatus]}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[s.loginBtn, { marginTop: 8, opacity: downloading ? 0.6 : 1 }]}
                onPress={handleDownloadNow}
                disabled={downloading}
              >
                <Feather name="download-cloud" size={16} color={theme.primary} />
                <Text style={s.loginBtnTxt}>{downloading ? 'Baixando...' : 'Baixar da nuvem agora'}</Text>
              </TouchableOpacity>

              <Text style={{ color: theme.text + '40', fontSize: 12, marginTop: 8, lineHeight: 17 }}>
                Sincronização automática a cada 10 segundos após uma alteração.
              </Text>
            </>
          ) : (
            <>
              <TouchableOpacity style={s.loginBtn} onPress={() => { clearAuthError(); setAuthMode('login'); setShowAuthSheet(true) }}>
                <Feather name="cloud" size={18} color={theme.primary} />
                <Text style={s.loginBtnTxt}>Entrar com Appwrite</Text>
              </TouchableOpacity>
              <Text style={{ color: theme.text + '40', fontSize: 12, marginTop: 8, lineHeight: 17 }}>
                O app funciona 100% offline. Faça login para sincronizar entre dispositivos.
              </Text>
            </>
          )}
        </View>

        {/* Appearance */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Aparência</Text>
          <View style={s.themeGrid}>
            {THEME_NAMES.map(name => {
              const t = THEMES[name]
              const active = store.settings.themeName === name
              return (
                <TouchableOpacity
                  key={name}
                  style={[s.themeChip, {
                    borderColor: active ? t.primary : theme.text + '20',
                    backgroundColor: active ? t.primary + '20' : 'transparent',
                  }]}
                  onPress={() => updateSettings({ themeName: name })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: t.primary }} />
                    <Text style={[s.themeChipTxt, { color: active ? t.primary : theme.text + '70' }]}>
                      {THEME_LABELS[name]}
                    </Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* General Preferences */}
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

        {/* About */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Sobre</Text>
          <View style={s.card}>
            <View style={s.row}>
              <Text style={s.rowLabel}>Organon Mobile</Text>
              <Text style={s.rowValue}>v1.0.0</Text>
            </View>
            <View style={[s.row, s.rowLast]}>
              <Text style={s.rowLabel}>Banco de dados</Text>
              <Text style={s.rowValue}>SQLite (local)</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Auth Bottom Sheet */}
      <BottomSheet
        visible={showAuthSheet}
        onClose={() => setShowAuthSheet(false)}
        title={authMode === 'login' ? 'Entrar' : 'Criar conta'}
        onSave={authMode === 'login' ? handleLogin : handleRegister}
      >
        {authMode === 'register' && (
          <FormInput
            label="Nome"
            value={loginForm.name}
            onChangeText={n => setLoginForm(f => ({ ...f, name: n }))}
            placeholder="Seu nome"
            autoFocus={authMode === 'register'}
          />
        )}
        <FormInput
          label="E-mail"
          value={loginForm.email}
          onChangeText={n => setLoginForm(f => ({ ...f, email: n }))}
          placeholder="email@exemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoFocus={authMode === 'login'}
        />
        <FormInput
          label="Senha"
          value={loginForm.password}
          onChangeText={n => setLoginForm(f => ({ ...f, password: n }))}
          placeholder="Mínimo 8 caracteres"
          secureTextEntry
        />

        {authError ? (
          <View style={{ backgroundColor: '#ef444420', borderRadius: 8, padding: 10, marginTop: 4 }}>
            <Text style={{ color: '#ef4444', fontSize: 13 }}>{authError}</Text>
          </View>
        ) : null}

        {authLoading && (
          <Text style={{ color: theme.text + '60', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
            {authMode === 'login' ? 'Entrando...' : 'Criando conta...'}
          </Text>
        )}

        <TouchableOpacity
          style={{ marginTop: 12, alignItems: 'center' }}
          onPress={() => { clearAuthError(); setAuthMode(m => m === 'login' ? 'register' : 'login') }}
        >
          <Text style={{ color: theme.primary, fontSize: 13 }}>
            {authMode === 'login' ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </BottomSheet>
    </SafeAreaView>
  )
}
