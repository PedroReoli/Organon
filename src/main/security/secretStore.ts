import { app, safeStorage } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'

export type SecretKey = 'whisper.groq' | 'whisper.openai' | 'whisper.custom'

type SecretFile = {
  version: 1
  values: Partial<Record<SecretKey, string>>
}

const ALLOWED_SECRET_KEYS = new Set<SecretKey>(['whisper.groq', 'whisper.openai', 'whisper.custom'])

function getSecretFilePath(): string {
  return path.join(app.getPath('userData'), 'secrets.enc.json')
}

function readSecretFile(): SecretFile {
  try {
    const filePath = getSecretFilePath()
    if (!fs.existsSync(filePath)) return { version: 1, values: {} }
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as SecretFile
    return parsed?.version === 1 && parsed.values && typeof parsed.values === 'object'
      ? parsed
      : { version: 1, values: {} }
  } catch {
    return { version: 1, values: {} }
  }
}

function writeSecretFile(file: SecretFile): void {
  const targetPath = getSecretFilePath()
  const tempPath = `${targetPath}.${process.pid}.${randomUUID()}.tmp`
  const backupPath = `${targetPath}.${process.pid}.${randomUUID()}.bak`
  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  fs.writeFileSync(tempPath, JSON.stringify(file, null, 2), { encoding: 'utf-8', mode: 0o600 })
  let movedExisting = false
  try {
    if (fs.existsSync(targetPath)) {
      fs.renameSync(targetPath, backupPath)
      movedExisting = true
    }
    fs.renameSync(tempPath, targetPath)
    if (movedExisting && fs.existsSync(backupPath)) fs.unlinkSync(backupPath)
  } catch (error) {
    if (!fs.existsSync(targetPath) && movedExisting && fs.existsSync(backupPath)) fs.renameSync(backupPath, targetPath)
    throw error
  } finally {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
  }
}

function assertSecretKey(key: string): asserts key is SecretKey {
  if (!ALLOWED_SECRET_KEYS.has(key as SecretKey)) throw new Error('Identificador de segredo invalido.')
}

export function setSecret(key: SecretKey, value: string): void {
  assertSecretKey(key)
  const normalized = value?.trim()
  if (!normalized) throw new Error('Segredo vazio.')
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Cofre seguro do sistema operacional indisponivel.')
  const file = readSecretFile()
  file.values[key] = safeStorage.encryptString(normalized).toString('base64')
  writeSecretFile(file)
}

export function getSecret(key: SecretKey): string | null {
  assertSecretKey(key)
  const encrypted = readSecretFile().values[key]
  if (!encrypted || !safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
  } catch {
    return null
  }
}

export function hasSecret(key: SecretKey): boolean {
  return Boolean(getSecret(key))
}

export function getSecretStatus(): { groq: boolean; openai: boolean; custom: boolean; secureStorageAvailable: boolean } {
  const secureStorageAvailable = safeStorage.isEncryptionAvailable()
  return {
    groq: secureStorageAvailable && hasSecret('whisper.groq'),
    openai: secureStorageAvailable && hasSecret('whisper.openai'),
    custom: secureStorageAvailable && hasSecret('whisper.custom'),
    secureStorageAvailable,
  }
}
