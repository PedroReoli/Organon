export function fixMojibake(text: string): string {
  if (!text) return text
  if (!text.includes('\u00c3') && !text.includes('\u00c2') && !text.includes('\ufffd')) return text

  try {
    return decodeURIComponent(escape(text))
  } catch {
    return text
  }
}

export function extractHotwords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[^A-Za-z\u00c0-\u00ff0-9_.+-]+/g)
        .map(item => item.trim())
        .filter(item => item.length >= 4)
    )
  ).slice(0, 16)
}

export function getAgentProviderLabel(agentProviderId?: 'codex' | 'antigravity' | 'local' | 'auto'): string {
  if (agentProviderId === 'codex') return 'Codex AI Orchestrator'
  if (agentProviderId === 'antigravity') return 'Antigravity Agent'
  if (agentProviderId === 'local') return 'Local LLM Agent'
  return 'Codex + Antigravity Orchestrator'
}
