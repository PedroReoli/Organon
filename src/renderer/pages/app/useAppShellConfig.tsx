import React, { useMemo } from 'react'
import type { AppView } from '../shared/InternalNav'
import { APP_VIEW_LABELS } from './app.constants'

export interface AppShellConfigProps {
  activeView: AppView
  cards: any[]
  projects: any[]
  notes: any[]
  study: any
  currentHub: any
  lastSyncAt: any
  addCard: (title: string) => void
  addNote: (title: string, content: string) => void
  isChatOpen: boolean
  setIsChatOpen: React.Dispatch<React.SetStateAction<boolean>>
  setShowVoiceModal: (val: boolean) => void
  setShowLocalSyncModal: (val: boolean) => void
  setShowUpdateModal: (val: boolean) => void
}

export function useAppShellConfig({
  activeView,
  cards,
  projects,
  notes,
  study,
  currentHub,
  lastSyncAt,
  addCard,
  addNote,
  isChatOpen,
  setIsChatOpen,
  setShowVoiceModal,
  setShowLocalSyncModal,
  setShowUpdateModal,
}: AppShellConfigProps) {
  return useMemo(() => {
    const buildConfig = () => {
      const defaultHub = currentHub?.label || 'Organon'
      const defaultView = APP_VIEW_LABELS[activeView] || activeView

      switch (activeView) {
        case 'projects':
          return {
            hubTitle: 'Operação',
            viewTitle: 'Projetos & Git',
            metricsText: `${projects.length} repositórios monitorados · Organon Git Engine`,
            actions: [
              { label: '+ Novo Card', onClick: () => addCard('Novo projeto/task'), variant: 'primary' as const },
              { label: 'Varredura Git', onClick: () => { (window as any).electronAPI?.gitEngine?.scan?.() } },
            ],
          }
        case 'okrs':
          return {
            hubTitle: 'Planejamento',
            viewTitle: 'OKRs & Metas',
            metricsText: 'Acompanhamento de Objetivos e Resultados-Chave (KRs)',
            actions: [
              { label: '+ Novo Card', onClick: () => addCard('Meta OKR'), variant: 'primary' as const },
            ],
          }
        case 'notes':
          return {
            hubTitle: 'Conhecimento',
            viewTitle: 'Notas & Documentos',
            metricsText: `${notes.length} anotações salvas no ecossistema`,
            actions: [
              { label: '+ Nova Nota', onClick: () => addNote('Nova Nota', ''), variant: 'primary' as const },
            ],
          }
        case 'study':
          return {
            hubTitle: 'Foco',
            viewTitle: 'Modo Foco & Pomodoro',
            metricsText: `${study.goals.length} metas · ${study.sessions.length} sessões concluídas`,
            actions: [
              { label: 'Ditado de Voz', onClick: () => setShowVoiceModal(true), variant: 'primary' as const },
            ],
          }
        case 'settings':
        case 'history':
          return {
            hubTitle: 'Sistema',
            viewTitle: 'Configurações & Histórico',
            metricsText: `Sincronização Local Wi-Fi Ativa · ${lastSyncAt ? 'Sincronizado' : 'Pronto'}`,
            actions: [
              { label: 'Wi-Fi QR Sync', onClick: () => setShowLocalSyncModal(true), variant: 'primary' as const },
              { label: 'Atualizações', onClick: () => setShowUpdateModal(true) },
            ],
          }
        default:
          const pending = cards.filter((c) => c.status !== 'done').length
          return {
            hubTitle: defaultHub,
            viewTitle: defaultView,
            metricsText: `${pending} cards pendentes · ${projects.length} repositórios monitorados`,
            actions: [
              { label: '+ Novo Card', onClick: () => addCard('Nova tarefa'), variant: 'primary' as const },
              { label: 'Ditado de Voz', onClick: () => setShowVoiceModal(true) },
            ],
          }
      }
    }

    const cfg = buildConfig()
    const chatAction = {
      label: isChatOpen ? 'Fechar IA' : 'Chat IA',
      onClick: () => setIsChatOpen((prev) => !prev),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
      variant: isChatOpen ? ('primary' as const) : undefined,
    }

    return {
      hubTitle: cfg.hubTitle,
      viewTitle: cfg.viewTitle,
      metricsText: cfg.metricsText,
      footerActions: [...cfg.actions, chatAction],
    }
  }, [
    activeView,
    cards,
    projects,
    notes,
    study,
    currentHub,
    lastSyncAt,
    addCard,
    addNote,
    isChatOpen,
    setIsChatOpen,
    setShowVoiceModal,
    setShowLocalSyncModal,
    setShowUpdateModal,
  ])
}
