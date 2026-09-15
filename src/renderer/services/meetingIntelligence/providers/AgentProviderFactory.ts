import { IAgentProvider } from '../types'
import { CodexProvider } from './CodexProvider'
import { AntigravityProvider } from './AntigravityProvider'
import { LocalLLMProvider } from './LocalLLMProvider'
import { OrchestratedProvider } from './OrchestratedProvider'

export function getAgentProvider(id: 'codex' | 'antigravity' | 'local' | 'auto'): IAgentProvider {
  if (id === 'codex') return new CodexProvider()
  if (id === 'antigravity') return new AntigravityProvider()
  if (id === 'auto') return new OrchestratedProvider()
  return new LocalLLMProvider()
}
