import React, { useMemo, useRef, useState } from 'react'
import type { KeyboardShortcut, RegisteredIDE, ThemeName } from '@types'
import { DEFAULT_SETTINGS } from '@types'
import { isElectron } from '@utils'
import type { SettingsViewProps } from '@types'
import type { PingDiagnostics } from '../../../../../api/organon'

export const useSettingsView = (props: SettingsViewProps) => {
  const { settings, onUpdateSettings, onAddRegisteredIDE, onUpdateRegisteredIDE, syncError } = props

  // Nav
  const [activeSection, setActiveSection] = useState('theme')

  // Cloud ping
  const [pingStatus, setPingStatus]   = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [pingReport, setPingReport]   = useState<PingDiagnostics | null>(null)

  // Auth form
  const [authTab,             setAuthTab]             = useState<'login' | 'register'>('login')
  const [authEmail,           setAuthEmail]           = useState('')
  const [authPassword,        setAuthPassword]        = useState('')
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState('')
  const [showAuthPassword,    setShowAuthPassword]    = useState(false)
  const [authLocalError,      setAuthLocalError]      = useState<string | null>(null)
  const [authName,            setAuthName]            = useState('')
  const [authSubmitting,      setAuthSubmitting]      = useState(false)

  // Profile edit
  const [editingProfileName, setEditingProfileName] = useState(false)
  const [profileNameDraft,   setProfileNameDraft]   = useState('')
  const [profileSaving,      setProfileSaving]      = useState(false)
  const profilePhotoInputRef = useRef<HTMLInputElement>(null)

  // IDE form
  const [showIdeForm,   setShowIdeForm]   = useState(false)
  const [ideFormName,   setIdeFormName]   = useState('')
  const [ideFormExePath,setIdeFormExePath]= useState('')
  const [ideFormArgs,   setIdeFormArgs]   = useState('"{folder}"')
  const [ideFormIcon,   setIdeFormIcon]   = useState<string | null>(null)
  const [editingIdeId,  setEditingIdeId]  = useState<string | null>(null)

  // Reset confirm
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Shortcuts
  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(null)

  // Theme carousel
  const themeCarouselRef = useRef<HTMLDivElement>(null)

  // ── Computed ──────────────────────────────────────────────────────────────

  const shortcuts = useMemo(() => {
    const defaults = DEFAULT_SETTINGS.keyboardShortcuts ?? []
    const saved    = settings.keyboardShortcuts ?? []
    const byId     = new Map(saved.map(s => [s.id, s]))
    return defaults.map(d => {
      const c = byId.get(d.id)
      return c ? { ...d, ...c, keys: c.keys } : d
    })
  }, [settings.keyboardShortcuts])

  const syncErrorLines = useMemo(
    () => (syncError ?? '').split(/\r?\n/).map(l => l.trim()).filter(Boolean),
    [syncError],
  )
  const syncErrorSummary = syncErrorLines[0] ?? ''
  const syncErrorTime    = syncErrorLines.find(l => l.startsWith('Horário:')) ?? ''
  const syncErrorRows    = useMemo(
    () => syncErrorLines.filter(l => l.startsWith('[')).map(line => {
      const m = line.match(/\[([^\]]+)\]\s+lote\s+(\d+)\/(\d+)\s+\|\s+HTTP\s+(\S+)\s+\|\s+(\d+)\s+item.*?\|\s+(.+)/)
      if (!m) return { raw: line, resource: '', batchIdx: '', totalBatches: '', status: '', count: '', message: line }
      const [, resource, batchIdx, totalBatches, status, count, message] = m
      return { raw: line, resource, batchIdx, totalBatches, status, count, message }
    }),
    [syncErrorLines],
  )

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handlePing = async () => {
    setPingStatus('testing')
    setPingReport(null)
    try {
      const { organonApi } = await import('../../../../../api/organon')
      const report = await organonApi.pingDetailed()
      setPingReport(report)
      setPingStatus(report.ok ? 'ok' : 'error')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao testar conexão.'
      setPingReport({
        ok: false,
        baseUrl: settings.apiBaseUrl || 'https://reolicodeapi.com',
        checkedAt: new Date().toISOString(),
        message,
        attempts: [],
      })
      setPingStatus('error')
    }
  }

  const handleSaveProfileName = async () => {
    if (!profileNameDraft.trim() && !props.authUser?.name) return
    setProfileSaving(true)
    const ok = await props.onUpdateProfile?.({ name: profileNameDraft.trim() || undefined })
    if (ok !== false) setEditingProfileName(false)
    setProfileSaving(false)
  }

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { props.onUpdateProfilePhoto?.(ev.target?.result as string) }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const resetIdeForm = () => {
    setIdeFormName('')
    setIdeFormExePath('')
    setIdeFormArgs('"{folder}"')
    setIdeFormIcon(null)
    setEditingIdeId(null)
    setShowIdeForm(false)
  }

  const handlePickIdeExe = async () => {
    if (!isElectron()) return
    try {
      const result = await window.electronAPI.selectExe()
      if (result) {
        setIdeFormExePath(result.exePath)
        if (result.iconDataUrl) setIdeFormIcon(result.iconDataUrl)
        if (!ideFormName.trim()) {
          const filename = result.exePath.replace(/\\/g, '/').split('/').pop() ?? ''
          setIdeFormName(filename.replace(/\.exe$/i, ''))
        }
      }
    } catch { /* noop */ }
  }

  const handleSaveIde = () => {
    if (!ideFormName.trim() || !ideFormExePath.trim()) return
    const payload = {
      name: ideFormName.trim(),
      exePath: ideFormExePath.trim(),
      args: ideFormArgs.trim() || '"{folder}"',
      iconDataUrl: ideFormIcon,
    }
    if (editingIdeId) {
      onUpdateRegisteredIDE(editingIdeId, payload)
    } else {
      onAddRegisteredIDE(payload)
    }
    resetIdeForm()
  }

  const handleEditIde = (ide: RegisteredIDE) => {
    setEditingIdeId(ide.id)
    setIdeFormName(ide.name)
    setIdeFormExePath(ide.exePath)
    setIdeFormArgs(ide.args)
    setIdeFormIcon(ide.iconDataUrl ?? null)
    setShowIdeForm(true)
  }

  const handleSaveShortcut = (shortcutId: string, newKeys: KeyboardShortcut['keys']) => {
    onUpdateSettings({ keyboardShortcuts: shortcuts.map(s => s.id === shortcutId ? { ...s, keys: newKeys } : s) })
    setEditingShortcutId(null)
  }

  const handleResetShortcut = (shortcutId: string) => {
    const def = DEFAULT_SETTINGS.keyboardShortcuts?.find(s => s.id === shortcutId)
    if (def) handleSaveShortcut(shortcutId, def.keys)
  }

  const handleSelectTheme = (themeName: ThemeName) => {
    if (!document.startViewTransition) {
      onUpdateSettings({ themeName })
      return
    }
    const style = document.createElement('style')
    style.textContent = `
      ::view-transition-old(root), ::view-transition-new(root) {
        animation: none;
        mix-blend-mode: normal;
      }
      ::view-transition-old(root) { z-index: 1; }
      ::view-transition-new(root) {
        z-index: 2;
        animation: themeWipe 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      }
      @keyframes themeWipe {
        0% { clip-path: circle(0% at 50% 50%); }
        100% { clip-path: circle(150% at 50% 50%); }
      }
    `
    document.head.appendChild(style)
    const transition = document.startViewTransition(() => {
      onUpdateSettings({ themeName })
    })
    transition.finished.finally(() => {
      document.head.removeChild(style)
    })
  }

  const scrollThemes = (direction: 'left' | 'right') => {
    if (!themeCarouselRef.current) return
    const amount = (180 + 16) * 3
    const cur    = themeCarouselRef.current.scrollLeft
    themeCarouselRef.current.scrollTo({
      left: direction === 'left' ? Math.max(0, cur - amount) : cur + amount,
      behavior: 'smooth',
    })
  }

  const handleDownloadSyncErrorReport = () => {
    if (!syncError) return
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const text  = ['Relatório de erro de sincronização', `Gerado em: ${new Date().toLocaleString('pt-BR')}`, '', syncError].join('\n')
    const blob  = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url   = URL.createObjectURL(blob)
    const a     = document.createElement('a')
    a.href = url
    a.download = `relatorio-sync-erro-${stamp}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return {
    activeSection, setActiveSection,
    pingStatus, pingReport, handlePing,
    authTab, setAuthTab,
    authEmail, setAuthEmail,
    authPassword, setAuthPassword,
    authPasswordConfirm, setAuthPasswordConfirm,
    showAuthPassword, setShowAuthPassword,
    authLocalError, setAuthLocalError,
    authName, setAuthName,
    authSubmitting, setAuthSubmitting,
    editingProfileName, setEditingProfileName,
    profileNameDraft, setProfileNameDraft,
    profileSaving, profilePhotoInputRef,
    handleSaveProfileName, handleProfilePhotoChange,
    showIdeForm, setShowIdeForm,
    ideFormName, setIdeFormName,
    ideFormExePath, setIdeFormExePath,
    ideFormArgs, setIdeFormArgs,
    ideFormIcon, setIdeFormIcon,
    editingIdeId, resetIdeForm, handlePickIdeExe, handleSaveIde, handleEditIde,
    showResetConfirm, setShowResetConfirm,
    editingShortcutId, setEditingShortcutId,
    shortcuts, handleSaveShortcut, handleResetShortcut,
    themeCarouselRef, scrollThemes, handleSelectTheme,
    syncErrorSummary, syncErrorTime, syncErrorRows, handleDownloadSyncErrorReport,
  }
}
