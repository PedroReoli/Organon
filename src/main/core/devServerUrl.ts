import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

/**
 * Retorna a URL ativa do servidor de desenvolvimento Vite.
 * Detecta dinamicamente a porta em uso a partir de:
 * 1. process.env.VITE_DEV_SERVER_URL
 * 2. Arquivo temporário .dev-server-url gerado pelo Vite ao subir em porta dinâmica
 * 3. Fallback http://localhost:5173
 */
export function getDevServerUrl(): string {
  if (process.env.VITE_DEV_SERVER_URL) {
    return process.env.VITE_DEV_SERVER_URL.trim()
  }

  try {
    const appRoot = app.getAppPath()
    const candidates = [
      path.join(appRoot, '.dev-server-url'),
      path.join(process.cwd(), '.dev-server-url'),
      path.resolve(__dirname, '../../.dev-server-url'),
      path.resolve(__dirname, '../../../.dev-server-url'),
    ]

    for (const file of candidates) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8').trim()
        if (content.startsWith('http://') || content.startsWith('https://')) {
          return content
        }
      }
    }
  } catch {}

  return 'http://localhost:5173'
}
