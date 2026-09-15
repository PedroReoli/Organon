import { ipcMain, app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

const AI_CONVERSATIONS_DIR = path.join(app.getPath('userData'), 'ai-conversations')

/**
 * Garante que o diretório de conversas existe
 */
function ensureConversationsDir(): void {
  if (!fs.existsSync(AI_CONVERSATIONS_DIR)) {
    fs.mkdirSync(AI_CONVERSATIONS_DIR, { recursive: true })
  }
}

/**
 * Sanitiza nome de arquivo para evitar path traversal
 */
function sanitizeFilename(filename: string): string | null {
  // Remove caracteres perigosos
  const dangerous = ['..', '/', '\\', '\0', '<', '>', ':', '"', '|', '?', '*']
  for (const char of dangerous) {
    if (filename.includes(char)) return null
  }

  // Sanitiza: remove caracteres não-ASCII e não-alfanuméricos exceto . - _
  const sanitized = filename.replace(/[^\x20-\x7E\w.\-]/g, '')

  // Limita tamanho
  if (sanitized.length > 100 || sanitized.length < 1) return null

  return sanitized
}

/**
 * Resolve caminho e verifica se está dentro do diretório permitido
 */
function safePath(filename: string): string | null {
  const sanitized = sanitizeFilename(filename)
  if (!sanitized) return null

  const fullPath = path.join(AI_CONVERSATIONS_DIR, sanitized)
  const resolved = path.resolve(fullPath)

  // Verifica se está dentro do diretório permitido
  const allowedDir = path.resolve(AI_CONVERSATIONS_DIR)
  if (!resolved.startsWith(allowedDir)) return null

  return resolved
}

/**
 * Formata conversa para arquivo Markdown
 */
function formatConversation(messages: any[], id: string): string {
  const date = new Date().toLocaleString('pt-BR')

  let content = `# 💬 Conversa do Organon - ${date}\n`
  content += `## ID: ${id}\n\n`
  content += `---\n\n`

  for (const msg of messages) {
    const time = new Date(msg.timestamp).toLocaleString('pt-BR')
    const role = msg.role === 'user' ? '## 👤 **Você**' : '## 🤖 **Assistente**'

    content += `${role}\n`
    content += `*${time}*\n\n`
    content += `${msg.content}\n\n`

    if (msg.notes && msg.notes.length > 0) {
      content += `### 📄 Notas consultadas:\n`
      for (const note of msg.notes) {
        content += `- "${note.title}" (${Math.round(note.similarity * 100)}% similar)\n`
      }
      content += '\n'
    }

    content += `---\n\n`
  }

  content += `\n*Conversa salva automaticamente pelo Organon*\n`
  return content
}

/**
 * Registra handlers IPC para conversas de IA
 */
export function registerConversationIpc(): void {
  // Salvar conversa
  ipcMain.handle('conversations:save', async (_event, id: string, messages: any[]) => {
    try {
      ensureConversationsDir()

      const timestamp = new Date().toISOString().slice(0, 10)
      const filename = `chat-${timestamp}-${id || Date.now()}.md`
      const filepath = path.join(AI_CONVERSATIONS_DIR, filename)

      const content = formatConversation(messages, id)
      fs.writeFileSync(filepath, content, 'utf-8')

      console.log(`[Conversations] Salvo em: ${filepath}`)
      return { success: true, filepath }
    } catch (error) {
      console.error('[Conversations] Erro ao salvar:', error)
      return { success: false, error: String(error) }
    }
  })

  // Listar conversas
  ipcMain.handle('conversations:list', async () => {
    try {
      ensureConversationsDir()

      const files = fs.readdirSync(AI_CONVERSATIONS_DIR)
        .filter(f => f.endsWith('.md'))
        .map(f => {
          const filepath = path.join(AI_CONVERSATIONS_DIR, f)
          const stats = fs.statSync(filepath)
          const content = fs.readFileSync(filepath, 'utf-8')

          // Extrai preview do primeiro conteúdo
          const previewMatch = content.match(/## 👤.*?\n\n(.{0,100})/s)
          const preview = previewMatch ? previewMatch[1].trim().slice(0, 80) + '...' : 'Sem conteúdo'

          return {
            filename: f,
            filepath,
            date: stats.mtime.toISOString(),
            preview
          }
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      return { success: true, files }
    } catch (error) {
      console.error('[Conversations] Erro ao listar:', error)
      return { success: false, error: String(error), files: [] }
    }
  })

  // Carregar conversa
  ipcMain.handle('conversations:load', async (_event, filename: string) => {
    try {
      const filepath = safePath(filename)
      if (!filepath) {
        return { success: false, error: 'Nome de arquivo inválido' }
      }

      if (!fs.existsSync(filepath)) {
        return { success: false, error: 'Arquivo não encontrado' }
      }

      const content = fs.readFileSync(filepath, 'utf-8')
      return { success: true, content, filepath }
    } catch (error) {
      console.error('[Conversations] Erro ao carregar:', error)
      return { success: false, error: String(error) }
    }
  })

  // Deletar conversa
  ipcMain.handle('conversations:delete', async (_event, filename: string) => {
    try {
      const filepath = safePath(filename)
      if (!filepath) {
        return { success: false, error: 'Nome de arquivo inválido' }
      }

      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath)
      }
      return { success: true }
    } catch (error) {
      console.error('[Conversations] Erro ao deletar:', error)
      return { success: false, error: String(error) }
    }
  })

  // Obter diretório de conversas
  ipcMain.handle('conversations:getDir', () => {
    ensureConversationsDir()
    return AI_CONVERSATIONS_DIR
  })

  console.log('[IPC] Handlers de conversas registrados')
  console.log(`[Conversations] Diretório: ${AI_CONVERSATIONS_DIR}`)
}
