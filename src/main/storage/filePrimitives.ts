import * as fs from 'fs'
import * as path from 'path'

export const ensureDataDir = (dataPath: string): void => {
  if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true })
}

export const writeTextFileAtomic = (filePath: string, content: string): boolean => {
  const tempPath = `${filePath}.tmp`
  try {
    ensureDataDir(path.dirname(filePath))
    fs.writeFileSync(tempPath, content, 'utf-8')
    fs.renameSync(tempPath, filePath)
    return true
  } catch (error) {
    console.error('Erro ao salvar arquivo:', error)
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
    } catch {
      // Ignora erro ao limpar.
    }
    return false
  }
}

export const readJsonFile = (filePath: string): unknown | null => {
  try {
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown
  } catch {
    return null
  }
}
