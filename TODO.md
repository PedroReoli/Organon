## Roadmap do Organon

## Base do Produto (Infra e Qualidade)
- Versionamento do app e migracoes de dados por versao.
- Melhorar sistema de configuracoes (organizacao, UX e seguranca).
- Botao de reset de dados com confirmacao forte e layout consistente.
- Melhorar modulo de Apps (cadastro, edicao e gerenciamento de executaveis/macros).
- App rodar em segundo plano (tray + minimizar sem fechar).
- Melhorar sistema de notas (desempenho, organizacao e busca).
- Backup melhorado:
  - Cada tela em JSON separado.
  - Manifesto `backup.json` com caminhos dos JSONs.
  - Backup completo com `notes/`, `files/`, `meetings/`.

## Novas Telas Prioritarias (Aprovadas)

### 1) CRM Pessoal (Kanban de Contatos)
Objetivo:
- Gerenciar relacionamentos pessoais/profissionais com historico e follow-up.

Como deve ficar:
- Layout em Kanban, no estilo do Planejamento.
- Colunas sugeridas: `Novo`, `Ativo`, `Aguardando`, `Follow-up`, `Concluido`.
- Cards de contato com informacoes resumidas e tags.

O que precisa ter:
- Card de contato:
  - Nome, empresa, cargo, telefone, e-mail, rede social.
  - Contexto (onde conheceu), interesses, nivel de prioridade.
  - Proxima acao e data de follow-up.
  - Ultima interacao e notas rapidas.
- Filtros:
  - Por prioridade, tag, status e "atrasado".
- Acoes rapidas:
  - "Registrar contato agora", "Agendar follow-up", "Mover de etapa".
- Historico por contato:
  - Linha do tempo de interacoes.

Dados (JSON sugerido):
- `crm.json` com:
  - `contacts[]`, `stages[]`, `interactions[]`, `tags[]`.

### 2) Cofre de Documentos
Objetivo:
- Centralizar documentos importantes com validade e lembretes.

Como deve ficar:
- Lista por categoria + painel lateral de detalhes.
- Destaque de documentos proximos ao vencimento.

O que precisa ter:
- Cadastro de documento:
  - Tipo, numero, emissor, emissao, validade, observacoes.
  - Arquivo associado (PDF/Imagem) opcional.
- Categorias:
  - Pessoal, trabalho, financeiro, saude, veiculo, imovel.
- Alertas:
  - Notificar antes do vencimento (30/15/7 dias).
- Busca:
  - Por nome, categoria, status de validade.

Dados (JSON sugerido):
- `documents.json` com:
  - `documents[]`, `documentCategories[]`, `documentReminders[]`.

### 3) Pipeline de Oportunidades
Objetivo:
- Controlar oportunidades de trabalho/freela/vendas em etapas.

Como deve ficar:
- Kanban por etapa comercial.
- Cards com valor potencial, probabilidade e proximo passo.

O que precisa ter:
- Etapas sugeridas:
  - `Lead`, `Qualificacao`, `Proposta`, `Negociacao`, `Fechado`, `Perdido`.
- Card de oportunidade:
  - Nome, cliente, canal de origem, valor, probabilidade.
  - Proxima acao + data.
  - Motivo de perda (quando aplicavel).
- Indicadores:
  - Taxa de conversao, ticket medio, tempo medio por etapa.

Dados (JSON sugerido):
- `opportunities.json` com:
  - `opportunities[]`, `pipelineStages[]`, `activityLog[]`.

### 4) Treinos
Objetivo:
- Planejar e acompanhar treinos com evolucao real.

Como deve ficar:
- Visao semanal + detalhe do treino do dia.
- Blocos por grupo muscular/modalidade.

O que precisa ter:
- Plano de treino:
  - Exercicios, series, repeticoes, carga, descanso.
- Diario:
  - Execucao real, percepcao de esforco, observacoes.
- Evolucao:
  - Progressao por exercicio (carga/volume/frequencia).
- Rotina:
  - Templates (A/B/C, full body, corrida, mobilidade).

Dados (JSON sugerido):
- `workouts.json` com:
  - `plans[]`, `sessions[]`, `exerciseLogs[]`, `exerciseLibrary[]`.

### 5) Painel de Foco
Objetivo:
- Aumentar foco no trabalho diario com blocos de concentracao.

Como deve ficar:
- Tela limpa, cronometro central, tarefa atual em destaque.

O que precisa ter:
- Modos:
  - Pomodoro, foco livre, timebox.
- Sessoes:
  - Inicio/fim, interrupcoes, tarefa associada.
- Metricas:
  - Tempo focado por dia/semana, streak, taxa de conclusao.
- Acoes:
  - "Iniciar foco", "Pausar", "Encerrar e registrar".

Dados (JSON sugerido):
- `focus.json` com:
  - `focusSessions[]`, `focusSettings`, `dailyFocusSummary[]`.

### 6) Mapa de Decisao
Objetivo:
- Tirar decisoes com clareza, reduzindo impulso e retrabalho.

Como deve ficar:
- Layout em 3 painéis:
  - Contexto e problema.
  - Opcoes comparadas.
  - Decisao final e plano de execucao.
- Visual principal: matriz `Impacto x Esforco` + score por opcao.

O que precisa ter:
- Cadastro de decisao:
  - Tema, contexto, prazo limite, area da vida/projeto.
- Opcoes:
  - Cada opcao com pros, contras, custo, risco, reversibilidade.
- Criterios ponderados:
  - Ex.: tempo, dinheiro, impacto, alinhamento com meta, risco.
  - Peso por criterio (0-10) + nota por opcao.
- Resultado:
  - Opcao vencedora, justificativa e proximo passo.
- Revisao:
  - Revisitar em 7/30 dias para validar se foi boa decisao.

