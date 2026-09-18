import { clipboard } from 'electron'
import type { BrowserWindow } from 'electron'

let lastContent = ''
let pollInterval: ReturnType<typeof setInterval> | null = null

export const startClipboardMonitor = (getWindow: () => BrowserWindow | null): void => {
  if (pollInterval) return
  lastContent = clipboard.readText()
  pollInterval = setInterval(() => {
    try {
      const text = clipboard.readText()
      if (!text || text === lastContent || text.length > 50000) return
      lastContent = text
      getWindow()?.webContents.send('clipboard:new-content', text)
    } catch { /* ignore */ }
  }, 1500)
}

export const stopClipboardMonitor = (): void => {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null }
}
