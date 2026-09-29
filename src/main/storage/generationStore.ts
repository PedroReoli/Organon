import { createHash, randomUUID } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

import type { Store } from '../types'
import { ensureDataDir, readJsonFile, writeTextFileAtomic } from './filesystem'
import { normalizeStore } from './storeModel'

export const STORE_SECTIONS: Array<{ fileName: string; keys: Array<keyof Store> }> = [
  { fileName: 'meta.json', keys: ['version'] },
  { fileName: 'planning.json', keys: ['cards', 'projectSprints'] },
  { fileName: 'calendar.json', keys: ['calendarEvents'] },
  { fileName: 'shortcuts.json', keys: ['shortcutFolders', 'shortcuts'] },
  { fileName: 'projects.json', keys: ['projects', 'registeredIDEs'] },
  { fileName: 'notes.json', keys: ['noteFolders', 'notes'] },
  { fileName: 'colors.json', keys: ['colorPalettes'] },
  { fileName: 'clipboard.json', keys: ['clipboardCategories', 'clipboardItems'] },
  { fileName: 'apps.json', keys: ['apps', 'macros'] },
  { fileName: 'financial.json', keys: ['bills', 'expenses', 'budgetCategories', 'incomes', 'financialConfig', 'savingsGoals', 'investments'] },
  { fileName: 'today.json', keys: ['quickAccess'] },
  { fileName: 'meetings.json', keys: ['meetings'] },
  { fileName: 'study.json', keys: ['study'] },
  { fileName: 'sync.json', keys: ['lastSyncAt', 'pendingDeletes', 'storeUpdatedAt'] },
  { fileName: 'canvas.json', keys: ['canvases'] },
  { fileName: 'settings.json', keys: ['settings'] },
]

type TransactionStatus = 'staging' | 'generation-published' | 'committed' | 'failed'
export type GenerationCommitFaultStep = 'staging-written' | 'generation-published' | 'current-published'

interface CurrentPointer {
  version: 1
  generationId: string
  revision: number
  manifestSha256: string
}

interface GenerationManifest {
  version: 1
  generationId: string
  transactionId: string
  revision: number
  previousRevision: number
  createdAt: string
  source: string
  files: Record<string, string>
}

interface TransactionRecord {
  version: 1
  transactionId: string
  generationId: string
  source: string
  expectedRevision: number | null
  previousRevision: number
  revision: number
  startedAt: string
  completedAt?: string
  status: TransactionStatus
  error?: string
}

export interface CommittedGeneration {
  store: Store
  revision: number
  generationId: string
  transactionId: string
}

export interface CommittedGenerationState {
  generation: CommittedGeneration
  integrity: 'ok' | 'recovered'
}

export interface GenerationCommitOptions {
  source?: string
  expectedRevision?: number
  faultAt?: GenerationCommitFaultStep
}

export interface GenerationCommitResult {
  success: boolean
  revision: number
  previousRevision: number
  generationId?: string
  transactionId?: string
  conflict?: boolean
  error?: string
}

const CONTROL_DIR_NAME = '_sistema'
const LOCK_STALE_AFTER_MS = 30_000
const MAX_TRANSACTION_RECORDS = 500
const GENERATION_ID_PATTERN = /^\d{10}-[0-9a-f-]{36}$/i
const TRANSACTION_ID_PATTERN = /^[0-9a-f-]{36}$/i

const getControlDir = (dataPath: string): string => path.join(dataPath, CONTROL_DIR_NAME)
const getGenerationsDir = (dataPath: string): string => path.join(getControlDir(dataPath), 'generations')
const getTransactionsDir = (dataPath: string): string => path.join(getControlDir(dataPath), 'transactions')
const getCurrentPath = (dataPath: string): string => path.join(getControlDir(dataPath), 'CURRENT')
const getLockPath = (dataPath: string): string => path.join(getControlDir(dataPath), 'storage.lock')

