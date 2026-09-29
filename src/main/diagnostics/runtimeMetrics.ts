import { app, BrowserWindow, ipcMain, webContents } from 'electron'

type RuntimeEvent = {
  name: string
  at: string
  details?: Record<string, unknown>
}

const events: RuntimeEvent[] = []
const durationSamples = new Map<string, number[]>()
const counters = new Map<string, number>()
let activeWhisperRecorders = 0
let eventLoopMonitor: NodeJS.Timeout | null = null

const pushEvent = (event: RuntimeEvent): void => {
  events.push(event)
  if (events.length > 250) events.splice(0, events.length - 250)
}

export function recordRuntimeEvent(name: string, details?: Record<string, unknown>): void {
  const normalizedName = String(name || '').slice(0, 80)
  if (!normalizedName) return
  counters.set(normalizedName, (counters.get(normalizedName) || 0) + 1)
  if (normalizedName === 'whisper.recorder.started') activeWhisperRecorders += 1
  if (normalizedName === 'whisper.recorder.stopped' || normalizedName === 'whisper.recorder.error') {
    activeWhisperRecorders = Math.max(0, activeWhisperRecorders - 1)
  }
  pushEvent({ name: normalizedName, at: new Date().toISOString(), details })
}

export function recordRuntimeDuration(name: string, durationMs: number): void {
  if (!Number.isFinite(durationMs) || durationMs < 0) return
  const samples = durationSamples.get(name) || []
  samples.push(durationMs)
  if (samples.length > 500) samples.splice(0, samples.length - 500)
  durationSamples.set(name, samples)
}

const percentile = (samples: number[], percentileValue: number): number => {
  if (!samples.length) return 0
  const ordered = [...samples].sort((a, b) => a - b)
  return Math.round(ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * percentileValue) - 1)] * 100) / 100
}

export async function getRuntimeMetrics(): Promise<Record<string, unknown>> {
  const mainMemory = await process.getProcessMemoryInfo()
  const durations = Object.fromEntries([...durationSamples.entries()].map(([name, samples]) => [name, {
    samples: samples.length,
    p50Ms: percentile(samples, 0.5),
    p95Ms: percentile(samples, 0.95),
    p99Ms: percentile(samples, 0.99),
  }]))
  return {
    capturedAt: new Date().toISOString(),
    appVersion: app.getVersion(),
    windows: BrowserWindow.getAllWindows().length,
    webContents: webContents.getAllWebContents().length,
    activeWhisperRecorders,
    mainMemory,
    processes: app.getAppMetrics().map(metric => ({
      pid: metric.pid,
      type: metric.type,
      cpu: metric.cpu,
      memory: metric.memory,
    })),
    counters: Object.fromEntries(counters),
    durations,
    recentEvents: events.slice(-100),
  }
}

const RENDERER_EVENT_ALLOWLIST = new Set([
  'whisper.recorder.started',
  'whisper.recorder.stopped',
  'whisper.recorder.error',
])

export function registerRuntimeMetricsIpc(): void {
  if (!eventLoopMonitor) {
    let expectedAt = performance.now() + 1000
    eventLoopMonitor = setInterval(() => {
      const now = performance.now()
      recordRuntimeDuration('eventLoop.lag', Math.max(0, now - expectedAt))
      expectedAt = now + 1000
    }, 1000)
    eventLoopMonitor.unref()
  }
  ipcMain.handle('diagnostics:runtimeMetrics', () => getRuntimeMetrics())
  ipcMain.handle('diagnostics:runtimeEvent', (_event, name: string, details?: Record<string, unknown>) => {
    if (!RENDERER_EVENT_ALLOWLIST.has(name)) throw new Error('Evento de diagnostico nao permitido.')
    recordRuntimeEvent(name, details)
    return true
  })
}
