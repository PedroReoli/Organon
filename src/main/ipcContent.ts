import { app, ipcMain, shell } from 'electron'
import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { pathToFileURL } from 'url'

import {
  ensureFilesDir,
  getDataPath,
  getFileTypeFromPath,
  getFilesSubdirForType,
  safeResolveFilePath,
  safeResolveMeetingPath,
  safeResolveNotePath,
  writeTextFileAtomic,
} from './filesystem'
import type { FileItem } from './types'
import { showOpenDialog } from './window'

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

export const registerContentIpcHandlers = (): void => {
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

  ipcMain.handle('meetings:transcribe', async (_event, audioPath: string) => {
    try {
      const absPath = safeResolveMeetingPath(audioPath, getDataPath())
      if (!fs.existsSync(absPath)) {
        return '[Erro: arquivo de audio nao encontrado]'
      }

      const FormData = (await import('form-data')).default
      const http = await import('http')

      return await new Promise<string>((resolve) => {
        const form = new FormData()
        form.append('file', fs.createReadStream(absPath))
        form.append('response_format', 'text')

        const req = http.request(
          {
            hostname: '127.0.0.1',
            port: 8080,
            path: '/inference',
            method: 'POST',
            headers: form.getHeaders(),
          },
          (res) => {
            let data = ''
            res.on('data', (chunk: Buffer) => { data += chunk.toString() })
            res.on('end', () => {
              resolve(data.trim() || '[Transcricao vazia]')
            })
          },
        )

        req.on('error', () => {
          resolve('[Erro: whisper-server nao disponivel em localhost:8080. Inicie o servidor e tente novamente.]')
        })

        form.pipe(req)
      })
    } catch (error) {
      console.error('Erro na transcricao:', error)
      return '[Erro ao transcrever audio]'
    }
  })

  ipcMain.handle('files:select', async () => {
    const result = await showOpenDialog({
      title: 'Selecionar arquivos para importar',
      properties: ['openFile', 'multiSelections'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return []
    }

    return result.filePaths
  })

  ipcMain.handle('files:import', (_event, sourcePath: string) => {
    try {
      const dataPath = getDataPath()
      ensureFilesDir(dataPath)

      const type = getFileTypeFromPath(sourcePath)
      const subdir = getFilesSubdirForType(type)
      const id = randomUUID()
      const baseName = path.basename(sourcePath)
      const safeName = baseName.replace(/[<>:"/\\|?*]+/g, '_')
      const relPath = `${subdir}/${id}-${safeName}`
      const absPath = safeResolveFilePath(relPath, dataPath)

      fs.copyFileSync(sourcePath, absPath)
      const stat = fs.statSync(absPath)

      const item: FileItem = {
        id,
        name: baseName,
        path: relPath,
        type,
        size: stat.size,
        createdAt: new Date().toISOString(),
      }

      return { success: true, item }
    } catch (error) {
      console.error('Erro ao importar arquivo:', error)
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('files:open', (_event, relativePath: string) => {
    try {
      const absPath = safeResolveFilePath(relativePath, getDataPath())
      return shell.openPath(absPath).then(result => result === '')
    } catch (error) {
      console.error('Erro ao abrir arquivo:', error)
      return false
    }
  })

  ipcMain.handle('files:delete', (_event, relativePath: string) => {
    try {
      const absPath = safeResolveFilePath(relativePath, getDataPath())
      if (fs.existsSync(absPath)) {
        fs.unlinkSync(absPath)
      }
      return true
    } catch (error) {
      console.error('Erro ao remover arquivo:', error)
      return false
    }
  })

  ipcMain.handle('files:getUrl', (_event, relativePath: string) => {
    try {
      const absPath = safeResolveFilePath(relativePath, getDataPath())
      return pathToFileURL(absPath).toString()
    } catch {
      return ''
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
}
