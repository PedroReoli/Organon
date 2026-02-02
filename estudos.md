# View Estudos - Guia de Planejamento

## 1) Visao geral
Criar uma nova view `Estudos` dentro de `Pessoal`, inspirada no layout da print: ambiente de foco com wallpaper, timer, metas e atalhos rapidos.

Objetivo principal:
- Ajudar a pessoa a estudar com menos friccao.
- Juntar foco (Pomodoro), motivacao (quotes), audio e metas em uma tela unica.

## 2) Layout base (inspirado na print)
### Canto superior esquerdo
- Card pequeno: `Tempo total de estudo` (acumulado de varias sessoes).
- Card pequeno: `Metas concluidas` (hoje/semana).
- Card maior abaixo: `Sessao atual - DD/MM` com timer Pomodoro.

### Lateral direita (atalhos por icone)
Somente icones, sem texto fixo (texto no hover/tooltip):
- Mudar fundo
- Audio
- Quote
- Estatisticas
- Metas (icone check)

### Centro
- Wallpaper ocupando o fundo da view.
- Opcional: mini-player flutuante quando audio/video estiver ativo.

## 3) Funcionalidades (MVP)
### 3.1 Fundo (wallpaper)
- Trocar fundo por:
  - Upload local (arquivo)
  - URL direta
  - Busca de imagem via internet
- Busca de imagem:
  - Campo de busca (ex: "library cozy").
  - Grid com resultados.
  - Clique em uma imagem => aplica como fundo.
- Salvar ultimo fundo escolhido nas preferencias.

### 3.2 Timer Pomodoro (sessao atual)
- Configurar minutos de foco e descanso.
- Controles: iniciar, pausar, resetar, proxima fase.
- Opcao de mutar som do app.
- Registrar sessoes concluidas para estatisticas.

### 3.3 Audio
- Aceitar link (YouTube e URL de audio).
- Controle de volume.
- Opcao de loop.
- Botao para abrir mini janela de video quando for YouTube.

### 3.4 Quote
- Exibir "mensagem do dia".
- Fonte inicial: arquivo local (`quotes.json` ou `quotes.ts`) com 2 frases.

### 3.5 Estatisticas
- Tempo total estudado.
- Numero de sessoes.
- Metas abertas vs concluidas.
- Filtro simples (hoje / semana / mes).

### 3.6 Metas + integracao com Planejamento
- Criar metas direto na view Estudos.
- Opcao de vincular metas a cards da view Planejamento.
- Marcar meta como concluida na Estudos deve sincronizar com Planejamento.

## 4) Estrutura de dados sugerida
### 4.1 StudySettings
- wallpaperMode: `upload | url | search`
- wallpaperValue: `string`
- pomodoroFocusMin: `number`
- pomodoroBreakMin: `number`
- audioMuted: `boolean`
- audioVolume: `number`

### 4.2 StudySession
- id
- startedAt
- endedAt
- focusMinutesDone
- breaksDone
- completed

### 4.3 StudyGoal
- id
- title
- notes
- done
- linkedPlanningCardId (opcional)
- updatedAt

## 5) Fluxos principais
1. Usuario entra na Estudos.
2. Define/aplica wallpaper.
3. Configura Pomodoro e inicia sessao.
4. Se quiser, ativa audio.
5. Marca metas durante/apos a sessao.
6. Consulta estatisticas.

## 6) Fases de implementacao
### Fase 1 (base visual + timer)
- Criar view Estudos e layout principal.
- Timer Pomodoro funcional.
- Persistencia local basica.

### Fase 2 (fundo + audio + quotes)
- Modal de fundo com upload/URL/busca de imagem.
- Player de audio/video.
- Quote do dia com fonte local.

### Fase 3 (metas + sincronizacao + stats)
- CRUD de metas.
- Vinculo com Planejamento.
- Painel de estatisticas.

## 7) Criterios de aceite (MVP)
- Usuario consegue trocar wallpaper sem travar UI.
- Timer registra sessoes com persistencia.
- Audio toca com volume e mute.
- Quotes exibem pelo menos 2 mensagens locais.
- Metas podem ser criadas e marcadas.

## 8) Riscos e decisoes tecnicas
- Busca de imagem exige definir provedor/API (ex: Unsplash/Pexels).
- Integracao com YouTube pode exigir regras especificas de embed.
- Sincronizacao com Planejamento precisa regra clara de "fonte da verdade".

## 9) Decisoes ja fechadas
- Busca de imagem: `tanto faz` (podemos iniciar com o provedor mais simples de integrar).
- Aplicar fundo ao escolher imagem: `com confirmacao` antes de trocar.
- Sincronizacao com Planejamento: `manual`.
- Prioridade da primeira entrega: `timer + fundo` (caminho mais facil para entregar rapido).

## 10) Pergunta pendente (simples)
Sobre `audio` no MVP, voce prefere:
- `A` somente link do YouTube.
- `B` YouTube + link direto de audio (mp3/stream).
