import { Worker, isMainThread, parentPort, workerData } from 'worker_threads'
import * as path from 'path'
import * as fs from 'fs'
import { pathToFileURL } from 'url'
import { listProjectFiles, readProjectFile } from '../storage/workspaceGuard'
import type { ResearchSource } from './codexRunner'

export interface ProjectEvidence { sources: ResearchSource[]; inventory: string[]; scannedAt: string }

function collect(root: string, question: string): ProjectEvidence {
  if (!fs.statSync(root).isDirectory()) throw new Error('Selecione uma pasta válida.')
  const terms = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9_./-]{3,}/g) || []
  const stop = new Set(['como','qual','quais','onde','esta','esse','essa','para','uma','por','que','pasta','codigo','projeto','analise','relatorio','pesquise','sobre','fazer'])
  const keywords = [...new Set(terms.filter(term => !stop.has(term)))].slice(0, 16)
  const inventory = listProjectFiles(root, 2000)
  const matches: Array<{ score: number; source: ResearchSource }> = []
  for (const file of inventory) {
    const content = readProjectFile(root, file.relativePath, 64000)
    if (!content || content.includes('\0')) continue
    const lines = content.split(/\r?\n/)
    const normalized = content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const score = keywords.reduce((sum, term) => sum + (file.relativePath.toLowerCase().includes(term) ? 8 : 0) + (normalized.includes(term) ? 2 : 0), 0)
      + (/^(readme|package\.json|pyproject|cargo\.toml)/i.test(file.relativePath) ? 1 : 0)
    if (!score) continue
    const anchor = Math.max(0, lines.findIndex(line => keywords.some(term => line.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term))) - 12)
    const excerpt = lines.slice(anchor, anchor + 85).map((line, i) => `${anchor + i + 1}: ${line}`).join('\n').slice(0, 4500)
    matches.push({ score, source: { type: 'project', title: file.relativePath, pathOrUrl: pathToFileURL(path.join(root, file.relativePath)).href,
      lineRange: `L${anchor + 1}-L${Math.min(lines.length, anchor + 85)}`, snippet: excerpt } })
  }
  return { sources: matches.sort((a, b) => b.score - a.score).slice(0, 8).map(match => match.source), inventory: inventory.slice(0, 120).map(file => file.relativePath), scannedAt: new Date().toISOString() }
}

export function collectMeetingProject(root: string, question: string, signal: AbortSignal): Promise<ProjectEvidence> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { workerData: { meetingProject: true, root, question } })
    let settled = false
    const finish = (error?: Error, value?: ProjectEvidence) => {
      if (settled) return; settled = true
      clearTimeout(timer); signal.removeEventListener('abort', abort); void worker.terminate()
      if (error) reject(error); else resolve(value!)
    }
    const abort = () => finish(new Error('Pesquisa cancelada.'))
    const timer = setTimeout(() => finish(new Error('A leitura da pasta excedeu 30 segundos. Selecione uma subpasta.')), 30000)
    signal.addEventListener('abort', abort, { once: true })
    worker.on('message', message => message.error ? finish(new Error(message.error)) : finish(undefined, message))
    worker.on('error', error => finish(error))
    worker.on('exit', code => { if (!settled) finish(new Error(`Leitor de pasta encerrou sem resultado (${code}).`)) })
    if (signal.aborted) abort()
  })
}

if (!isMainThread && workerData?.meetingProject) {
  try { parentPort?.postMessage(collect(workerData.root, workerData.question)) }
  catch (error) { parentPort?.postMessage({ error: error instanceof Error ? error.message : 'Erro ao ler pasta.' }) }
}
