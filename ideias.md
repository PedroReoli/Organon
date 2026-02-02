# Ideias para melhorias (backlog)

## Prioridade + Status + Progresso (P1–P4)

**Não precisa ser uma nova tela obrigatoriamente.** Pode ser:
- Um atributo do **Card** e/ou **Evento** (`priority`, `status`).
- UI distribuída nas telas atuais (Planner, Dashboard, Calendar) com:
  - chips de prioridade/status,
  - filtros rápidos,
  - contadores e barras de progresso.

Possíveis abordagens:
- **Sem nova tela:** adicionar filtros no Planner + um bloco “Progresso da semana” no Dashboard.
- **Com nova tela (opcional):** uma view “Relatórios”/“Progresso” com gráficos e histórico semanal.
- **Config em Settings:** habilitar/desabilitar prioridade/status, regras de exibição, cores.

Sugestões de modelagem:
- Prioridade: `P1` (crítico), `P2`, `P3`, `P4` (baixa).
- Status: `todo`/`in_progress`/`blocked`/`done` (ou similar).
- Progresso semanal:
  - % por status (ex: Done/Total),
  - por período (manhã/tarde/noite),
  - por prioridade (quantos P1 ainda abertos),
  - “tendência” vs semana passada.

## Recorrência avançada (eventos)

Extensões além de diário/semanal/mensal:
- Semanal com seleção de dias (Seg/Qua/Sex).
- Mensal “todo dia X” (ex: dia 5) e “1º/2º/último dia útil”.
- Regras “a cada N semanas”, “a cada N meses”.
- Exceções: “pular esta ocorrência”, “editar só esta ocorrência”, “editar a série”.
- Fuso horário e comportamento em horário de verão (se for relevante).
- Copiar agenda recorrente para outra data/semana.

## Lembretes avançados

Melhorias em notificações:
- Múltiplos lembretes por evento (ex: 1 dia antes + 1h antes).
- Snooze (10m/30m/1h).
- “Não notificar” em modo foco / fora do horário definido.
- Centro de notificações interno (histórico do que disparou).
- Repetir lembrete até confirmar (para eventos críticos).
- Ações rápidas: “Abrir evento”, “Marcar como feito”, “Sonecar”.

## Agenda do dia (na Dashboard)

Uma seção “Agenda de Hoje” no Dashboard:
- Timeline por hora (ordena eventos + cards com hora).
- Separar “Dia todo” no topo.
- Sugestão automática de período para itens sem hora.
- “Próximo item” com destaque e contagem regressiva.
- Quick actions: adiar 15min, mover para tarde/noite, concluir.

## Preview para PDF (Arquivos)

Ideias:
- Thumbnail gerado na importação (cache local).
- Visualizador embutido (zoom, páginas, busca no PDF).
- Marcar páginas favoritas + anotações rápidas.
- OCR opcional (pesado, mas útil para busca).
- Categorias/tags para PDFs.

## Mais ideias (geral)

### Organização e produtividade
- Tags globais + “coleções” (views salvas).
- Templates de cards/eventos (“Reunião”, “Estudo”, “Treino”).
- Checklists dentro do card (subtarefas rápidas).
- “Dependências” (bloqueado por X).
- “Tempo estimado” + “tempo gasto” (manual).

## Ideias para programadores (Git/Dev)

### Tela nova: Kanban / Fluxo
- View “Kanban” com colunas por **status** (`Todo`, `Em andamento`, `Bloqueado`, `Feito`) e swimlanes por **prioridade** (P1–P4) ou por **dia**.
- WIP limits por coluna (ex: máx 3 em “Em andamento”).
- SLA visual: cards P1 envelhecendo ficam destacados.
- “Mover para Feito” pede nota rápida (o que foi entregue) para virar changelog semanal.

### Code snippets / Clipboard inteligente
- Snippets com linguagem e highlight (para comandos úteis).
- Histórico “comandos que funcionaram” (ex: scripts de build).
- “Run snippet” no Electron (com segurança: whitelist de comandos).

###  Pomodoro
- Pomodoro por card com logging (tempo gasto).
- Estatísticas: tempo por tipo (bug/feature), por prioridade, por projeto.(dev opcomaçl)

## Rotinas / Hábitos (pilar offline)

### Hábitos “quantas vezes por dia”
- Ex: “Beber água (8x)”: você marca bolinhas até completar (8/8).
- Progresso do dia + resumo no fim do dia.

### Tipos de hábito
- **Contagem** (8x), **Sim/Não** (meditar), **Tempo** (30min), **Quantidade** (10 páginas).
- Cada tipo com UI de check adequada.

### Janelas do dia
- Manhã/Tarde/Noite como seções (checklist por período).
- Reordenação “gentil” do que está atrasado (sem punição).

### Templates de rotina
- “Rotina da manhã”, “Rotina de estudos”, “Rotina de limpeza”.
- Duplicar template e customizar.

### Modo mínimo (não quebrar sequência)
- Definir um “mínimo aceitável” (ex: 5min) e marcar como “feito no mínimo”.
- Mantém consistência sem pressão.

### Gatilho + motivo (opcional)
- “Quando/onde”: após escovar os dentes, antes de dormir, etc.
- “Por que faço”: reforço de intenção.

### Frequência semanal (não só diária)
- Ex: “Academia 3x/semana” com meta semanal.
- Dias específicos (seg/qua/sex) + metas flexíveis.

### “Pular hoje” com motivo (sem culpa)
- Marcação de exceção: doente/viagem/feriado.
- Histórico simples para entender padrões.

### Revisão semanal de hábitos
- Top 3 hábitos consistentes, top 3 mais difíceis.
- Ajustar metas (8x → 6x) com sugestão baseada no histórico.

## Financeiro (contas + gastos + metas)

### Contas recorrentes
- Luz/água/internet/cartão com vencimento, valor e recorrência.
- “Pago” + anexar comprovante (PDF/imagem).

### Orçamento por categoria
- Categorias (alimentação, transporte, lazer) com limite mensal.
- “Restante do mês” e alertas quando atingir X%.

### Lançamento rápido (offline)
- Adicionar gasto em 2 cliques (valor + categoria) e opcionalmente nota.
- Importante: sem depender de integração externa.

### Parcelas
- Compra parcelada (10x) com geração das próximas parcelas.
- “Quanto falta” e próximos vencimentos.

### Metas financeiras
- Reservas (emergência/viagem) com meta e progresso.
- “Aporte mensal sugerido” baseado no prazo.

### Alertas inteligentes
- Lembretes antes do vencimento (1 dia, 2 dias, 1 semana).
- Modo silencioso fora do horário.

### Relatórios simples e úteis
- Gráfico por categoria, maior gasto do mês, tendência mês a mês.
- “Resumo do mês” com insights curtos.

### Garantias e documentos
- Produto + data + nota fiscal em PDF + lembrete antes de expirar.
- Pasta/coleção “Documentos importantes”.

## Ideias adjacentes que combinam (offline)

- Checklists mensais: “pagar X”, “renovar documento”, “backup”.
- Saúde: remédios/consultas usando o mesmo sistema de recorrência + lembretes.
- Casa: manutenção (filtro do ar, limpeza pesada) com recorrência e anexos.
