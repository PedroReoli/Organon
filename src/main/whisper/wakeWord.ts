import { ipcMain } from 'electron'
import { showSuperWhisperWindow } from '../core/tray'
import { getMainWindow } from '../core/window'

export interface WakeWordConfig {
  enabled: boolean
  keyword: string // ex: "Organon" ou "Ei Organon"
  sensitivity: number // 0.1 a 1.0
}

let currentConfig: WakeWordConfig = {
  enabled: false,
  keyword: 'Organon',
  sensitivity: 0.7,
}

export function registerWakeWordIpc(): void {
  // Obter configurações ativas de Wake Word
  ipcMain.handle('wakeword:getConfig', async () => {
    return currentConfig
  })

  // Atualizar configurações de Wake Word
  ipcMain.handle('wakeword:setConfig', async (_event, newConfig: Partial<WakeWordConfig>) => {
    currentConfig = { ...currentConfig, ...newConfig }
    console.log('[WakeWord] Configuração atualizada:', currentConfig)
    return currentConfig
  })

  // Evento disparado quando a palavra-chave é detectada via voz
  ipcMain.handle('wakeword:trigger', async () => {
    console.log(`[WakeWord] Palavra-chave "${currentConfig.keyword}" detectada via voz!`)

    // Abre a janela do Super Whisper ou foca a janela principal
    showSuperWhisperWindow()

    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.show()
      win.focus()
    }

    return { triggered: true }
  })
}