const sha256Buffer = (content: Buffer | string): string => createHash('sha256').update(content).digest('hex')
const sha256File = (filePath: string): string => sha256Buffer(fs.readFileSync(filePath))

const writeJsonAtomic = (filePath: string, value: unknown): void => {
  if (!writeTextFileAtomic(filePath, JSON.stringify(value, null, 2))) {
    throw new Error(`Falha ao gravar ${filePath}`)
  }
}

const readCurrentPointer = (dataPath: string): CurrentPointer | null => {
  const parsed = readJsonFile(getCurrentPath(dataPath)) as Partial<CurrentPointer> | null
  if (
    parsed?.version !== 1
    || typeof parsed.generationId !== 'string'
    || !GENERATION_ID_PATTERN.test(parsed.generationId)
    || !Number.isSafeInteger(parsed.revision)
    || (parsed.revision ?? 0) < 1
    || typeof parsed.manifestSha256 !== 'string'
  ) return null
  return parsed as CurrentPointer
}

const validateGeneration = (
  generationPath: string,
  pointer?: CurrentPointer,
  expectedGenerationId?: string,
): CommittedGeneration | null => {
  try {
    const manifestPath = path.join(generationPath, 'manifest.json')
    if (!fs.existsSync(manifestPath)) return null
    if (pointer && sha256File(manifestPath) !== pointer.manifestSha256) return null

    const manifest = readJsonFile(manifestPath) as Partial<GenerationManifest> | null
    if (
      manifest?.version !== 1
      || typeof manifest.generationId !== 'string'
      || !GENERATION_ID_PATTERN.test(manifest.generationId)
      || (expectedGenerationId ?? path.basename(generationPath)) !== manifest.generationId
      || typeof manifest.transactionId !== 'string'
      || !Number.isSafeInteger(manifest.revision)
      || !manifest.files
    ) return null
    if (pointer && (manifest.generationId !== pointer.generationId || manifest.revision !== pointer.revision)) return null

    for (const [relativePath, expectedHash] of Object.entries(manifest.files)) {
      const normalized = relativePath.replace(/\\/g, '/')
      if (normalized.startsWith('/') || normalized.includes('../')) return null
      const filePath = path.resolve(generationPath, normalized)
      const prefix = `${path.resolve(generationPath)}${path.sep}`
      if (!filePath.startsWith(prefix) || !fs.existsSync(filePath) || sha256File(filePath) !== expectedHash) return null
    }

    const rawStore = readJsonFile(path.join(generationPath, 'store.json'))
    if (!rawStore || typeof rawStore !== 'object') return null
    return {
      store: normalizeStore(rawStore as Partial<Store>),
      revision: manifest.revision as number,
      generationId: manifest.generationId,
      transactionId: manifest.transactionId,
    }
  } catch {
    return null
  }
}

const hasCommittedJournal = (dataPath: string, generation: CommittedGeneration): boolean => {
  if (!TRANSACTION_ID_PATTERN.test(generation.transactionId)) return false
  const record = readJsonFile(path.join(getTransactionsDir(dataPath), generation.transactionId, 'transaction.json')) as Partial<TransactionRecord> | null
  return record?.status === 'committed'
    && record.transactionId === generation.transactionId
    && record.generationId === generation.generationId
    && record.revision === generation.revision
}

export const inspectCommittedGeneration = (dataPath: string): CommittedGenerationState | null => {
  const pointer = readCurrentPointer(dataPath)
  if (pointer) {
    const pointedGeneration = validateGeneration(path.join(getGenerationsDir(dataPath), pointer.generationId), pointer)
    if (pointedGeneration) return { generation: pointedGeneration, integrity: 'ok' }
  }

  try {
    const generationsDir = getGenerationsDir(dataPath)
    if (!fs.existsSync(generationsDir)) return null
    const candidates = fs.readdirSync(generationsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory() && GENERATION_ID_PATTERN.test(entry.name))
      .map(entry => validateGeneration(path.join(generationsDir, entry.name)))
      .filter((generation): generation is CommittedGeneration => Boolean(generation))
      .filter(generation => hasCommittedJournal(dataPath, generation))
      .sort((a, b) => b.revision - a.revision)
    return candidates[0] ? { generation: candidates[0], integrity: 'recovered' } : null
  } catch {
    return null
  }
}

