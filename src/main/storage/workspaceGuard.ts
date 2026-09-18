import * as fs from 'fs'
import * as path from 'path'

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  'vendor',
  '.cache',
  '__pycache__',
  '.venv', '.codex', '.ssh', '.aws', '.azure', '.config',
])

const SENSITIVE_PATTERNS = [
  /^\.env/i,
  /\.pem$/i,
  /\.key$/i,
  /id_rsa/i,
  /credentials/i,
  /secrets/i,
  /\.pfx$/i,
  /\.keystore$/i,
]

const BINARY_EXTENSIONS = new Set([
  '.exe', '.dll', '.so', '.dylib', '.zip', '.tar', '.gz', '.7z',
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.mp3', '.mp4',
  '.webm', '.wav', '.bin', '.onnx', '.dat', '.db', '.sqlite',
])

export interface ProjectFileInfo {
  relativePath: string
  extension: string
  sizeBytes: number
}

export interface SearchMatch {
  relativePath: string
  line: number
  lineContent: string
}

export function isPathSafe(projectPath: string, targetPath: string): boolean {
  try {
    const absProject = path.resolve(projectPath)
    const absTarget = path.resolve(absProject, targetPath)
    const root = fs.realpathSync(absProject)
    const target = fs.realpathSync(absTarget)
    const relative = path.relative(root, target)
    return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  } catch {
    return false
  }
}

export function isFileSensitiveOrBinary(filename: string): boolean {
  if (filename.split(/[\\/]/).some(part => EXCLUDED_DIRS.has(part) || SENSITIVE_PATTERNS.some(pattern => pattern.test(part)))) return true
  const basename = path.basename(filename)
  const ext = path.extname(filename).toLowerCase()

  if (BINARY_EXTENSIONS.has(ext)) return true
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(basename)) return true
  }
  return false
}

export function listProjectFiles(projectPath: string, maxFiles: number = 2000): ProjectFileInfo[] {
  const results: ProjectFileInfo[] = []
  const absProject = path.resolve(projectPath)

  if (!fs.existsSync(absProject) || !fs.statSync(absProject).isDirectory()) {
    return results
  }

  function walk(dir: string) {
    if (results.length >= maxFiles) return

    let entries: fs.Dirent[] = []
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (results.length >= maxFiles) break

      const name = entry.name
      if (EXCLUDED_DIRS.has(name) || isFileSensitiveOrBinary(name)) {
        continue
      }

      const fullPath = path.join(dir, name)
      if (!isPathSafe(absProject, fullPath)) continue

      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(fullPath)
          if (stat.size <= 2 * 1024 * 1024) { // Máximo 2MB por arquivo
            const relativePath = path.relative(absProject, fullPath).replace(/\\/g, '/')
            results.push({
              relativePath,
              extension: path.extname(name).toLowerCase(),
              sizeBytes: stat.size,
            })
          }
        } catch {}
      }
    }
  }

  walk(absProject)
  return results
}

export function readProjectFile(projectPath: string, relativePath: string, maxBytes: number = 500000): string | null {
  const absProject = path.resolve(projectPath)
  const fullPath = path.resolve(absProject, relativePath)

  if (!isPathSafe(absProject, fullPath) || isFileSensitiveOrBinary(fullPath)) {
    console.warn(`[WorkspaceSafetyGuard] Acesso negado a arquivo não seguro: ${relativePath}`)
    return null
  }

  try {
    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return null
    const buffer = Buffer.alloc(maxBytes)
    const fd = fs.openSync(fullPath, 'r')
    const bytesRead = fs.readSync(fd, buffer, 0, maxBytes, 0)
    fs.closeSync(fd)
    return buffer.toString('utf-8', 0, bytesRead)
  } catch (err) {
    console.error(`[WorkspaceSafetyGuard] Erro ao ler arquivo de projeto:`, err)
    return null
  }
}

export function searchProjectText(
  projectPath: string,
  query: string,
  maxMatches: number = 30
): SearchMatch[] {
  const matches: SearchMatch[] = []
  if (!query || query.trim().length < 2) return matches

  const files = listProjectFiles(projectPath, 500)
  const lowerQuery = query.toLowerCase()

  for (const fileInfo of files) {
    if (matches.length >= maxMatches) break
    const content = readProjectFile(projectPath, fileInfo.relativePath, 100000)
    if (!content) continue

    const lines = content.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (matches.length >= maxMatches) break
      if (lines[i].toLowerCase().includes(lowerQuery)) {
        matches.push({
          relativePath: fileInfo.relativePath,
          line: i + 1,
          lineContent: lines[i].trim().slice(0, 160),
        })
      }
    }
  }

  return matches
}
