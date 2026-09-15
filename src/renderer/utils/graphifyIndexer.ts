/**
 * graphifyIndexer.ts — Indexador RAG de Grafo em Background.
 *
 * Conforme rule-graphify.md:
 * - Operação opcional em segundo plano.
 * - Falhas de indexação são capturadas sem afetar a execução principal do app.
 * - Conecta entidades de Notas, Tarefas e Finanças em um Grafo de Conhecimento RAG.
 */

import type { Card, Expense, Note } from '@types'

export interface GraphNode {
  id: string
  label: string
  type: 'card' | 'note' | 'expense' | 'project'
  tags: string[]
}

export interface GraphEdge {
  source: string
  target: string
  relation: string
  weight: number
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  lastIndexedAt: string
}

let cachedGraph: GraphData = {
  nodes: [],
  edges: [],
  lastIndexedAt: '',
}

/**
 * Função assíncrona tolerante a falhas para construir o grafo em background
 */
export async function buildGraphifyIndexInBackground(
  cards: Card[],
  notes: Note[],
  expenses: Expense[],
): Promise<GraphData> {
  try {
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []

    // Indexar Cards
    for (const c of cards) {
      nodes.push({
        id: `card:${c.id}`,
        label: c.title || 'Sem título',
        type: 'card',
        tags: (c as any).tags || [],
      })
    }

    // Indexar Notas
    for (const n of notes) {
      nodes.push({
        id: `note:${n.id}`,
        label: n.title || 'Nota Sem Título',
        type: 'note',
        tags: (n as any).tags || [],
      })
    }

    // Indexar Finanças
    for (const e of expenses) {
      nodes.push({
        id: `expense:${e.id}`,
        label: `${e.description} (R$ ${e.amount})`,
        type: 'expense',
        tags: [e.category],
      })
    }

    // Encontrar conexões por tags compartilhadas ou menções de texto
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]

        const sharedTags = a.tags.filter((t) => b.tags.includes(t))
        if (sharedTags.length > 0) {
          edges.push({
            source: a.id,
            target: b.id,
            relation: `tag:${sharedTags[0]}`,
            weight: sharedTags.length,
          })
        }
      }
    }

    cachedGraph = {
      nodes,
      edges,
      lastIndexedAt: new Date().toISOString(),
    }

    return cachedGraph
  } catch (err) {
    console.warn('[GraphifyIndexer] Falha ao construir grafo em background (opcional):', err)
    return cachedGraph
  }
}

export function getCachedGraphData(): GraphData {
  return cachedGraph
}
