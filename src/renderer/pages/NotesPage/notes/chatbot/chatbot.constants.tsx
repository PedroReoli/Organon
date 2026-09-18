import React from 'react'

export const STORAGE_KEY = 'organon-chatbot-history'
export const AI_CONFIG_KEY = 'organon-ai-config'
export const MAX_HISTORY_MESSAGES = 50

export const CONTEXT_TEMPLATES: Record<string, string> = {
  notes: `Você está no módulo de Notas do Organon. O usuário está visualizando suas notas pessoais.
Contexto: O usuário pode buscar, resumir, expandir e reescrever notas. Pode também criar novas notas.
Formato preferido para resumos: bullet points com os pontos principais.
Ao resumir, identifique os pontos mais importantes e agrupe por tema se aplicável.`,

  cards: `Você está no módulo de Planejamento (Cards/Tarefas) do Organon. O usuário está gerenciando tarefas e projetos.
Contexto: Cards podem ter prioridades, datas, checklists e status. O usuário quer organizarse melhor.
Sugira formas práticas de priorizar e organizar tarefas.`,

  calendar: `Você está no módulo de Calendário do Organon. O usuário está planejando eventos e agendamentos.
Contexto: Eventos têm data, hora, categoria e podem ter lembretes.
Ajud a otimizar a agenda e identificar conflitos.`,

  finance: `Você está no módulo Financeiro do Organon. O usuário está gerenciando finanças pessoais.
Contexto: Inclui despesas, receitas, investimentos, metas de economia e orçamento.
Seja prático com dicas de economia e investimento.`,

  general: `Você é um assistente pessoal inteligente do Organon, um sistema de produtividade pessoal completo.
Módulos disponíveis: Notas, Planejamento (Cards), Calendário, Financeiro, Projetos, Estudos, Apps.
O usuário pode perguntar sobre qualquer módulo e eu vou consultar os dados relevantes.
Seja útil, conciso e proativo em sugerir ações.`,
}

export const SUGGESTIONS_BY_CONTEXT: Record<string, string[]> = {
  notes: [
    'Resuma minhas notas recentes',
    'Que notas tenho sobre projetos?',
    'Crie uma nota sobre...',
    'Compare duas notas',
  ],
  cards: [
    'Priorize minhas tarefas',
    'O que devo fazer hoje?',
    'Analise meu progresso semanal',
    'Sugira como organizar projetos',
  ],
  calendar: [
    'Analise minha agenda',
    'Sugira otimizar meu tempo',
    'Que eventos tenho esta semana?',
    'Crie um lembrete para...',
  ],
  finance: [
    'Analise minhas finanças',
    'Estou dentro do orçamento?',
    'Sugira metas de economia',
    'Como melhorar minha situação?',
  ],
  general: [
    'Dê um resumo do meu dia',
    'O que tenho pendente?',
    'Sugira melhorias para meu sistema',
    'Resumo geral de tudo',
  ],
}

export const Icons = {
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  bot: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  ),
  mic: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
  micOff: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  ),
  download: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  minimize: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  lightbulb: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
}

export const TypingIndicator: React.FC = () => (
  <div className="chatbot-typing">
    <span></span>
    <span></span>
    <span></span>
  </div>
)
