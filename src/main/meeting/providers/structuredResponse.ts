import type { ResearchAnswer, ResearchSource } from './types'

function parseJsonText(text: string): unknown {
  const trimmed = text.trim()
  try { return JSON.parse(trimmed) } catch {}
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  if (fenced) {
    try { return JSON.parse(fenced.trim()) } catch {}
  }
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1))
  throw new Error('O provedor não retornou JSON válido.')
}

function normalizeSource(value: unknown): ResearchSource | undefined {
  if (!value || typeof value !== 'object') return undefined
  const source = value as Record<string, unknown>
  const type = source.type === 'web' ? 'web' : source.type === 'project' ? 'project' : undefined
  const title = typeof source.title === 'string' ? source.title.trim().slice(0, 300) : ''
  const pathOrUrl = typeof source.pathOrUrl === 'string' ? source.pathOrUrl.trim().slice(0, 2_000) : ''
  if (!type || !title || !pathOrUrl) return undefined
  return {
    type,
    title,
    pathOrUrl,
    ...(typeof source.snippet === 'string' ? { snippet: source.snippet.trim().slice(0, 2_000) } : {}),
    ...(typeof source.lineRange === 'string' ? { lineRange: source.lineRange.trim().slice(0, 120) } : {}),
  }
}

export function parseResearchAnswer(value: unknown): ResearchAnswer {
  const parsed = typeof value === 'string' ? parseJsonText(value) : value
  if (!parsed || typeof parsed !== 'object') throw new Error('Resposta estruturada inválida.')
  const source = parsed as Record<string, unknown>
  const findings = typeof source.findings === 'string' ? source.findings.trim().slice(0, 24_000) : ''
  if (!findings) throw new Error('O provedor não retornou uma análise válida.')
  const sources = Array.isArray(source.sources)
    ? source.sources.map(normalizeSource).filter((item): item is ResearchSource => Boolean(item)).slice(0, 20)
    : []
  return { findings, sources }
}

export const RESEARCH_JSON_INSTRUCTION = `Retorne somente JSON válido no formato {"findings":"texto em Markdown","sources":[{"type":"web|project","title":"fonte","pathOrUrl":"URL ou caminho","snippet":"trecho","lineRange":"linhas"}]}. Não use blocos de código ao redor do JSON.`
