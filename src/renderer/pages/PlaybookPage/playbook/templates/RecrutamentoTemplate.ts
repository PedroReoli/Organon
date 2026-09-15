/**
 * Template builtin: Recrutamento (convite, rejeicao, oferta).
 * Upgrade 15.
 */

import type { PlaybookTemplate } from '@types'

export const RecrutamentoTemplate: PlaybookTemplate = {
  id: 'builtin-recrutamento',
  name: 'Recrutamento',
  description: 'Convite, rejeicao e oferta para candidatos',
  icon: 'recruit',
  sector: 'RH',
  category: 'Recrutamento',
  summary: 'Fluxo de recrutamento com convite, feedback negativo e oferta de contratacao',
  content:
    '<h2>Playbook de Recrutamento</h2><p>Comunicacao com candidatos em cada etapa do funil. Personalize antes de enviar, especialmente o feedback negativo que deve ser humano.</p>',
  dialogs: [
    {
      title: 'Convite para entrevista',
      text:
        '<p>Ola <strong>{nome}</strong>, tudo bem?</p><p>Recebemos sua candidatura para a vaga de <strong>{vaga}</strong> e gostariamos de te convidar para uma entrevista com nosso time.</p><p>A entrevista tem duracao de aproximadamente <strong>{duracao_minutos} minutos</strong> e sera sobre <strong>{topico}</strong>.</p><p>Voce tem disponibilidade em <strong>{data_sugerida}</strong>? Se nao, me manda 2 ou 3 horarios alternativos.</p><p>Abraco,<br><strong>{recrutador}</strong></p>',
      variables: [
        { key: 'nome', label: 'Nome do candidato', type: 'text', required: true },
        { key: 'vaga', label: 'Nome da vaga', type: 'text', required: true },
        { key: 'duracao_minutos', label: 'Duracao (min)', type: 'number', defaultValue: '45' },
        { key: 'topico', label: 'Topico da entrevista', type: 'text' },
        { key: 'data_sugerida', label: 'Data sugerida', type: 'date' },
        { key: 'recrutador', label: 'Nome do recrutador', type: 'text', required: true },
      ],
    },
    {
      title: 'Feedback negativo (rejeicao)',
      text:
        '<p>Ola <strong>{nome}</strong>,</p><p>Primeiro, obrigado pelo tempo e pelo interesse na vaga de <strong>{vaga}</strong>. Infelizmente nesse momento optamos por seguir com outro candidato que se alinhou mais com o perfil que buscamos.</p><p>Isso nao diminui suas qualidades. Vamos guardar seu contato e, caso surja outra oportunidade que combine mais, te procuramos.</p><p>Desejo muito sucesso no processo seletivo!</p><p>Abraco,<br><strong>{recrutador}</strong></p>',
      variables: [
        { key: 'nome', label: 'Nome do candidato', type: 'text', required: true },
        { key: 'vaga', label: 'Nome da vaga', type: 'text', required: true },
        { key: 'recrutador', label: 'Nome do recrutador', type: 'text', required: true },
      ],
    },
    {
      title: 'Carta de oferta',
      text:
        '<p>Ola <strong>{nome}</strong>,</p><p>Temos o prazer de oferecer a voce a posicao de <strong>{vaga}</strong> na <strong>{empresa}</strong>!</p><p><strong>Detalhes:</strong></p><ul><li><strong>Data de inicio:</strong> {data_inicio}</li><li><strong>Remuneracao:</strong> R$ {salario}</li><li><strong>Modalidade:</strong> {modalidade}</li><li><strong>Beneficios:</strong> {beneficios}</li></ul><p>Aguardamos sua resposta ate <strong>{prazo_resposta}</strong>. Qualquer duvida, estou a disposicao.</p>',
      variables: [
        { key: 'nome', label: 'Nome do candidato', type: 'text', required: true },
        { key: 'vaga', label: 'Cargo', type: 'text', required: true },
        { key: 'empresa', label: 'Empresa', type: 'text', required: true },
        { key: 'data_inicio', label: 'Data de inicio', type: 'date' },
        { key: 'salario', label: 'Salario base', type: 'number' },
        {
          key: 'modalidade',
          label: 'Modalidade',
          type: 'choice',
          choices: ['Presencial', 'Remoto', 'Hibrido'],
        },
        { key: 'beneficios', label: 'Beneficios inclusos', type: 'text' },
        { key: 'prazo_resposta', label: 'Prazo de resposta', type: 'date' },
      ],
    },
  ],
}
