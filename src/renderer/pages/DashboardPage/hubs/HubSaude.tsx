import type { ComponentProps } from 'react'
import { HabitsView } from '../HabitsView'
import type { AppView } from '../InternalNav'

type HubSaudeProps = { activeView: AppView } & ComponentProps<typeof HabitsView>

export const HubSaude = ({ activeView, ...props }: HubSaudeProps) => {
  if (activeView !== 'habits') return null
  return <HabitsView {...props} />
}
