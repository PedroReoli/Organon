import { SystemNode, SystemEdge } from '../types/systemDesign.types'

export function exportToMermaid(nodes: SystemNode[], edges: SystemEdge[]): string {
  let mermaid = '```mermaid\nflowchart TD\n'

  if (nodes.length === 0) {
    return '```mermaid\nflowchart TD\n  empty["Nenhum componente no diagrama"]\n```'
  }

  // Declaração dos nós com ícones e labels
  nodes.forEach(node => {
    const safeLabel = `${node.icon} ${node.label}${node.port ? ` (${node.port})` : ''}`
    mermaid += `  ${node.id}["${safeLabel}"]\n`
  })

  mermaid += '\n'

  // Declaração das conexões
  edges.forEach(edge => {
    const labelText = edge.label ? `|"${edge.label}"|` : ''
    mermaid += `  ${edge.source} -->${labelText} ${edge.target}\n`
  })

  mermaid += '```\n'
  return mermaid
}
