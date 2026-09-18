import { app, ipcMain } from 'electron'
import { execFile } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'

import { getDataPath, writeTextFileAtomic } from '../storage/filesystem'

export interface ProjectGraphRecord {
  id: string
  name: string
  rootPath: string
  graphPath: string
  status: 'pending' | 'ready' | 'error'
  createdAt: string
  updatedAt: string
  lastIndexedAt: string | null
  lastError: string | null
  summary: { files: number; directories: number; nodes: number; edges: number; technologies: string[] } | null
}

interface ProjectGraphData {
  schemaVersion: number
  generatedAt: string
  summary: ProjectGraphRecord['summary']
  nodes: Array<{ id: string; label: string; type: string; path: string; metadata?: Record<string, unknown> }>
  edges: Array<{ source: string; target: string; relation: string; origin: string; weight: number }>
}

const getRoot = () => path.join(getDataPath(), 'graphs')
const getRegistryPath = () => path.join(getRoot(), 'projects.json')

const readRegistry = (): ProjectGraphRecord[] => {
  try {
    const parsed = JSON.parse(fs.readFileSync(getRegistryPath(), 'utf-8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveRegistry = (records: ProjectGraphRecord[]): boolean => {
  fs.mkdirSync(getRoot(), { recursive: true })
  return writeTextFileAtomic(getRegistryPath(), JSON.stringify(records, null, 2))
}

const readGraph = (record: ProjectGraphRecord): ProjectGraphData | null => {
  try {
    const parsed = JSON.parse(fs.readFileSync(record.graphPath, 'utf-8')) as ProjectGraphData
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null
    return parsed
  } catch {
    return null
  }
}

const getIndexerPath = (): string => app.isPackaged
  ? path.join(process.resourcesPath, 'dist-python', 'project_graph_indexer.py')
  : path.join(app.getAppPath(), '..', '..', 'data', 'graph', 'project_graph_indexer.py')

const runIndexer = (record: ProjectGraphRecord): Promise<{ ok: boolean; error?: string }> => new Promise(resolve => {
  const python = process.platform === 'win32' ? 'python' : 'python3'
  execFile(
    python,
    [getIndexerPath(), '--project', record.rootPath, '--output', record.graphPath],
    { encoding: 'utf-8', timeout: 180000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
    (error, _stdout, stderr) => resolve(error
      ? { ok: false, error: stderr.trim() || error.message }
      : { ok: true }),
  )
})

export const registerProjectGraphIpc = (): void => {
  ipcMain.handle('projectGraph:list', () => readRegistry())

  ipcMain.handle('projectGraph:add', (_event, rootPath: string) => {
    if (!rootPath || !fs.existsSync(rootPath) || !fs.statSync(rootPath).isDirectory()) {
      return { ok: false, error: 'Selecione um diretório de projeto válido.' }
    }
    const normalizedRoot = path.resolve(rootPath)
    const records = readRegistry()
    const existing = records.find(item => path.resolve(item.rootPath).toLowerCase() === normalizedRoot.toLowerCase())
    if (existing) return { ok: true, project: existing }
    const now = new Date().toISOString()
    const id = randomUUID()
    const record: ProjectGraphRecord = {
      id,
      name: path.basename(normalizedRoot),
      rootPath: normalizedRoot,
      graphPath: path.join(getRoot(), id, 'graph.json'),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      lastIndexedAt: null,
      lastError: null,
      summary: null,
    }
    if (!saveRegistry([...records, record])) return { ok: false, error: 'Não foi possível salvar o catálogo.' }
    return { ok: true, project: record }
  })

  ipcMain.handle('projectGraph:run', async (_event, projectId: string) => {
    const records = readRegistry()
    const record = records.find(item => item.id === projectId)
    if (!record) return { ok: false, error: 'Projeto não encontrado.' }
    if (!fs.existsSync(record.rootPath)) return { ok: false, error: 'O diretório do projeto não existe mais.' }
    const result = await runIndexer(record)
    const now = new Date().toISOString()
    const graph = result.ok ? readGraph(record) : null
    record.status = result.ok && graph ? 'ready' : 'error'
    record.updatedAt = now
    record.lastIndexedAt = graph?.generatedAt ?? record.lastIndexedAt
    record.lastError = result.ok && graph ? null : result.error ?? 'O índice gerado é inválido.'
    record.summary = graph?.summary ?? record.summary
    saveRegistry(records)
    return { ok: record.status === 'ready', project: record, graph, error: record.lastError ?? undefined }
  })

  ipcMain.handle('projectGraph:get', (_event, projectId: string) => {
    const record = readRegistry().find(item => item.id === projectId)
    if (!record) return null
    return readGraph(record)
  })

  ipcMain.handle('projectGraph:remove', (_event, projectId: string) => {
    const records = readRegistry()
    const record = records.find(item => item.id === projectId)
    if (!record) return false
    const projectDir = path.dirname(record.graphPath)
    if (projectDir.startsWith(getRoot()) && fs.existsSync(projectDir)) fs.rmSync(projectDir, { recursive: true, force: true })
    return saveRegistry(records.filter(item => item.id !== projectId))
  })

  ipcMain.handle('projectGraph:prompt', (_event, projectId: string) => {
    const record = readRegistry().find(item => item.id === projectId)
    if (!record) return null
    const command = `python "${getIndexerPath()}" --project "${record.rootPath}" --output "${record.graphPath}"`
    const prompt = [
      `Analise o projeto local ${record.name}.`,
      `Use o índice estrutural em: ${record.graphPath}`,
      'Não invente relações. Diferencie fatos extraídos do código de inferências semânticas.',
      'Identifique domínios, módulos críticos, riscos, testes ausentes e documentação possivelmente desatualizada.',
      'Responda em português e cite os caminhos dos arquivos que sustentam cada conclusão.',
    ].join('\n')
    return { command, prompt, graphPath: record.graphPath }
  })
}
