import { CodeReportsView } from '@Projects/reports/CodeReportsView'
import type { AppView } from '@shared/InternalNav'

type HubTrabalhoProps = {
  activeView: AppView
  reportsDir?: string | null
  dataDir?: string | null
  onUpdateReportsDir?: (dir: string) => void
}

export const HubTrabalho = ({
  activeView,
  reportsDir,
  dataDir,
  onUpdateReportsDir,
}: HubTrabalhoProps) => {
  if (activeView === 'projects') {
    return <CodeReportsView reportsDir={reportsDir} dataDir={dataDir} onUpdateReportsDir={onUpdateReportsDir} />
  }

  return null
}
