/**
 * Template builtin: Vendas (cold email, qualificacao, fechamento).
 * Upgrade 15.
 */

import type { PlaybookTemplate } from '@types'

export const VendasTemplate: PlaybookTemplate = {
  id: 'builtin-vendas',
  name: 'Vendas',
  description: 'Prospeccao, qualificacao, proposta e fechamento',
  icon: 'sales',
  sector: 'Comercial',
  category: 'Vendas',
  summary: 'Fluxo comercial completo com dialogs de cold email, qualificacao BANT e proposta',
  content:
    '<h2>Playbook de Vendas</h2><p>Roteiro para prospeccao e fechamento de negocios. Personalize os dialogs com os nomes do prospect e empresa antes de enviar.</p><h3>Como usar</h3><ul><li>Cold email abre a conversa sem pressao.</li><li>Qualificacao valida BANT (budget, authority, need, timing).</li><li>Proposta formaliza escopo, prazo e valor.</li><li>Follow-up mantem o prospect engajado.</li></ul>',
  dialogs: [
    {
      title: 'Cold email inicial',
      text:
        '<p>Ola <strong>{nome}</strong>,</p><p>Vi que voce e <strong>{cargo}</strong> na <strong>{empresa}</strong> e notei que voces trabalham com <strong>{area}</strong>. Tenho ajudado empresas parecidas a <strong>{beneficio}</strong> e gostaria de entender se isso tambem faz sentido para voces.</p><p>Tem 15 minutos essa semana para uma conversa rapida?</p><p>Abraco,<br><strong>{meu_nome}</strong></p>',
      variables: [
        { key: 'nome', label: 'Nome do prospect', type: 'text', required: true },
        { key: 'cargo', label: 'Cargo do prospect', type: 'text', required: true },
        { key: 'empresa', label: 'Empresa', type: 'text', required: true },
        { key: 'area', label: 'Area de atuacao', type: 'text' },
        { key: 'beneficio', label: 'Beneficio principal', type: 'text' },
        { key: 'meu_nome', label: 'Seu nome', type: 'text', required: true },
      ],
    },
    {
      title: 'Qualificacao BANT',
      text:
        '<p>Oi <strong>{nome}</strong>, obrigado pelo tempo!</p><p>Para eu entender melhor como posso ajudar, tenho algumas perguntas rapidas:</p><ol><li>Qual e o principal desafio hoje em <strong>{area}</strong>?</li><li>Voces ja tem orcamento dedicado para resolver isso?</li><li>Quem mais participa da decisao?</li><li>Qual e a urgencia? Algo para proximo mes, trimestre?</li></ol><p>Com isso eu consigo montar uma proposta bem alinhada.</p>',
      variables: [
        { key: 'nome', label: 'Nome do prospect', type: 'text', required: true },
        { key: 'area', label: 'Area de atuacao', type: 'text' },
      ],
    },
    {
      title: 'Envio de proposta',
      text:
        '<p>Oi <strong>{nome}</strong>,</p><p>Segue a proposta conforme conversamos:</p><ul><li><strong>Escopo:</strong> {escopo}</li><li><strong>Prazo:</strong> {prazo}</li><li><strong>Investimento:</strong> {valor}</li><li><strong>Forma de pagamento:</strong> {forma_pagamento}</li></ul><p>Qualquer duvida, me chame. Posso ajustar o que for preciso.</p>',
      variables: [
        { key: 'nome', label: 'Nome do prospect', type: 'text', required: true },
        { key: 'escopo', label: 'Escopo do trabalho', type: 'text', required: true },
        { key: 'prazo', label: 'Prazo estimado', type: 'text' },
        { key: 'valor', label: 'Valor (R$)', type: 'number' },
        {
          key: 'forma_pagamento',
          label: 'Forma de pagamento',
          type: 'choice',
          choices: ['A vista', 'Parcelado em 2x', 'Parcelado em 3x', 'Mensal'],
        },
      ],
    },
    {
      title: 'Follow-up de proposta',
      text:
        '<p>Oi <strong>{nome}</strong>, tudo bem?</p><p>Passando aqui para saber se conseguiu avaliar a proposta que enviei em <strong>{data_envio}</strong>. Alguma duvida? Qualquer coisa que precisar ajustar e so me falar.</p><p>Fico no aguardo!</p>',
      variables: [
        { key: 'nome', label: 'Nome do prospect', type: 'text', required: true },
        { key: 'data_envio', label: 'Data de envio da proposta', type: 'date' },
      ],
    },
  ],
}