Dados (JSON sugerido):
- `decision-map.json` com:
  - `decisions[]`, `options[]`, `criteria[]`, `decisionReviews[]`.

### 7) Cofre de Prompts e Playbooks
Objetivo:
- Reutilizar raciocinios e instrucoes prontas para trabalho e vida pessoal.

Como deve ficar:
- Biblioteca com duas visoes:
  - Lista (rápida para busca).
  - Cards (foco em contexto e qualidade).
- Painel de detalhe com versoes e exemplos de uso.

O que precisa ter:
- Entidades principais:
  - Prompt (texto base + tags + objetivo).
  - Playbook (passo a passo operacional).
- Metadados:
  - Categoria, quando usar, quando NAO usar, input esperado, output esperado.
- Qualidade:
  - Nota de efetividade, ultima execucao, tempo economizado estimado.
- Versionamento:
  - Historico de alteracoes por prompt/playbook.
- Acoes:
  - Duplicar, favoritar, fixar, exportar, criar template.

Dados (JSON sugerido):
- `prompt-vault.json` com:
  - `prompts[]`, `playbooks[]`, `promptRuns[]`, `promptVersions[]`, `tags[]`.

### 8) Check-in Diario de Saude
Objetivo:
- Monitorar sinais essenciais do dia para prevenir queda de performance.

Como deve ficar:
- Tela simples com check-in de 2-3 minutos.
- Cards de status: `Sono`, `Humor`, `Energia`, `Dor`, `Estresse`.

O que precisa ter:
- Registro diario:
  - Escalas (0-10) + notas livres.
- Tendencias:
  - Grafico semanal/mensal por indicador.
- Alertas:
  - Queda recorrente de energia/humor acima de limiar.
- Acoes sugeridas:
  - Ex.: “dormir mais cedo”, “reduzir cafeina”, “pausa ativa”.

Dados (JSON sugerido):
- `health-checkin.json` com:
  - `checkins[]`, `metricsConfig`, `alerts[]`.

### 9) Medicação e Suplementos
Objetivo:
- Garantir adesao correta de medicações e suplementos.

Como deve ficar:
- Timeline diaria com horarios.
- Estado visual por dose: `pendente`, `tomado`, `atrasado`, `pulado`.

O que precisa ter:
- Cadastro:
  - Nome, dose, unidade, horario, frequencia, observacoes.
- Controle:
  - Marcar tomado/pulado + motivo.
- Estoque:
  - Quantidade restante + alerta de reposicao.
- Seguranca:
  - Alertas de conflito/duplicidade (regras simples inicialmente).

Dados (JSON sugerido):
- `meds.json` com:
  - `medications[]`, `doses[]`, `stock[]`, `medAlerts[]`.

### 10) Exames e Consultas
Objetivo:
- Organizar agenda de saude e historico clinico.

Como deve ficar:
- Calendario de consultas/exames + lista de pendencias.
- Painel de documentos/resultados por especialidade.

O que precisa ter:
- Agenda:
  - Data, profissional, local, preparo, lembrete.
- Historico:
  - Resultado, observacoes, anexos e retorno recomendado.
- Vencimentos:
  - Exames de rotina com periodicidade.
- Busca:
  - Por especialidade, tipo de exame e periodo.

Dados (JSON sugerido):
- `medical-care.json` com:
  - `appointments[]`, `exams[]`, `examResults[]`, `medicalReminders[]`.

### 11) Diario de Exercicios (Real)
Objetivo:
- Focar na execucao real de exercicios e consistencia semanal.

Como deve ficar:
- Diario por dia + visao semanal com progresso.
- Entrada rapida por exercicio executado.

O que precisa ter:
- Registro:
  - Exercicio, series, reps, carga, RPE, tempo de descanso.
- Check de consistencia:
  - Dias treinados vs. meta semanal.
- Evolucao:
  - Progressao por exercicio e por grupamento.
- Recuperacao:
  - Dor muscular, fadiga e qualidade do treino.

Dados (JSON sugerido):
- `exercise-diary.json` com:
  - `exerciseEntries[]`, `exerciseTemplates[]`, `weeklyGoals[]`, `recoveryLogs[]`.

### 12) Assistente Nutricional
Objetivo:
- Manter alimentacao alinhada com objetivo (emagrecer, manter, ganhar massa).

Como deve ficar:
- Dashboard diario:
  - Refeicoes, agua, meta calórica/macros, aderencia.
- Planejador semanal com lista automatica de compras.

O que precisa ter:
- Perfil e meta:
  - Objetivo, calorias alvo, macros alvo.
- Registro alimentar:
  - Refeicao, horario, alimento, quantidade, observacao.
- Sugestoes:
  - Ajustes de refeicao baseados no restante do dia.
- Compras:
  - Gera lista por plano semanal.

Dados (JSON sugerido):
- `nutrition-assistant.json` com:
  - `nutritionProfile`, `mealLogs[]`, `mealPlans[]`, `shoppingLists[]`, `hydrationLogs[]`.



## Padrao Tecnico para Todas as Novas Telas
- Cada modulo em JSON proprio (ex.: `crm.json`, `documents.json`).
- Estrutura comum:
  - `version`
  - `items[]`
  - `settings`
  - `updatedAt`
- Integrar no `backup.json` para backup/restauracao completos.
- Suporte a migracao de schema por versao.

## Integracao e Automacao com n8n
- Centralizar leads de todos os meus sites em uma planilha unica (Google Sheets/Airtable).
- Incluir coluna obrigatoria `origem_site` para identificar de qual site cada lead veio.
- Receber leads via webhook no n8n e normalizar os campos antes de salvar.
- Sincronizar os leads dessa planilha para cair automaticamente no app (modulo CRM).
