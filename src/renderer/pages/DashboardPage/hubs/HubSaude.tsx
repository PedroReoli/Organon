import type { AppView } from '@types'

interface HubSaudeProps {
  activeView: AppView
  [key: string]: any
}

export const HubSaude = ({ activeView }: HubSaudeProps) => {
  if (activeView !== ('habits' as any)) return null
  return null
}
