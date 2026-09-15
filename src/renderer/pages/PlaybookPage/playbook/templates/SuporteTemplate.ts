/**
 * Template builtin: Suporte ao cliente (primeiro contato, follow-up, escalonamento).
 * Upgrade 15.
 */

import type { PlaybookTemplate } from '@types'

export const SuporteTemplate: PlaybookTemplate = {
  id: 'builtin-suporte',
  name: 'Suporte',
  description: 'Atendimento, follow-up e escalonamento de tickets',
  icon: 'support',
  sector: 'Operacional',
  category: 'Suporte',
  summary: 'Fluxo de atendimento com primeiro contato, acompanhamento e escalonamento',
  content:
    '<h2>Playbook de Suporte</h2><p>Respostas padrao para atendimento ao cliente. Personalize com os dados do ticket antes de enviar.</p><p><strong>Boas praticas:</strong></p><ul><li>Sempre reconhecer o problema antes de propor solucao.</li><li>Usar primeiro nome do cliente.</li><li>Dar prazo concreto quando for escalar.</li></ul>',
  dialogs: [
    {
      title: 'Primeiro contato',
      text:
        '<p>Ola <strong>{nome}</strong>, tudo bem?</p><p>Recebi sua solicitacao sobre <strong>{assunto}</strong> e ja estou analisando.</p><p>Vou precisar de alguns detalhes para resolver o mais rapido possivel:</p><ol><li>Quando o problema comecou?</li><li>Voce consegue descrever o que esperava que acontecesse?</li><li>Tem alguma imagem ou log do erro?</li></ol><p>Assim que responder, volto com a solucao.</p>',
      variables: [
        { key: 'nome', label: 'Nome do cliente', type: 'text', required: true },
        { key: 'assunto', label: 'Assunto do ticket', type: 'text', required: true },
      ],
    },
    {
      title: 'Follow-up sem resposta',
      text:
        '<p>Oi <strong>{nome}</strong>, tudo bem?</p><p>Passando aqui para saber se o problema com <strong>{assunto}</strong> foi resolvido ou se ainda precisa de ajuda. Fico no aguardo!</p>',
      variables: [
        { key: 'nome', label: 'Nome do cliente', type: 'text', required: true },
        { key: 'assunto', label: 'Assunto do ticket', type: 'text', required: true },
      ],
    },
    {
      title: 'Escalonamento para o time',
      text:
        '<p>Ola <strong>{nome}</strong>,</p><p>Analisei sua solicitacao e precisa do time de <strong>{time}</strong> para seguir. Ja escalei o ticket <strong>#{ticket_id}</strong> e voce tera retorno em ate <strong>{prazo_horas} horas</strong>.</p><p>Obrigado pela paciencia.</p>',
      variables: [
        { key: 'nome', label: 'Nome do cliente', type: 'text', required: true },
        {
          key: 'time',
          label: 'Time responsavel',
          type: 'choice',
          choices: ['Engenharia', 'Financeiro', 'Produto', 'Juridico'],
        },
        { key: 'ticket_id', label: 'ID do ticket', type: 'text' },
        { key: 'prazo_horas', label: 'Prazo em horas', type: 'number', defaultValue: '24' },
      ],
    },
    {
      title: 'Resolucao e encerramento',
      text:
        '<p>Ola <strong>{nome}</strong>,</p><p>O problema com <strong>{assunto}</strong> foi resolvido. <strong>Causa:</strong> {causa}. <strong>Correcao aplicada:</strong> {correcao}.</p><p>Caso volte a acontecer, e so responder este ticket. Obrigado pelo contato!</p>',
      variables: [
        { key: 'nome', label: 'Nome do cliente', type: 'text', required: true },
        { key: 'assunto', label: 'Assunto do ticket', type: 'text' },
        { key: 'causa', label: 'Causa raiz', type: 'text' },
        { key: 'correcao', label: 'Correcao aplicada', type: 'text' },
      ],
    },
  ],
}
