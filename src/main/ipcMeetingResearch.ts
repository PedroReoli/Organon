import { ipcMain, WebContents } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { researchMeeting, MeetingResearchRequest } from './meetingResearch'
import { meetingAgentStatus } from './meetingCodexRunner'
import { isPathSafe, isFileSensitiveOrBinary } from './workspaceSafetyGuard'

const jobs = new Map<number, Map<string, AbortController>>()
const watchers = new Map<number, () => void>()
const observed = new Set<number>()
function observe(sender: WebContents) {
  if (observed.has(sender.id)) return
  observed.add(sender.id)
  sender.once('destroyed', () => { jobs.get(sender.id)?.forEach(job => job.abort()); jobs.delete(sender.id); watchers.get(sender.id)?.(); watchers.delete(sender.id); observed.delete(sender.id) })
}
export function registerMeetingResearchIpc() {
  ipcMain.handle('meeting-agent:status', () => meetingAgentStatus())
  ipcMain.handle('meeting-agent:run', async (event, req: MeetingResearchRequest) => {
    if (!req || typeof req.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(req.id)) throw new Error('Identificador de pesquisa inválido.')
    observe(event.sender)
    const ownerJobs = jobs.get(event.sender.id) || new Map<string, AbortController>()
    if (ownerJobs.size >= 1 || [...jobs.values()].reduce((sum, items) => sum + items.size, 0) >= 3) throw new Error('Há uma pesquisa em andamento. Aguarde ou cancele antes de iniciar outra.')
    const controller = new AbortController(); ownerJobs.set(req.id, controller); jobs.set(event.sender.id, ownerJobs)
    try {
      return await researchMeeting(req, controller.signal, stage => { if (!event.sender.isDestroyed()) event.sender.send('meeting-agent:progress', { id: req.id, stage }) })
    } finally { ownerJobs.delete(req.id) }
  })
  ipcMain.handle('meeting-agent:cancel', (event, id: string) => { const job = jobs.get(event.sender.id)?.get(id); job?.abort(); return !!job })
  ipcMain.handle('meeting-agent:watch', (event, root?: string) => {
    watchers.get(event.sender.id)?.(); watchers.delete(event.sender.id)
    if (!root) return { watching: false }
    const resolved = fs.realpathSync(root)
    if (!fs.statSync(resolved).isDirectory()) throw new Error('Pasta de pesquisa inválida.')
    observe(event.sender)
    let timer: NodeJS.Timeout | undefined
    const changed = new Set<string>()
    const watcher = fs.watch(resolved, { recursive: true }, (_kind, filename) => {
      if (!filename) return
      const relative = filename.toString()
      if (isFileSensitiveOrBinary(relative) || !isPathSafe(resolved, fs.existsSync(path.join(resolved, relative)) ? path.join(resolved, relative) : path.dirname(path.join(resolved, relative)))) return
      changed.add(relative)
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        if (!event.sender.isDestroyed()) event.sender.send('meeting-agent:files-changed', { root: resolved, files: [...changed].slice(0, 20), at: new Date().toISOString() })
        changed.clear()
      }, 1800)
    })
    watcher.on('error', () => { if (!event.sender.isDestroyed()) event.sender.send('meeting-agent:files-changed', { root: resolved, files: [], error: 'O acompanhamento da pasta foi interrompido. Vincule novamente.' }) })
    watchers.set(event.sender.id, () => { if (timer) clearTimeout(timer); watcher.close() })
    return { watching: true }
  })
}
