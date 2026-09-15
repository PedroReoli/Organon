import { registerMeetingResearchIpc } from './ipcMeetingResearch'
import { downloadWhisperModel, getWhisperDownloadProgress } from './whisperModelInstaller'
import { app, ipcMain, shell } from 'electron'
import { exec, spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { randomUUID } from 'crypto'

import {
  getDataPath,
  safeResolveMeetingPath,
  safeResolveNotePath,
  writeTextFileAtomic,
} from './filesystem'
import { showOpenDialog } from './window'
import { listLocalModels, transcribeLocalAudio } from './whisperEngine'
import {
  listProjectFiles,
  readProjectFile,
  searchProjectText,
} from './workspaceSafetyGuard'
import { analyzeTranscriptSelection, generateTranscriptNote } from './transcriptAssistant'

const launchExe = (exePath: string): boolean => {
  try {
    const child = spawn(exePath, [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    })
    child.unref()
    return true
  } catch (error) {
    console.error('Erro ao abrir executavel:', error)
    return false
  }
}

const TEMP_TRANSCRIBE_DIR = path.join(os.tmpdir(), 'organon-whisper')

function resolveTranscriptionInput(input: string): { path: string; cleanup: boolean } {
  if (typeof input !== 'string' || !input.trim()) throw new Error('Áudio vazio.')
  const trimmed = input.trim()
  if (trimmed && fs.existsSync(trimmed) && fs.statSync(trimmed).isFile()) {
    return { path: trimmed, cleanup: false }
  }

  fs.mkdirSync(TEMP_TRANSCRIBE_DIR, { recursive: true })
  const tempPath = path.join(TEMP_TRANSCRIBE_DIR, `audio-${Date.now()}-${randomUUID()}.wav`)

  const normalizedBase64 = trimmed.startsWith('data:')
    ? trimmed.split(',', 2)[1] ?? ''
    : trimmed

  const bytes = Buffer.from(normalizedBase64, 'base64')
  if (bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') throw new Error('Áudio inválido: envie WAV PCM.')
  fs.writeFileSync(tempPath, bytes)
  return { path: tempPath, cleanup: true }
}

type TranscriptionRequestOptions = {
  initialPrompt?: string
  mode?: 'meeting' | 'interview' | 'prompt'
  hotwords?: string[]
  projectName?: string
}

function trimPrompt(value?: string): string {
  const text = (value || '').trim()
  if (text.length <= 760) return text
  return `${text.slice(0, 759).trimEnd()}...`
}

function stripHtmlTags(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

async function searchWeb(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const cleaned = query?.trim() || ''
  if (cleaned.length < 2) return []

  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleaned)}`
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    })

    if (!response.ok) return []

    const html = await response.text()
    const results: Array<{ title: string; url: string; snippet: string }> = []
    const blockRegex = /<div class="result__body">([\s\S]*?)<\/div>\s*<\/div>/g
    let blockMatch: RegExpExecArray | null

    while ((blockMatch = blockRegex.exec(html)) && results.length < 5) {
      const block = blockMatch[1]
      const linkMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
      if (!linkMatch) continue

      const rawUrl = linkMatch[1]
      const title = stripHtmlTags(linkMatch[2])
      const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/) ||
        block.match(/<div[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/div>/)

      let decodedUrl = rawUrl
      try {
        const parsed = new URL(rawUrl, 'https://duckduckgo.com')
        const redirected = parsed.searchParams.get('uddg')
        if (redirected) decodedUrl = decodeURIComponent(redirected)
      } catch {}

      results.push({
        title: title || cleaned,
        url: decodedUrl,
        snippet: stripHtmlTags(snippetMatch?.[1] || `Busca para "${cleaned}".`),
      })
    }

    return results
  } catch (error) {
    console.warn('Erro na busca web:', error)
    return []
  }
}

export const registerContentIpcHandlers = (): void => {
  registerMeetingResearchIpc()
  ipcMain.handle('project:selectFolder', async () => {
    try {
      const result = await showOpenDialog({
        title: 'Selecionar pasta do projeto local (Somente Leitura)',
        properties: ['openDirectory'],
      })
      if (result.canceled || result.filePaths.length === 0) return null
      const selectedPath = result.filePaths[0]
      return {
        name: path.basename(selectedPath),
        path: selectedPath,
      }
    } catch {
      return null
    }
  })

  ipcMain.handle('project:listFiles', (_event, projectPath: string) => {
    return listProjectFiles(projectPath)
  })

  ipcMain.handle('project:readFile', (_event, projectPath: string, relativePath: string) => {
    return readProjectFile(projectPath, relativePath)
  })

  ipcMain.handle('project:searchText', (_event, projectPath: string, query: string) => {
    return searchProjectText(projectPath, query)
  })

  ipcMain.handle('web:search', async (_event, query: string) => {
    return searchWeb(query)
  })

  ipcMain.handle('notes:read', (_event, mdPath: string) => {
    try {
      const absPath = safeResolveNotePath(mdPath, getDataPath())
      if (!fs.existsSync(absPath)) return ''
      return fs.readFileSync(absPath, 'utf-8')
    } catch (error) {
      console.error('Erro ao ler nota:', error)
      return ''
    }
  })

  ipcMain.handle('notes:write', (_event, mdPath: string, content: string) => {
    try {
      const absPath = safeResolveNotePath(mdPath, getDataPath())
      return writeTextFileAtomic(absPath, content ?? '')
    } catch (error) {
      console.error('Erro ao salvar nota:', error)
      return false
    }
  })

  ipcMain.handle('notes:delete', (_event, mdPath: string) => {
    try {
      const absPath = safeResolveNotePath(mdPath, getDataPath())
      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath)
      }
      return true
    } catch (error) {
      console.error('Erro ao remover nota:', error)
      return false
    }
  })

  ipcMain.handle('transcript:analyzeSelection', (_event, request: { text: string; mode?: 'meeting' | 'interview' | 'prompt' }) => {
    try {
      return analyzeTranscriptSelection(request)
    } catch (error) {
      console.error('Erro ao analisar selecao do transcript:', error)
      return {
        intent: 'note' as const,
        summary: '',
        suggestions: [],
      }
    }
  })

  ipcMain.handle('transcript:generateNote', (_event, request: {
    title?: string
    transcript: string
    mode?: 'meeting' | 'interview' | 'prompt'
    selectedSnippets?: string[]
    customInstructions?: string
  }) => {
    try {
      return generateTranscriptNote(request)
    } catch (error) {
      console.error('Erro ao gerar nota de transcript:', error)
      return {
        title: request?.title?.trim() || 'Nota',
        markdown: request?.transcript?.trim() || '',
        summary: '',
        highlights: [],
        questions: [],
        decisions: [],
        actionItems: [],
        words: 0,
        segments: 0,
      }
    }
  })

  ipcMain.handle('meetings:saveAudio', (_event, meetingId: string, audioBase64: string) => {
    try {
      const dataPath = getDataPath()
      const audioName = `${meetingId}.webm`
      const absPath = safeResolveMeetingPath(audioName, dataPath)
      const buffer = Buffer.from(audioBase64, 'base64')
      fs.writeFileSync(absPath, buffer)
      return audioName
    } catch (error) {
      console.error('Erro ao salvar audio:', error)
      return null
    }
  })

  ipcMain.handle('meetings:deleteAudio', (_event, audioPath: string) => {
    try {
      const absPath = safeResolveMeetingPath(audioPath, getDataPath())
      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath)
      }
      return true
    } catch (error) {
      console.error('Erro ao remover audio:', error)
      return false
    }
  })

  ipcMain.handle('whisper:downloadModel', (_event, modelId: string) => downloadWhisperModel(modelId))
  ipcMain.handle('whisper:downloadProgress', () => getWhisperDownloadProgress())

  ipcMain.handle('whisper:listLocalModels', async () => {
    try {
      return listLocalModels()
    } catch (error) {
      console.error('Erro ao listar modelos Whisper locais:', error)
      return []
    }
  })

  ipcMain.handle('meetings:transcribe', async (
    _event,
    audioPath: string,
    modelId?: string,
    options?: TranscriptionRequestOptions
  ) => {
    const resolved = resolveTranscriptionInput(audioPath)

    try {
      const absPath = resolved.path

      if (!fs.existsSync(absPath)) {
        return '[Erro: arquivo de audio nao encontrado]'
      }

      return await transcribeLocalAudio(absPath, modelId, trimPrompt(options?.initialPrompt))
    } catch (error) {
      console.error('Erro na transcricao:', error)
      throw new Error(error instanceof Error ? error.message : 'Erro ao transcrever áudio')
    } finally {
      if (resolved.cleanup) {
        try {
          if (fs.existsSync(resolved.path)) {
            fs.unlinkSync(resolved.path)
          }
        } catch {}
      }
    }
  })

  ipcMain.handle('apps:selectExe', async () => {
    const result = await showOpenDialog({
      title: 'Selecionar executavel (.exe)',
      properties: ['openFile'],
      filters: [{ name: 'Executavel', extensions: ['exe'] }],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const exePath = result.filePaths[0]
    const name = path.basename(exePath).replace(/\.exe$/i, '')
    let iconDataUrl: string | null = null

    try {
      const icon = await app.getFileIcon(exePath, { size: 'large' })
      iconDataUrl = icon.toDataURL()
    } catch {
      iconDataUrl = null
    }

    return { exePath, name, iconDataUrl }
  })

  ipcMain.handle('apps:launch', (_event, exePath: string) => {
    return launchExe(exePath)
  })

  ipcMain.handle('apps:launchWithArgs', (_event, exePath: string, args: string[]) => {
    try {
      const child = spawn(exePath, args || [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      })
      child.unref()
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('apps:launchMany', async (_event, exePaths: string[], mode: 'sequential' | 'simultaneous') => {
    try {
      const unique = Array.isArray(exePaths) ? exePaths.filter(Boolean) : []
      if (mode === 'sequential') {
        for (const exePath of unique) {
          launchExe(exePath)
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } else {
        for (const exePath of unique) {
          launchExe(exePath)
        }
      }
      return true
    } catch (error) {
      console.error('Erro ao executar macro:', error)
      return false
    }
  })

  ipcMain.handle('apps:checkRunning', (_event, exePaths: string[]) => {
    return new Promise<string[]>(resolve => {
      exec('tasklist /fo csv /nh', (err, stdout) => {
        if (err) { resolve([]); return }
        const runningNames = new Set(
          stdout.split('\n')
            .map(line => line.split(',')[0]?.replace(/"/g, '').toLowerCase().trim())
            .filter(Boolean)
        )
        const running = (Array.isArray(exePaths) ? exePaths : []).filter(p => {
          const basename = path.basename(p).toLowerCase()
          return runningNames.has(basename)
        })
        resolve(running)
      })
    })
  })

  // Scans Start Menu .lnk shortcuts and resolves .exe targets
  ipcMain.handle('apps:scanInstalled', () => {
    return new Promise<Array<{ name: string; exePath: string }>>(resolve => {
      const scanDirs = [
        path.join(process.env['APPDATA'] ?? '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
        path.join(process.env['ProgramData'] ?? '', 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      ]

      const psScript = [
        `$dirs = @(${scanDirs.map(d => `'${d.replace(/'/g, "''")}'`).join(',')})`,
        '$results = @()',
        'foreach ($dir in $dirs) {',
        '  if (-not (Test-Path $dir)) { continue }',
        '  Get-ChildItem -Path $dir -Recurse -Filter "*.lnk" -ErrorAction SilentlyContinue | ForEach-Object {',
        '    try {',
        '      $sh = New-Object -ComObject WScript.Shell',
        '      $lnk = $sh.CreateShortcut($_.FullName)',
        '      $t = $lnk.TargetPath',
        '      if ($t -match "\\.exe$" -and (Test-Path $t)) {',
        '        $results += [PSCustomObject]@{ name = $_.BaseName; path = $t }',
        '      }',
        '    } catch {}',
        '  }',
        '}',
        '$results | Select-Object -Unique name, path | ConvertTo-Json -Compress',
      ].join('\n')

      // Use base64-encoded command to avoid quoting issues
      const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
      exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
        { timeout: 25000 },
        (err, stdout) => {
          if (err || !stdout.trim()) { resolve([]); return }
          try {
            const raw = JSON.parse(stdout.trim())
            const items = Array.isArray(raw) ? raw : [raw]
            const seen = new Set<string>()
            const result: Array<{ name: string; exePath: string }> = []
            for (const item of items) {
              const p = item.path ?? item.Path
              const n = item.name ?? item.Name
              if (typeof p === 'string' && typeof n === 'string' && !seen.has(p.toLowerCase())) {
                seen.add(p.toLowerCase())
                result.push({ name: n, exePath: p })
              }
            }
            resolve(result)
          } catch { resolve([]) }
        }
      )
    })
  })

  // Lists all currently running .exe processes with their full path (Windows only)
  ipcMain.handle('apps:scanRunning', () => {
    return new Promise<Array<{ name: string; exePath: string }>>(resolve => {
      const psScript = [
        'Get-Process | Where-Object { $_.Path -and $_.Path -match \'\\.exe$\' } |',
        'Select-Object @{N="name";E={$_.Name}}, @{N="path";E={$_.Path}} |',
        'Sort-Object name -Unique |',
        'ConvertTo-Json -Compress',
      ].join(' ')
      const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
      exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
        { timeout: 10000 },
        (err, stdout) => {
          if (err || !stdout.trim()) { resolve([]); return }
          try {
            const raw = JSON.parse(stdout.trim())
            const items = Array.isArray(raw) ? raw : [raw]
            const seen = new Set<string>()
            const result: Array<{ name: string; exePath: string }> = []
            for (const item of items) {
              const p = (item.path ?? item.Path ?? '') as string
              const n = (item.name ?? item.Name ?? '') as string
              if (p && n && !seen.has(p.toLowerCase())) {
                seen.add(p.toLowerCase())
                result.push({ name: n, exePath: p })
              }
            }
            resolve(result)
          } catch { resolve([]) }
        }
      )
    })
  })

  // Detectar apps instalados (Upgrade 19)
  ipcMain.handle('apps:detectInstalled', () => {
    return new Promise<Array<{ name: string; exePath: string; iconPath?: string }>>(resolve => {
      const commonPaths = [
        'C:\\Program Files',
        'C:\\Program Files (x86)',
        process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Programs') : null,
        process.env.APPDATA ? path.join(process.env.APPDATA, 'Microsoft\\Windows\\Start Menu\\Programs') : null,
      ].filter(Boolean) as string[]

      const psScript = [
        `$paths = @(${commonPaths.map(p => `'${p}'`).join(',')})`,
        '$apps = @()',
        'foreach ($p in $paths) {',
        '  if (Test-Path $p) {',
        '    Get-ChildItem -Path $p -Recurse -Filter "*.exe" -ErrorAction SilentlyContinue |',
        '    Where-Object { $_.Name -notmatch "unins|uninst|update|setup|install" } |',
        '    Select-Object @{N="name";E={$_.BaseName}}, @{N="path";E={$_.FullName}} |',
        '    ForEach-Object { $apps += $_ }',
        '  }',
        '}',
        '$apps | Sort-Object name -Unique | Select-Object -First 200 | ConvertTo-Json -Compress',
      ].join(' ')

      const encoded = Buffer.from(psScript, 'utf16le').toString('base64')
      exec(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
        { timeout: 30000 },
        (err, stdout) => {
          if (err || !stdout.trim()) { resolve([]); return }
          try {
            const raw = JSON.parse(stdout.trim())
            const items = Array.isArray(raw) ? raw : [raw]
            const seen = new Set<string>()
            const result: Array<{ name: string; exePath: string }> = []
            for (const item of items) {
              const p = (item.path ?? item.Path ?? '') as string
              const n = (item.name ?? item.Name ?? '') as string
              if (p && n && !seen.has(p.toLowerCase())) {
                seen.add(p.toLowerCase())
                result.push({ name: n, exePath: p })
              }
            }
            resolve(result)
          } catch { resolve([]) }
        }
      )
    })
  })

  // Extrair ícone de .exe (Upgrade 19)
  ipcMain.handle('apps:extractIcon', async (_event, exePath: string) => {
    try {
      const { nativeImage } = await import('electron')
      const icon = await app.getFileIcon(exePath, { size: 'normal' })
      if (icon && !icon.isEmpty()) {
        return icon.toDataURL()
      }
      return null
    } catch (error) {
      console.error('Erro ao extrair ícone:', error)
      return null
    }
  })

  ipcMain.handle('apps:getMemory', (_event, exePaths: string[]) => {
    return new Promise<Record<string, number>>(resolve => {
      exec('tasklist /fo csv /nh /v', (err, stdout) => {
        if (err) { resolve({}); return }
        const memMap = new Map<string, number>() // basename.lower -> KB total
        for (const line of stdout.split('\n')) {
          const parts = line.split('","')
          if (parts.length < 5) continue
          const name = parts[0].replace(/"/g, '').toLowerCase().trim()
          const memStr = parts[4].replace(/"/g, '').replace(/,/g, '').replace(/\s*K/i, '').trim()
          const kb = parseInt(memStr, 10)
          if (!isNaN(kb) && kb > 0) memMap.set(name, (memMap.get(name) ?? 0) + kb)
        }
        const result: Record<string, number> = {}
        for (const exePath of (Array.isArray(exePaths) ? exePaths : [])) {
          const base = path.basename(exePath).toLowerCase()
          const kb = memMap.get(base)
          if (kb !== undefined) result[exePath] = Math.round(kb / 1024) // MB
        }
        resolve(result)
      })
    })
  })
}