export const loadCommittedGeneration = (dataPath: string): CommittedGeneration | null => {
  return inspectCommittedGeneration(dataPath)?.generation ?? null
}

export const getStorageRevision = (dataPath: string): number => loadCommittedGeneration(dataPath)?.revision ?? 0

export const getStorageRootId = (dataPath: string): string => {
  const resolved = path.resolve(dataPath).replace(/\\/g, '/')
  const normalized = process.platform === 'win32' ? resolved.toLowerCase() : resolved
  return `root-${sha256Buffer(normalized).slice(0, 16)}`
}

const isProcessAlive = (pid: number): boolean => {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const acquireLock = (dataPath: string, token: string): (() => void) => {
  const lockPath = getLockPath(dataPath)
  ensureDataDir(path.dirname(lockPath))

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const descriptor = fs.openSync(lockPath, 'wx')
      try {
        fs.writeFileSync(descriptor, JSON.stringify({ token, pid: process.pid, createdAt: new Date().toISOString() }), 'utf-8')
      } catch (error) {
        try { fs.unlinkSync(lockPath) } catch { /* evita mascarar o erro de escrita */ }
        throw error
      } finally {
        fs.closeSync(descriptor)
      }
      return () => {
        try {
          const current = readJsonFile(lockPath) as { token?: string } | null
          if (current?.token === token) fs.unlinkSync(lockPath)
        } catch {
          // Outro processo pode ter recuperado um lock expirado.
        }
      }
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException
      if (nodeError.code !== 'EEXIST') throw error
      const lock = readJsonFile(lockPath) as { pid?: number } | null
      const age = Date.now() - fs.statSync(lockPath).mtimeMs
      if (attempt === 0 && age > LOCK_STALE_AFTER_MS && !isProcessAlive(lock?.pid ?? 0)) {
        fs.unlinkSync(lockPath)
        continue
      }
      throw new Error('Armazenamento ocupado por outro processo.')
    }
  }
  throw new Error('Nao foi possivel adquirir o lock do armazenamento.')
}

const writeTransactionRecord = (transactionPath: string, record: TransactionRecord): void => {
  ensureDataDir(transactionPath)
  writeJsonAtomic(path.join(transactionPath, 'transaction.json'), record)
}

const pruneTransactionRecords = (dataPath: string): void => {
  try {
    const transactionsDir = getTransactionsDir(dataPath)
    const records = fs.readdirSync(transactionsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => ({ path: path.join(transactionsDir, entry.name), time: fs.statSync(path.join(transactionsDir, entry.name)).mtimeMs }))
      .sort((a, b) => b.time - a.time)
    for (const record of records.slice(MAX_TRANSACTION_RECORDS)) {
      fs.rmSync(record.path, { recursive: true, force: true })
    }
  } catch {
    // Retencao de journal nunca invalida um commit concluido.
  }
}

const injectFault = (options: GenerationCommitOptions, step: GenerationCommitFaultStep): void => {
  if (options.faultAt === step) throw new Error(`Falha injetada apos ${step}`)
}

