/**
 * Template builtin: Reunioes (agenda, ata, follow-up).
 * Upgrade 15.
 */

import type { PlaybookTemplate } from '@types'

export const ReunioesTemplate: PlaybookTemplate = {
  id: 'builtin-reunioes',
  name: 'Reunioes',
  description: 'Agenda, ata e follow-up de reuniao',
  icon: 'meeting',
  sector: 'Interno',
  category: 'Reunioes',
  summary: 'Estrutura basica para conduzir reunioes: agenda previa, ata e follow-up pos-reuniao',
  content:
    '<h2>Playbook de Reunioes</h2><p>Estrutura padrao para conduzir reunioes produtivas. Use a agenda previa para alinhar expectativas, a ata para registrar decisoes e o follow-up para garantir acoes.</p>',
  dialogs: [
    {
      title: 'Agenda previa',
      text:
        '<p>Oi pessoal,</p><p>Vamos nos reunir em <strong>{data_reuniao}</strong> as <strong>{horario}</strong> para falar sobre <strong>{topico}</strong>.</p><p><strong>Agenda ({duracao_minutos} min):</strong></p><ol><li>Contexto (5 min)</li><li>Discussao principal ({tempo_discussao} min)</li><li>Decisoes e proximos passos (10 min)</li></ol><p><strong>Material previo:</strong> {material}</p><p>Tragam duvidas e ideias!</p>',
      variables: [
        { key: 'data_reuniao', label: 'Data da reuniao', type: 'date', required: true },
        { key: 'horario', label: 'Horario', type: 'text', required: true },
        { key: 'topico', label: 'Topico principal', type: 'text', required: true },
        { key: 'duracao_minutos', label: 'Duracao total (min)', type: 'number', defaultValue: '60' },
        { key: 'tempo_discussao', label: 'Tempo de discussao (min)', type: 'number', defaultValue: '30' },
        { key: 'material', label: 'Material previo (link)', type: 'text' },
      ],
    },
    {
      title: 'Ata de reuniao',
      text:
        '<h3>Ata - {topico}</h3><p><strong>Data:</strong> {data_reuniao}<br><strong>Participantes:</strong> {participantes}</p><h4>Pontos discutidos</h4><ul><li>{ponto1}</li><li>{ponto2}</li><li>{ponto3}</li></ul><h4>Decisoes</h4><ul><li>{decisao1}</li><li>{decisao2}</li></ul><h4>Proximos passos</h4><ul><li><strong>{responsavel1}:</strong> {acao1} ate {prazo1}</li><li><strong>{responsavel2}:</strong> {acao2} ate {prazo2}</li></ul>',
      variables: [
        { key: 'topico', label: 'Topico principal', type: 'text', required: true },
        { key: 'data_reuniao', label: 'Data', type: 'date', required: true },
        { key: 'participantes', label: 'Participantes', type: 'text' },
        { key: 'ponto1', label: 'Ponto 1', type: 'text' },
        { key: 'ponto2', label: 'Ponto 2', type: 'text' },
        { key: 'ponto3', label: 'Ponto 3', type: 'text' },
        { key: 'decisao1', label: 'Decisao 1', type: 'text' },
        { key: 'decisao2', label: 'Decisao 2', type: 'text' },
        { key: 'responsavel1', label: 'Responsavel 1', type: 'text' },
        { key: 'acao1', label: 'Acao 1', type: 'text' },
        { key: 'prazo1', label: 'Prazo 1', type: 'date' },
        { key: 'responsavel2', label: 'Responsavel 2', type: 'text' },
        { key: 'acao2', label: 'Acao 2', type: 'text' },
        { key: 'prazo2', label: 'Prazo 2', type: 'date' },
      ],
    },
    {
      title: 'Follow-up pos-reuniao',
      text:
        '<p>Oi pessoal,</p><p>Segue um resumo rapido do que conversamos na reuniao de <strong>{data_reuniao}</strong>:</p><ul><li><strong>Principal decisao:</strong> {decisao_principal}</li><li><strong>Proxima acao:</strong> {proxima_acao}</li><li><strong>Prazo:</strong> {prazo}</li></ul><p>Ata completa em anexo. Qualquer duvida, me chame.</p>',
      variables: [
        { key: 'data_reuniao', label: 'Data da reuniao', type: 'date', required: true },
        { key: 'decisao_principal', label: 'Decisao principal', type: 'text', required: true },
        { key: 'proxima_acao', label: 'Proxima acao', type: 'text' },
        { key: 'prazo', label: 'Prazo', type: 'date' },
      ],
    },
  ],
}
