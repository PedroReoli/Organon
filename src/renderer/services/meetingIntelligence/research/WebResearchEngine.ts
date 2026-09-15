import { SourceAttribution } from '../types'

export interface WebSearchResult {
  summary: string
  sources: SourceAttribution[]
}

function decodeDuckDuckGoUrl(href: string): string {
  try {
    const url = new URL(href, 'https://duckduckgo.com')
    const redirected = url.searchParams.get('uddg')
    if (redirected) {
      return decodeURIComponent(redirected)
    }
  } catch {}
  return href
}

function toPlainText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export class WebResearchEngine {
  public static async researchWeb(query: string): Promise<WebSearchResult> {
    const cleanedQuery = query?.trim() || ''
    if (cleanedQuery.length < 2) {
      return { summary: 'Nenhuma consulta de pesquisa web fornecida.', sources: [] }
    }

    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanedQuery)}`

    try {
      const apiResults = await window.electronAPI?.webSearch?.(cleanedQuery)
      const normalizedResults = Array.isArray(apiResults) ? apiResults : []

      const sources: SourceAttribution[] = normalizedResults.slice(0, 5).map((result) => ({
        type: 'web',
        title: toPlainText(result.title || cleanedQuery),
        pathOrUrl: result.url || searchUrl,
        snippet: toPlainText(result.snippet || `Resultado de busca para "${cleanedQuery}".`),
      }))

      if (sources.length === 0) {
        const response = await fetch(searchUrl)
        if (!response.ok) {
          return {
            summary: `Pesquisa web indisponível agora. Abra a busca para "${cleanedQuery}" manualmente.`,
            sources: [
              {
                type: 'web',
                title: `Buscar na web: ${cleanedQuery}`,
                pathOrUrl: searchUrl,
                snippet: 'Resultado temporário da pesquisa.',
              },
            ],
          }
        }

        const html = await response.text()
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        const resultNodes = Array.from(doc.querySelectorAll('a.result__a')).slice(0, 5)

        resultNodes.forEach((node) => {
          const href = decodeDuckDuckGoUrl(node.getAttribute('href') || searchUrl)
          const title = toPlainText(node.textContent || cleanedQuery)
          const snippet =
            toPlainText(
              node.closest('.result')?.querySelector('.result__snippet')?.textContent || ''
            ) || `Resultado de busca para "${cleanedQuery}".`

          sources.push({
            type: 'web',
            title,
            pathOrUrl: href,
            snippet,
          })
        })
      }

      if (sources.length === 0) {
        return {
          summary: `Nenhum resultado estruturado foi encontrado para "${cleanedQuery}", mas a busca foi executada.`,
          sources: [
            {
              type: 'web',
              title: `Buscar na web: ${cleanedQuery}`,
              pathOrUrl: searchUrl,
              snippet: 'Busca executada sem resultados estruturados.',
            },
          ],
        }
      }

      const topTitles = sources.slice(0, 3).map(source => source.title).filter(Boolean)
      return {
        summary: `Pesquisa web executada para "${cleanedQuery}". Fontes sugeridas: ${topTitles.join(', ')}.`,
        sources,
      }
    } catch (err: any) {
      return {
        summary: `Falha ao pesquisar na web: ${err.message || 'erro desconhecido'}.`,
        sources: [
          {
            type: 'web',
            title: `Buscar na web: ${cleanedQuery}`,
            pathOrUrl: searchUrl,
            snippet: 'Fallback para consulta manual.',
          },
        ],
      }
    }
  }
}
