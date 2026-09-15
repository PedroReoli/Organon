import type { ComponentProps } from 'react'
import { StudyView } from '@Study/StudyPage'
import type { AppView } from '@shared/InternalNav'

type HubEstudosProps = { activeView: AppView } & ComponentProps<typeof StudyView>

export const HubEstudos = ({ activeView, ...props }: HubEstudosProps) => {
  if (activeView !== 'study') return null
  return <StudyView {...props} />
}
