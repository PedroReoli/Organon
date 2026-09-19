import { useEffect, useRef } from 'react'
import { applyTheme, isElectron } from '@utils'
import { THEMES } from '@types'

export interface AppLifecycleProps {
  settings: any
  apps: any[]
  isLoading: boolean
  purgeOldTrash: () => void
  setShowInstaller: (val: boolean) => void
  setShowUpdateModal: (val: boolean) => void
}

export function useAppLifecycle({
  settings,
  apps,
  isLoading,
  purgeOldTrash,
  setShowInstaller,
  setShowUpdateModal,
}: AppLifecycleProps) {
  // Verificação inicial do instalador
  useEffect(() => {
    const checkInstaller = async () => {
      try {
        if (!isElectron()) {
          setShowInstaller(false)
          return
        }
        const isPackaged = await window.electronAPI.isPackaged?.()
        if (!isPackaged) {
          setShowInstaller(false)
          return
        }
        const isCompleted = await window.electronAPI.isInstallerCompleted?.()
        setShowInstaller(!isCompleted)
      } catch {
        setShowInstaller(false)
      }
    }
    checkInstaller()
  }, [setShowInstaller])

  // Aplicação de tema
  useEffect(() => {
    const theme = (THEMES as Record<string, any>)[settings.themeName]
    if (theme) applyTheme(theme)
  }, [settings.themeName])

  // Listener do popup do Super Whisper
  useEffect(() => {
    if (!isElectron()) return
    if (!window.electronAPI?.onSuperWhisperTranscript) return

    const handler = (text: string) => {
      if (!text || !text.trim()) return
      window.dispatchEvent(new CustomEvent('transcript:send-to-ai', { detail: { text } }))
      window.dispatchEvent(new CustomEvent('chatbot:open', { detail: { text } }))
    }

    window.electronAPI.onSuperWhisperTranscript(handler)
    return () => {
      window.electronAPI.offSuperWhisperTranscript?.()
    }
  }, [])

  // Auto-purge da lixeira no startup
  useEffect(() => {
    purgeOldTrash()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Verificação silenciosa de atualizações no startup (após 5s)
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await (window as any).electronAPI?.checkForUpdates?.()
        if (res?.updateAvailable) {
          setShowUpdateModal(true)
        }
      } catch {
        // Ignora erros na verificação silenciosa
      }
    }, 5000)
    return () => clearTimeout(timer)
  }, [setShowUpdateModal])

  // Auto-launch on boot
  const autoLaunchRanRef = useRef(false)
  useEffect(() => {
    if (autoLaunchRanRef.current) return
    if (isLoading) return
    if (!isElectron()) return
    if (apps.length === 0) return
    autoLaunchRanRef.current = true
    const targets = apps.filter((a) => a.autoLaunch === true && a.exePath)
    if (targets.length === 0) return
    targets.forEach((app, idx) => {
      setTimeout(() => {
        window.electronAPI?.launchExe?.(app.exePath).catch(() => {})
      }, idx * 2000)
    })
  }, [isLoading, apps])
}
