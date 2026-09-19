import { app, BrowserWindow, clipboard, ipcMain, shell } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'
import { execFile, spawn } from 'child_process'
import * as os from 'os'

import { createBackup, startBackupTimer, stopBackupTimer } from '../backup'
import {
  getConfig,
  getDataPath,
  getDedicatedDefaultDataPath,
  loadStore,
  loadStoreFromPath,
  normalizeStore,
  saveStore,
  getInstallerStatus,
  migrateToDedicatedStorage,
  assessCatastrophicDataLoss,
} from '../storage'
import { installWhisperModelBundle } from '../whisper'
import type { Canvas, Store, ThemeName } from '../types'
import { getMainWindow, openDirectoryPicker, openFolderPicker } from '../core'

export const registerCoreIpcHandlers = (): void => {
  // Start CLI Watcher for planning sync
  const startPlanningCliWatcher = () => {
    try {
      const dataDir = getDataPath()
      const syncFlag = path.join(dataDir, 'store', '.cli-sync-flag')
      if (fs.existsSync(path.dirname(syncFlag))) {
        fs.watch(path.dirname(syncFlag), (eventType, filename) => {
          if (filename === '.cli-sync-flag') {
             getMainWindow()?.webContents.send('planning:sync-cli')
          }
        })
      }
    } catch (e) {
      console.error("Could not start CLI watcher", e)
    }
  }

  // Start the watcher on boot
  setTimeout(startPlanningCliWatcher, 2000)

  ipcMain.handle('window:setContentProtection', (_event, enabled: boolean) => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.setContentProtection(enabled)
      return true
    }
    return false
  })
  ipcMain.handle('store:load', () => {
    return loadStore()
  })

  ipcMain.handle('store:save', (_event, store: Store) => {
    const normalized = normalizeStore(store)
    const current = loadStore()
    const assessment = assessCatastrophicDataLoss(current, normalized)
    if (assessment.blocked) {
      const safety = createBackup(getDataPath(), 'emergency')
      console.error('Gravacao bloqueada por risco de perda catastrofica:', { ...assessment, safety })
      return false
    }
    const saved = saveStore(normalized)
    const settings = normalized.settings
    const backupEnabled = settings.backupEnabled ?? false
    const backupInterval = settings.backupIntervalMinutes ?? 15

    if (backupEnabled && backupInterval > 0) {
      startBackupTimer(backupInterval)
    } else {
      stopBackupTimer()
    }

    return saved
  })

  ipcMain.handle('external:open', (_event, url: string) => {
    return shell.openExternal(url).then(() => true).catch(() => false)
  })

  ipcMain.handle('path:open', (_event, targetPath: string) => {
    return shell.openPath(targetPath).then(result => result === '')
  })

  ipcMain.handle('path:select', async () => {
    return openFolderPicker()
  })

  ipcMain.handle('path:readdir', (_event, dirPath: string) => {
    try {
      if (!dirPath) return []
      if (!fs.existsSync(dirPath)) return []
      const stat = fs.statSync(dirPath)
      if (!stat.isDirectory()) return []
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      return entries
        .map(entry => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
        }))
        .sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
          return a.name.localeCompare(b.name)
        })
    } catch {
      return []
    }
  })

  ipcMain.handle('path:rename', (_event, oldPath: string, newPath: string) => {
    try {
      if (!oldPath || !newPath) return false
      if (!fs.existsSync(oldPath)) return false
      fs.renameSync(oldPath, newPath)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('path:getFileUrl', (_event, absolutePath: string) => {
    if (!absolutePath) return ''
    const normalized = absolutePath.replace(/\\/g, '/')
    return `file:///${normalized}`
  })

  ipcMain.handle('clipboard:write', (_event, text: string) => {
    clipboard.writeText(text)
    return true
  })

  ipcMain.handle('data:getDir', () => {
    const config = getConfig()
    return {
      current: getDataPath(),
      custom: config.dataDir,
    }
  })

  ipcMain.handle('data:setDir', (_event, nextDir: string | null) => {
    const currentPath = getDataPath()
    const currentStore = loadStoreFromPath(currentPath)
    const normalized = nextDir && nextDir.trim().length > 0 ? nextDir.trim() : null
    const nextPath = normalized ?? getDedicatedDefaultDataPath()

    if (currentPath === nextPath) {
      return true
    }
    return migrateToDedicatedStorage(nextPath, currentStore.settings.themeName).success
  })

  ipcMain.handle('data:selectDir', async () => {
    return openDirectoryPicker()
  })

  ipcMain.handle('window:minimize', () => {
    getMainWindow()?.minimize()
  })

  ipcMain.handle('window:maximize', () => {
    const mainWindow = getMainWindow()
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })

  ipcMain.handle('window:close', () => {
    getMainWindow()?.close()
  })

  ipcMain.handle('window:isMaximized', () => {
    return getMainWindow()?.isMaximized() ?? false
  })

  ipcMain.handle('app:isPackaged', () => {
    return app.isPackaged
  })

  ipcMain.handle('app:isInstallerCompleted', () => {
    return getInstallerStatus().completed
  })

  ipcMain.handle('app:getInstallerStatus', () => {
    return getInstallerStatus()
  })

  // ── Canvas (armazenamento local, sem API) ───────────────────────────────────

  ipcMain.handle('canvas:list', () => {
    const store = loadStore()
    return store.canvases ?? []
  })

  ipcMain.handle('canvas:get', (_event, id: string) => {
    const store = loadStore()
    return (store.canvases ?? []).find(c => c.id === id) ?? null
  })

  ipcMain.handle('canvas:create', (_event, name?: string) => {
    const store = loadStore()
    const now = new Date().toISOString()
    const canvas: Canvas = {
      id: randomUUID(),
      name: name ?? 'Novo canvas',
      snapshot: {},
      thumbnail: null,
      createdAt: now,
      updatedAt: now,
    }
    store.canvases = [canvas, ...(store.canvases ?? [])]
    saveStore(normalizeStore(store))
    return canvas
  })

  ipcMain.handle('canvas:save', (_event, id: string, payload: { snapshot?: Record<string, unknown>; thumbnail?: string; name?: string }) => {
    const store = loadStore()
    const canvases = store.canvases ?? []
    const idx = canvases.findIndex(c => c.id === id)
    if (idx === -1) return null
    const updated: Canvas = {
      ...canvases[idx],
      ...(payload.name !== undefined      ? { name: payload.name }           : {}),
      ...(payload.snapshot !== undefined  ? { snapshot: payload.snapshot }   : {}),
      ...(payload.thumbnail !== undefined ? { thumbnail: payload.thumbnail } : {}),
      updatedAt: new Date().toISOString(),
    }
    canvases[idx] = updated
    store.canvases = canvases
    saveStore(normalizeStore(store))
    return updated
  })

  ipcMain.handle('canvas:delete', (_event, id: string) => {
    const store = loadStore()
    store.canvases = (store.canvases ?? []).filter(c => c.id !== id)
    saveStore(normalizeStore(store))
    return true
  })

  ipcMain.handle('app:completeInstaller', async (_event, dataDir: string | null, themeName: ThemeName) => {
    const migration = migrateToDedicatedStorage(dataDir, themeName)

    if (!migration.success) {
      return migration
    }

    try {
      const whisperInstall = await installWhisperModelBundle()
      if (whisperInstall.warnings.length > 0) {
        migration.warnings = [...(migration.warnings ?? []), ...whisperInstall.warnings]
      }
      if (whisperInstall.installed.length > 0) {
        migration.warnings = [
          ...(migration.warnings ?? []),
          `Pacote Whisper local instalado: ${whisperInstall.installed.map(model => model.id).join(', ')}`,
        ]
      }
      if (whisperInstall.skipped.length > 0 && !whisperInstall.installed.length) {
        migration.warnings = [
          ...(migration.warnings ?? []),
          `Pacote Whisper local já estava presente: ${whisperInstall.skipped.join(', ')}`,
        ]
      }
    } catch (error) {
      migration.warnings = [
        ...(migration.warnings ?? []),
        `Não foi possível instalar o pacote Whisper local: ${String(error)}`,
      ]
    }

    return migration
  })

  // ── Reports ────────────────────────────────────────────────────────────────

  ipcMain.handle('reports:readFile', (_event, filePath: string): string | null => {
    try {
      return fs.readFileSync(filePath, 'utf-8')
    } catch {
      return null
    }
  })

  const reportWatchers = new Map<string, fs.FSWatcher>()
  let reportWatcherDebounce: NodeJS.Timeout | null = null

  ipcMain.handle('reports:watch', (_event, dirPath: string) => {
    if (reportWatchers.has(dirPath)) return
    try {
      if (!fs.existsSync(dirPath)) return
      const w = fs.watch(dirPath, { persistent: false }, () => {
        if (reportWatcherDebounce) clearTimeout(reportWatcherDebounce)
        reportWatcherDebounce = setTimeout(() => {
          getMainWindow()?.webContents.send('reports:changed')
        }, 1200)
      })
      reportWatchers.set(dirPath, w)
    } catch {
      // diretório não existe ainda
    }
  })

  ipcMain.handle('reports:unwatch', (_event, dirPath: string) => {
    const w = reportWatchers.get(dirPath)
    if (w) {
      w.close()
      reportWatchers.delete(dirPath)
    }
  })

  // ── Reports: executar script Python ──────────────────────────────────────

  ipcMain.handle('reports:run', (_event, scriptPath: string): Promise<{ ok: boolean; output: string; error: string }> => {
    return new Promise((resolve) => {
      if (!scriptPath) {
        resolve({ ok: false, output: '', error: 'Caminho do script nao informado' })
        return
      }

      const configDir = path.dirname(scriptPath)
      let cmd: string
      let args: string[]
      let cwd: string

      if (fs.existsSync(scriptPath)) {
        const pythonCmd = os.platform() === 'win32' ? 'python' : 'python3'
        cmd = pythonCmd
        args = [scriptPath]
        cwd = configDir
      } else if (app.isPackaged) {
        const pyScript = path.join(process.resourcesPath, 'dist-python', 'generate_report.py')
        if (!fs.existsSync(pyScript)) {
          resolve({ ok: false, output: '', error: 'Script nao encontrado: ' + pyScript })
          return
        }
        const pythonCmd = os.platform() === 'win32' ? 'python' : 'python3'
        cmd = pythonCmd
        args = [pyScript]
        cwd = path.join(process.resourcesPath, 'dist-python')
      } else {
        const candidates = [
          path.resolve(process.cwd(), 'data', 'reports', 'generate_report.py'),
          path.resolve(__dirname, '..', '..', '..', '..', 'data', 'reports', 'generate_report.py'),
          path.resolve(__dirname, '..', '..', '..', '..', '..', 'data', 'reports', 'generate_report.py'),
        ]
        const devScript = candidates.find(c => fs.existsSync(c)) || candidates[0]
        if (fs.existsSync(devScript)) {
          const pythonCmd = os.platform() === 'win32' ? 'python' : 'python3'
          cmd = pythonCmd
          args = [devScript]
          cwd = path.dirname(devScript)
        } else {
          resolve({ ok: false, output: '', error: 'Script nao encontrado: ' + scriptPath + ' nem ' + devScript })
          return
        }
      }

      if (!fs.existsSync(cwd)) {
        fs.mkdirSync(cwd, { recursive: true })
      }

      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
      }

      const proc = spawn(cmd, args, {
        cwd,
        env: { ...process.env, REPORTS_BASE_DIR: configDir },
      })
      let stdout = ''
      let stderr = ''
      proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
      proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
      proc.on('close', (code) => {
        resolve({ ok: code === 0, output: stdout, error: stderr })
      })
      proc.on('error', (err) => {
        resolve({ ok: false, output: '', error: err.message })
      })
    })
  })

  ipcMain.handle('reports:lastRun', (_event, lastRunPath: string): string | null => {
    try {
      if (!fs.existsSync(lastRunPath)) return null
      return fs.readFileSync(lastRunPath, 'utf-8').trim()
    } catch {
      return null
    }
  })

  ipcMain.handle('reports:readConfig', (_event, configPath: string): Record<string, unknown> | null => {
    try {
      if (!fs.existsSync(configPath)) return null
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    } catch {
      return null
    }
  })

  ipcMain.handle('reports:writeConfig', (_event, configPath: string, config: Record<string, unknown>): boolean => {
    try {
      fs.mkdirSync(path.dirname(configPath), { recursive: true })
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('reports:scanRepos', (_event, rootPaths: string[]): { path: string; group: string; name: string }[] => {
    const results: { path: string; group: string; name: string }[] = []
    if (!rootPaths || rootPaths.length === 0) return results

    function scanDir(dir: string, rootPath: string, depth: number) {
      if (depth > 5) return
      try {
        const gitPath = path.join(dir, '.git')
        if (fs.existsSync(gitPath) && fs.statSync(gitPath).isDirectory()) {
          const rel = dir.replace(rootPath, '').replace(/^[\\/]/, '')
          const parts = rel.split(/[\\/]/).filter(Boolean)
          const group = parts.length > 1 ? parts[0] : path.basename(rootPath)
          const name = parts[parts.length - 1] || path.basename(dir)
          results.push({ path: dir, group, name })
          return // nao entra dentro de um repo
        }
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          if (!entry.isDirectory()) continue
          if (['node_modules', '.git', 'dist', 'build', '.cache'].includes(entry.name)) continue
          scanDir(path.join(dir, entry.name), rootPath, depth + 1)
        }
      } catch {
        // ignora erros de permissao
      }
    }

    for (const rootPath of rootPaths) {
      if (fs.existsSync(rootPath)) {
        scanDir(rootPath, rootPath, 0)
      }
    }

    return results.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
  })

  ipcMain.handle('git:exec', (_event, repoPath: string, args: string[]): Promise<{ ok: boolean; stdout: string; stderr: string }> => {
    return new Promise((resolve) => {
      if (!repoPath || !args || args.length === 0) {
        resolve({ ok: false, stdout: '', stderr: 'Argumentos inválidos' })
        return
      }
      execFile('git', ['-C', repoPath, ...args], { encoding: 'utf-8', timeout: 30000 }, (err, stdout, stderr) => {
        resolve({ ok: !err, stdout: stdout ?? '', stderr: stderr ?? '' })
      })
    })
  })

  // ── Git Live Status & Cache ──────────────────────────────────────────────
  const gitStatusCache = new Map<string, { timestamp: number; data: any }>()
  const GIT_CACHE_TTL = 15000 // 15s cache TTL

  const runGit = (repoPath: string, args: string[]): Promise<{ ok: boolean; stdout: string; stderr: string }> => {
    return new Promise((resolve) => {
      execFile('git', ['-C', repoPath, ...args], { encoding: 'utf-8', timeout: 15000 }, (err, stdout, stderr) => {
        resolve({ ok: !err, stdout: (stdout ?? '').trim(), stderr: (stderr ?? '').trim() })
      })
    })
  }

  ipcMain.handle('git:repoLiveStatus', async (_event, repoPath: string, forceRefresh = false) => {
    if (!repoPath || !fs.existsSync(repoPath)) {
      return { ok: false, error: 'Caminho inexistente' }
    }

    const cached = gitStatusCache.get(repoPath)
    if (!forceRefresh && cached && Date.now() - cached.timestamp < GIT_CACHE_TTL) {
      return { ok: true, ...cached.data, fromCache: true }
    }

    try {
      const branchRes = await runGit(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD'])
      const branch = branchRes.ok ? branchRes.stdout : 'HEAD'

      const statusRes = await runGit(repoPath, ['status', '--porcelain'])
      const statusLines = statusRes.stdout ? statusRes.stdout.split('\n').filter(Boolean) : []
      const isClean = statusLines.length === 0
      const modifiedCount = statusLines.length

      let ahead = 0
      let behind = 0
      const countsRes = await runGit(repoPath, ['rev-list', '--left-right', '--count', 'HEAD...@{u}'])
      if (countsRes.ok && countsRes.stdout) {
        const parts = countsRes.stdout.split(/\s+/)
        if (parts.length >= 2) {
          ahead = parseInt(parts[0], 10) || 0
          behind = parseInt(parts[1], 10) || 0
        }
      }

      const logRes = await runGit(repoPath, ['log', '-1', '--format=%h\t%s\t%cr\t%an'])
      let lastCommit = { hash: '', message: '', relativeTime: '', author: '', isConventional: true }
      if (logRes.ok && logRes.stdout) {
        const [hash, message, relativeTime, author] = logRes.stdout.split('\t')
        const conventionalRegex = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-zA-Z0-9_.-]+\))?: .+/
        lastCommit = {
          hash: hash || '',
          message: message || '',
          relativeTime: relativeTime || '',
          author: author || '',
          isConventional: conventionalRegex.test(message || '')
        }
      }

      const data = {
        branch,
        isClean,
        modifiedCount,
        ahead,
        behind,
        lastCommit
      }

      gitStatusCache.set(repoPath, { timestamp: Date.now(), data })
      return { ok: true, ...data, fromCache: false }
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Falha ao consultar Git' }
    }
  })

  ipcMain.handle('git:amendCommit', async (_event, repoPath: string, newMsg: string) => {
    if (!repoPath || !newMsg?.trim()) {
      return { ok: false, error: 'Caminho ou mensagem inválida' }
    }
    const res = await runGit(repoPath, ['commit', '--amend', '-m', newMsg.trim()])
    gitStatusCache.delete(repoPath)
    return { ok: res.ok, stdout: res.stdout, error: res.stderr }
  })

  ipcMain.handle('git:undoLastCommit', async (_event, repoPath: string) => {
    if (!repoPath) return { ok: false, error: 'Caminho inválido' }
    const res = await runGit(repoPath, ['reset', '--soft', 'HEAD~1'])
    gitStatusCache.delete(repoPath)
    return { ok: res.ok, stdout: res.stdout, error: res.stderr }
  })

  ipcMain.handle('git:cloudStatus', async (_event, repoPath: string, customToken?: string) => {
    if (!repoPath) return { ok: false, error: 'Caminho inválido' }
    try {
      const urlRes = await runGit(repoPath, ['config', '--get', 'remote.origin.url'])
      if (!urlRes.ok || !urlRes.stdout) {
        return { ok: true, isGitHub: false, hasRemote: false }
      }

      const url = urlRes.stdout
      const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/)
      if (!match) {
        return { ok: true, isGitHub: false, hasRemote: true, remoteUrl: url }
      }

      const owner = match[1]
      const repo = match[2]
      const token = customToken || process.env.GITHUB_TOKEN || process.env.GH_TOKEN

      const headers: Record<string, string> = {
        'User-Agent': 'Organon-Desktop',
        Accept: 'application/vnd.github.v3+json'
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      let ciStatus: 'success' | 'failure' | 'in_progress' | 'none' = 'none'
      try {
        const runsResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=1`, { headers })
        if (runsResp.ok) {
          const runsData = await runsResp.json() as any
          const latestRun = runsData?.workflow_runs?.[0]
          if (latestRun) {
            if (latestRun.status === 'in_progress') ciStatus = 'in_progress'
            else if (latestRun.conclusion === 'success') ciStatus = 'success'
            else if (latestRun.conclusion === 'failure') ciStatus = 'failure'
          }
        }
      } catch {}

      let openPrs = 0
      try {
        const prResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=10`, { headers })
        if (prResp.ok) {
          const prData = await prResp.json() as any
          if (Array.isArray(prData)) openPrs = prData.length
        }
      } catch {}

      return {
        ok: true,
        isGitHub: true,
        hasRemote: true,
        owner,
        repo,
        htmlUrl: `https://github.com/${owner}/${repo}`,
        ciStatus,
        openPrs
      }
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Erro ao consultar status na nuvem' }
    }
  })

  // ── Git Watcher ──────────────────────────────────────────────────────────
  let gitWatchers: fs.FSWatcher[] = []
  let gitWatcherDebounce: ReturnType<typeof setTimeout> | null = null

  ipcMain.handle('reports:startGitWatcher', (_event, baseDir: string): boolean => {
    // Stop existing watchers
    for (const w of gitWatchers) { try { w.close() } catch {} }
    gitWatchers = []

    const configPath = path.join(baseDir, 'reports-config.json')
    let cfg: { scanPaths?: string[]; scanRoots?: string[]; maxDepth?: number } = { maxDepth: 6 }

    if (fs.existsSync(configPath)) {
      try { cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8')) } catch {}
    }

    const repoPaths: string[] = []
    const maxDepth = cfg.maxDepth ?? 6

    function findRepos(dir: string, depth: number) {
      if (depth > maxDepth) return
      const gitDir = path.join(dir, '.git')
      if (fs.existsSync(gitDir) && fs.statSync(gitDir).isDirectory()) {
        repoPaths.push(gitDir)
        return
      }
      try {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue
          if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) continue
          findRepos(path.join(dir, entry.name), depth + 1)
        }
      } catch {}
    }

    const scanPaths = cfg.scanPaths ?? []
    if (scanPaths.length > 0) {
      for (const sp of scanPaths) { if (fs.existsSync(sp)) findRepos(sp, 0) }
    }

    // Fallback: se nao encontrou repos via config, tenta subir ate achar o repo atual
    if (repoPaths.length === 0) {
      let current = baseDir
      for (let i = 0; i < 5; i++) {
        const gitDir = path.join(current, '.git')
        if (fs.existsSync(gitDir) && fs.statSync(gitDir).isDirectory()) {
          repoPaths.push(gitDir)
          break
        }
        const parent = path.dirname(current)
        if (parent === current) break
        current = parent
      }
    }

    if (repoPaths.length === 0) return false

    const notifyChange = () => {
      if (gitWatcherDebounce) clearTimeout(gitWatcherDebounce)
      gitWatcherDebounce = setTimeout(() => {
        const wins = BrowserWindow.getAllWindows()
        for (const win of wins) {
          win.webContents.send('reports:gitChanged')
        }
      }, 3000)
    }

    for (const gitDir of repoPaths) {
      try {
        const headFile = path.join(gitDir, 'HEAD')
        if (fs.existsSync(headFile)) {
          const w = fs.watch(headFile, () => notifyChange())
          gitWatchers.push(w)
        }
        const refsHeads = path.join(gitDir, 'refs', 'heads')
        if (fs.existsSync(refsHeads)) {
          const w = fs.watch(refsHeads, { recursive: true }, () => notifyChange())
          gitWatchers.push(w)
        }
        // Detecta git pull/fetch
        const fetchHead = path.join(gitDir, 'FETCH_HEAD')
        if (fs.existsSync(fetchHead)) {
          const w = fs.watch(fetchHead, () => notifyChange())
          gitWatchers.push(w)
        }
        const refsRemotes = path.join(gitDir, 'refs', 'remotes')
        if (fs.existsSync(refsRemotes)) {
          const w = fs.watch(refsRemotes, { recursive: true }, () => notifyChange())
          gitWatchers.push(w)
        }
      } catch {}
    }

    return true
  })

  ipcMain.handle('reports:stopGitWatcher', (): void => {
    for (const w of gitWatchers) { try { w.close() } catch {} }
    gitWatchers = []
    if (gitWatcherDebounce) { clearTimeout(gitWatcherDebounce); gitWatcherDebounce = null }
  })
}
