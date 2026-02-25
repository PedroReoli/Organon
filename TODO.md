## Roadmap do Organon


## Novas Telas Prioritarias (Aprovadas)

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

  - Permite colocar imagens e dados do documento , 

Dados (JSON sugerido):
- `documents.json` com:
  - `documents[]`, `documentCategories[]`, `documentReminders[]`.

### 4) Treinos - permite colocar links de videos e imagens ao mesmo tempo
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

### 8) Check-in Diario de Saude - MELHORAR NA TELA HABITOS 
-> Mudar tela Habitos para Saúde , e la aproveitar a dashboard q ja tem de registrar habitos,amas te partes de cards de Sono , Humor ( tres rostos e check por dia) , 
Ou seja,preservar 90 por cento da mesma tela,porem acrescentar a parte de Sono e Humor
Objetivo:
- Monitorar sinais essenciais do dia para prevenir queda de performance.
### tela de alarme,que permite eu setar horas do dia ou de outro dia e confiugrar alarme com barulhos


## Padrao Tecnico para Todas as Novas Telas
- Cada modulo em JSON proprio (ex.: `crm.json`, `documents.json`).
- Estrutura comum:
  - `version`
  - `items[]`
  - `settings`
  - `updatedAt`
- Integrar no `backup.json` para backup/restauracao completos.
- Suporte a migracao de schema por versao.
