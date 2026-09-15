import { SourceAttribution } from '../types'

function buildFileUrl(projectPath: string, relativePath: string, line: number): string {
  const joined = [projectPath, relativePath]
    .join('/')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')

  const prefixed = joined.startsWith('/') ? `file://${joined}` : `file:///${joined}`
  return `${encodeURI(prefixed)}#L${line}`
}

export interface ProjectSearchResult {
  summary: string
  sources: SourceAttribution[]
}

export class ProjectResearchEngine {
  public static async searchProject(
    projectPath: string,
    query: string
  ): Promise<ProjectSearchResult> {
    if (!projectPath || !query || query.trim().length < 2) {
      return { summary: 'Nenhuma consulta fornecida.', sources: [] }
    }

    try {
      if (!window.electronAPI?.projectSearchText) {
        return {
          summary: 'Busca em projeto não disponível no ambiente atual.',
          sources: [],
        }
      }

      const matches = await window.electronAPI.projectSearchText(projectPath, query)
      if (!matches || matches.length === 0) {
        return {
          summary: `Nenhum resultado direto encontrado no projeto para "${query}".`,
          sources: [],
        }
      }

      const sources: SourceAttribution[] = matches.map((m: { relativePath: string; line: number; lineContent: string }) => ({
        type: 'project' as const,
        title: `${m.relativePath}:${m.line}`,
        pathOrUrl: buildFileUrl(projectPath, m.relativePath, m.line),
        lineRange: `L${m.line}`,
        snippet: m.lineContent,
      }))

      const uniqueFiles = Array.from(new Set(matches.map((m: { relativePath: string }) => m.relativePath)))
      const summary = `Encontrados ${matches.length} trechos em ${uniqueFiles.length} arquivos relacionados a "${query}".\nArquivos principais: ${uniqueFiles.slice(0, 4).join(', ')}.`

      return {
        summary,
        sources: sources.slice(0, 8),
      }
    } catch (err: any) {
      console.warn('[ProjectResearchEngine] Erro na busca do projeto:', err)
      return {
        summary: `Erro ao buscar no projeto: ${err.message}`,
        sources: [],
      }
    }
  }
}