export const commitStoreGeneration = (
  input: Store,
  dataPath: string,
  options: GenerationCommitOptions = {},
): GenerationCommitResult => {
  const transactionId = randomUUID()
  const source = options.source?.trim() || 'desktop'
  let releaseLock: (() => void) | null = null
  let record: TransactionRecord | null = null
  let transactionPath = ''

  try {
    ensureDataDir(dataPath)
    releaseLock = acquireLock(dataPath, transactionId)
    const current = loadCommittedGeneration(dataPath)
    const previousRevision = current?.revision ?? 0
    if (options.expectedRevision !== undefined && options.expectedRevision !== previousRevision) {
      return {
        success: false,
        conflict: true,
        revision: previousRevision,
        previousRevision,
        error: `Conflito de revisao: esperado ${options.expectedRevision}, atual ${previousRevision}.`,
      }
    }

    const revision = previousRevision + 1
    const generationId = `${String(revision).padStart(10, '0')}-${transactionId}`
    transactionPath = path.join(getTransactionsDir(dataPath), transactionId)
    const stagingGenerationPath = path.join(transactionPath, 'generation')
    const sectionsPath = path.join(stagingGenerationPath, 'sections')
    const publishedGenerationPath = path.join(getGenerationsDir(dataPath), generationId)
    const normalized = normalizeStore(input)
    const startedAt = new Date().toISOString()
    record = {
      version: 1,
      transactionId,
      generationId,
      source,
      expectedRevision: options.expectedRevision ?? null,
      previousRevision,
      revision,
      startedAt,
      status: 'staging',
    }
    writeTransactionRecord(transactionPath, record)
    ensureDataDir(sectionsPath)

    const files: Record<string, string> = {}
    const storeContent = JSON.stringify(normalized, null, 2)
    fs.writeFileSync(path.join(stagingGenerationPath, 'store.json'), storeContent, 'utf-8')
    files['store.json'] = sha256Buffer(storeContent)

    for (const section of STORE_SECTIONS) {
      const payload: Record<string, unknown> = {}
      for (const key of section.keys) payload[key as string] = (normalized as unknown as Record<string, unknown>)[key as string]
      const relativePath = `sections/${section.fileName}`
      const content = JSON.stringify(payload, null, 2)
      fs.writeFileSync(path.join(stagingGenerationPath, relativePath), content, 'utf-8')
      files[relativePath] = sha256Buffer(content)
    }

    const manifest: GenerationManifest = {
      version: 1,
      generationId,
      transactionId,
      revision,
      previousRevision,
      createdAt: startedAt,
      source,
      files,
    }
    writeJsonAtomic(path.join(stagingGenerationPath, 'manifest.json'), manifest)
    if (!validateGeneration(stagingGenerationPath, undefined, generationId)) throw new Error('A geracao preparada falhou na validacao.')
    injectFault(options, 'staging-written')

    ensureDataDir(getGenerationsDir(dataPath))
    fs.renameSync(stagingGenerationPath, publishedGenerationPath)
    record.status = 'generation-published'
    writeTransactionRecord(transactionPath, record)
    injectFault(options, 'generation-published')

    const manifestPath = path.join(publishedGenerationPath, 'manifest.json')
    const pointer: CurrentPointer = {
      version: 1,
      generationId,
      revision,
      manifestSha256: sha256File(manifestPath),
    }
    writeJsonAtomic(getCurrentPath(dataPath), pointer)
    injectFault(options, 'current-published')

    record.status = 'committed'
    record.completedAt = new Date().toISOString()
    writeTransactionRecord(transactionPath, record)
    pruneTransactionRecords(dataPath)
    return { success: true, revision, previousRevision, generationId, transactionId }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const committed = loadCommittedGeneration(dataPath)
    if (record && committed?.transactionId === transactionId) {
      record.status = 'committed'
      record.completedAt = new Date().toISOString()
      record.error = `Commit concluido antes do erro: ${message}`
      try { writeTransactionRecord(transactionPath, record) } catch { /* commit ja esta publicado */ }
      return {
        success: true,
        revision: committed.revision,
        previousRevision: record.previousRevision,
        generationId: committed.generationId,
        transactionId,
      }
    }
    if (record) {
      record.status = 'failed'
      record.completedAt = new Date().toISOString()
      record.error = message
      try { writeTransactionRecord(transactionPath, record) } catch { /* preserva erro original */ }
    }
    const revision = committed?.revision ?? 0
    return {
      success: false,
      revision,
      previousRevision: record?.previousRevision ?? revision,
      generationId: record?.generationId,
      transactionId,
      error: message,
    }
  } finally {
    releaseLock?.()
  }
}
