# Relatório técnico e plano diretor de evolução do Organon OS

**Data da auditoria:** 29/09/2026  
**Base analisada:** `main` em `ba57e04`, aplicação `6.23.10`  
**Escopo:** instalação e resiliência de dados, Whisper, UX/performance e MCP  
**Natureza:** diagnóstico e arquitetura; nenhuma mudança funcional foi implementada

> Este documento preserva o retrato da auditoria original. A implementação posterior está consolidada em [Status de implementação](./implementation-status.md), com evidências automatizadas e limites de homologação separados.

## 1. Resumo executivo

O Organon não precisa de uma reescrita. A base atual já contém migração em staging, backups, recuperação, atualização NSIS com `blockmap`, gravação Whisper local, janela rápida, atalhos globais, uma paleta `Ctrl+K` e um servidor MCP funcional. O problema é que esses recursos ainda não compartilham contratos arquiteturais fortes.

As quatro decisões mais importantes são:

1. **Transformar o armazenamento em uma fronteira transacional única.** GUI, CLI e MCP devem usar o mesmo `StorageCoordinator`, com revisão, lock entre processos, journal e commit atômico. Ler nunca deve gravar.
2. **Introduzir um boot guard somente leitura.** Nenhum estado vazio pode ser persistido antes da descoberta passiva, da verificação de integridade e da hidratação completa.
3. **Tornar áudio e timestamps parte do domínio do Whisper.** Sem áudio persistido e offsets de mídia, não há sincronização confiável, confiança auditável nem experiência de reunião reproduzível.
4. **Evoluir superfícies existentes, sem duplicá-las.** O popup do Whisper vira uma pílula; a paleta existente vira um registro de comandos; o MCP passa a usar o mesmo motor transacional do desktop.

O risco dominante hoje não é o instalador apagar explicitamente os dados. É a combinação de **descoberta assimétrica do diretório**, **leituras com efeito colateral**, **hidratação assíncrona iniciada a partir de um store vazio** e **múltiplos escritores sem controle de concorrência**. Essa combinação permite perda lógica ou sobrescrita por estado incompleto, mesmo com backups existentes.

## 2. Escopo, método e legenda de evidência

Foram inspecionados o processo principal Electron, preload, renderer, armazenamento, migração, updater, Whisper, Planner, Notas, CLI/MCP, configuração do electron-builder e o artefato local `6.23.10`.

Legenda usada neste relatório:

- **Observado:** comportamento diretamente sustentado pelo código, configuração, build ou teste atual.
- **Inferido:** consequência arquitetural provável; requer instrumentação ou teste de falha para quantificação.
- **Proposto:** decisão alvo, ainda não implementada.
- **Não homologado:** não deve ser apresentado como aceite de produção.

Validações realizadas nesta auditoria:

- `npm.cmd run build`: passou; 10.180 módulos transformados em 1m01s, com alerta de chunks acima de 800 kB.
- `npx.cmd electron scripts/validate-storage-v2.cjs`: passou para migração, recuperação, backup e restore em diretório temporário.
- `npm.cmd run test:whisper`: passou no fluxo sintético `microfone falso -> AudioWorklet PCM -> WAV 16 kHz -> IPC -> whisper.cpp -> overlay`.
- Inspeção visual do overlay sintético: confirma popup funcional, cronômetro, texto e ações; não demonstra forma de onda real, confiança, ruído, diarização ou sincronização com áudio.

Não foram homologados nesta auditoria:

Instalação/atualização em matriz Windows, falhas em todos os pontos de commit, microfone e loopback reais, reunião longa, múltiplos falantes, consumo de memória prolongado, concorrência desktop/CLI/MCP e qualidade semântica de resumos/decisões/tarefas permanecem pendentes.

---

# Pilar 1 — Instalação resiliente, isolamento de estado e prevenção de perda

## 1.1 Diagnóstico atual

### Acoplamento entre binário, configuração e dados

**Observado:** o pacote instalado e o diretório dedicado de conteúdo já podem ficar fisicamente separados. O alvo dedicado é `Documents/Organon` em `src/main/storage/filesystem.ts:10`; o instalador inclui aplicação, runtime e recursos, não o repositório do usuário.

**Observado:** ainda existe acoplamento lógico. `getDefaultDataPath()` usa `app.getPath('userData')` (`filesystem.ts:18`) e `loadConfig()` depende de `config.json` no mesmo espaço (`filesystem.ts:41`). Se a configuração não sobreviver ou não for encontrada, o desktop não repete a busca em `Documents/Organon`; já `bin/lib/store.cjs:13-49` faz essa descoberta. Desktop e CLI podem, portanto, apontar para roots diferentes.

**Decisão:** separar explicitamente três planos:

| Plano | Local recomendado | Conteúdo permitido |
|---|---|---|
| Binário imutável | diretório gerenciado pelo instalador | `app.asar`, runtime, DLLs, assets versionados |
| Controle local | subdiretório próprio em `userData` | ponteiro do data root, preferências pequenas, telemetria local, locks auxiliares |
| Dados do usuário | `Documents/Organon` ou root escolhido | notas, reuniões, áudio, índices, journal, backups |
| Sessão Chromium | `sessionData` separado | cache, GPU cache, cookies e dados descartáveis |

O Electron recomenda não misturar diretamente arquivos da aplicação com as pastas internas do Chromium em `userData` e permite separar `sessionData`. Isso reforça a separação, mas não define sozinho a política de dados do Organon.

### Leitura que grava e commit multi-arquivo

**Observado:** quando o store canônico é válido, `loadStoreFromPath()` chama `saveStoreToPath()` antes de retornar (`src/main/storage/store.ts:111-124`). Uma leitura pode gerar cópias, reescrever seções e criar snapshots.

**Observado:** `saveStoreToPath()` escreve múltiplas seções e depois o canônico (`store.ts:194-283`). Cada arquivo pode usar troca temporária, mas o conjunto não possui um único ponto de commit. Queda entre duas seções deixa uma geração parcialmente atualizada.

**Observado:** há proteção especial contra zerar `notes` (`store.ts:220-223`), mas não uma regra equivalente para cards, calendário, projetos, reuniões e outras coleções.

**Observado:** `store:save` carrega o store atual para avaliar integridade e depois salva (`src/main/ipc/core.ipc.ts:62-88`). Como o load também escreve, um save pode produzir duas sequências de I/O e snapshots.

**Risco mitigado pela proposta:** corrupção parcial, amplificação de escrita, congelamento do main process e recuperação ambígua.

### Boot com store vazio antes da hidratação

**Observado:** `useStore` inicia com `getDefaultStore()` e só depois hidrata via IPC. O save é debounced em 300 ms. Paralelamente, `useAppLifecycle` chama `purgeOldTrash()` no mount (`src/renderer/pages/app/useAppLifecycle.ts:67-71`) e `purgeOldTrash()` chama `updateStore` mesmo sem remoção (`src/renderer/hooks/useStore/noteExtrasSlice.ts:106-126`).

**Inferido, alta criticidade:** em condições de I/O lento, falha de carga ou disputa de timers, o estado padrão pode entrar na fila de persistência antes da conclusão da hidratação. A proteção atual de notas reduz parte do dano, mas não estabelece a invariável “estado não hidratado nunca salva”.

### Migração e bootstrap monolítico

**Observado:** a migração atual é uma boa base: copia para staging, valida contagens/arquivos, grava marcador, renomeia e só então ativa a configuração (`src/main/storage/storageMigration.ts:183-352`). A origem é preservada.

**Observado:** `app:completeInstaller` executa migração e aguarda a instalação do bundle/modelo local do Whisper antes de concluir (`src/main/ipc/core.ipc.ts:256-287`). Isso prolonga o caminho crítico do primeiro uso e mistura prontidão do aplicativo com prontidão de um recurso opcional.

**Observado:** o pacote `6.23.10` tem:

- instalador: 139.512.659 bytes, 133,05 MiB;
- `win-unpacked/resources/app.asar`: 244,73 MiB;
- runtime Whisper embarcado: 12,18 MiB;
- `.blockmap`: 143.155 bytes.

Logo, o plano não deve dizer que atualização diferencial inexiste. Ela já possui metadado compatível. O trabalho é medir sua eficiência, reduzir o caminho crítico e tornar a instalação/atualização retomável.

### Atualização sem backup como hard gate

**Observado:** o updater solicita `createBackup(getDataPath(), 'pre-update')`, mas não bloqueia a instalação quando o resultado indica falha (`src/main/core/autoUpdater.ts:68-84`). Para versões com migração de schema, isso enfraquece a barreira de segurança.

## 1.2 Arquitetura alvo: descoberta e boot guard

O boot deve ser uma máquina de estados explícita:

```text
DISCOVER_READ_ONLY
  -> CLASSIFY_CANDIDATES
  -> VERIFY_INTEGRITY
  -> SELECT_ROOT
  -> ACQUIRE_LOCK_AND_REVISION
  -> RECOVER_OR_MIGRATE_IF_NEEDED
  -> OPEN_READ_WRITE
  -> HYDRATE_RENDERER
  -> ENABLE_MUTATIONS
  -> READY
```

Regras obrigatórias:

1. **Zero escrita antes de `OPEN_READ_WRITE`.** Nem diretório, snapshot, normalização, limpeza, manutenção ou store padrão.
2. **Root vazio nunca vence root válido.** Um candidato sem manifesto/store não pode substituir automaticamente um root com marcador e conteúdo.
3. **Múltiplos candidatos exigem decisão determinística.** Preferir configuração válida; depois maior schema compatível, maior revisão íntegra e atualização mais recente. Se ainda houver ambiguidade, abrir em modo somente leitura e pedir escolha.
4. **Falha de integridade degrada para leitura/recuperação.** Nunca “recomeçar vazio” silenciosamente.
5. **Mutações do renderer ficam bloqueadas até `hydrationToken` válido.** O main rejeita save sem token, mesmo que haja bug na UI.

Ordem proposta de descoberta passiva:

1. override explícito `ORGANON_DATA_DIR`, apenas quando permitido pelo modo de execução;
2. config atual e `.bak`, com caminho existente e marcador válido;
3. `Documents/Organon` e locais dedicados conhecidos;
4. roots legados em `userData`/AppData;
5. últimos roots íntegros registrados no control plane;
6. criação de root novo somente quando nenhum candidato contém dado reconhecível.

O handshake deve retornar um contrato imutável ao renderer:

```ts
type StorageHandshake = {
  rootId: string
  canonicalPath: string
  layoutVersion: number
  revision: number
  mode: 'read-only' | 'read-write' | 'recovery-required'
  integrity: 'ok' | 'recovered' | 'degraded'
  collectionCounts: Record<string, number>
  hydrationToken?: string
  warnings: string[]
}
```

## 1.3 Persistência transacional recomendada

### Decisão imediata

Criar um único `StorageCoordinator` no processo principal, consumido por GUI, CLI e MCP. Ele deve oferecer:

- fila single-writer;
- lock entre processos;
- `expectedRevision`/compare-and-swap;
- snapshot imutável para leitura;
- journal de transações;
- staging de JSON, Markdown e áudio;
- validação antes do commit;
- um único ponto de publicação da nova geração;
- evento consolidado após commit.

Para preservar o formato atual, a primeira implementação pode usar diretórios por geração:

```text
_sistema/
  generations/
    0000000041/
      manifest.json
      store.json
      sections/*.json
  CURRENT
  transactions/<transactionId>/
```

Todos os arquivos de uma geração são preparados e validados antes da troca atômica de `CURRENT`. A recuperação escolhe a última geração cujo manifesto e hashes sejam válidos. Isso elimina o meio estado visível sem exigir uma migração imediata para banco.

### Decisão posterior

Avaliar SQLite como índice transacional quando métricas reais mostrarem necessidade de consultas, concorrência ou escala. Markdown e áudio podem continuar como blobs humanamente acessíveis. SQLite não deve ser adotado apenas porque o `doctor` da CLI menciona SQLite; a persistência observada hoje é JSON/Markdown.

## 1.4 Instalação e atualização rápidas

1. **Instalador deixa somente o aplicativo pronto.** Migração mínima e modelo Whisper saem do caminho crítico.
2. **Primeira abertura é funcional em modo básico.** O usuário pode acessar dados; recursos pesados aparecem como “preparando em segundo plano”.
3. **Instalação do modelo é retomável e versionada.** Usar manifesto, hash, bytes instalados, temp e rename; repetir a operação produz o mesmo resultado.
4. **Atualização só fecha o app após preflight.** Espaço livre, backup verificável, root íntegro e compatibilidade de schema são hard gates.
5. **Aproveitar o diferencial existente.** Medir download real entre versões e testar `differentialPackage: "store-asar"` em experimento controlado; aceitar apenas se o ganho incremental compensar o aumento do pacote cheio. Um canal portable, se necessário, deve ser separado e ter data root explícito, nunca inferido ao lado do executável instalado.
6. **Rollout progressivo e rollback de versão.** Publicar primeiro para um canal interno/canário e nunca reutilizar número de versão quebrada.
7. **Política de desinstalação explícita.** Manter dados por padrão e nunca apagar o root dedicado. O electron-builder já documenta `deleteAppDataOnUninstall` como `false` por padrão; registrar explicitamente a intenção evita regressão de configuração.

## 1.5 Critérios de aceite do pilar 1

- Zero bytes alterados no data root antes do handshake.
- Dez boots consecutivos sem mudanças produzem o mesmo revision/hash.
- Falha injetada após cada etapa de staging recupera geração anterior ou nova, nunca uma mistura.
- Config ausente + `Documents/Organon` válido redescobre o mesmo root sem criar store vazio.
- Desktop, CLI e MCP reportam o mesmo `rootId` e `revision`.
- Escritor concorrente recebe conflito explícito, nunca last-write-wins silencioso.
- Reinstalação e desinstalação preservam dados em matriz Windows suportada.
- Falha de backup bloqueia atualização que migra schema.
- Aplicação abre utilizável sem esperar download/instalação do modelo Whisper.

---

# Pilar 2 — Whisper sensorial, compacto e orientado a reunião

## 2.1 O que já existe e deve ser preservado

Já existem captura de microfone/áudio do sistema, providers local/Groq/OpenAI, página decomposta, overlay, gerador de nota e IPC para `meetings:saveAudio` (`src/main/ipc/content.ipc.ts:247`). O popup always-on-top e os atalhos `Ctrl+Shift+V`, `Alt+V` e `Ctrl+Shift+Space` também estão implementados (`src/main/core/tray.ts:146-150` e `247-265`). A proposta muda contratos e composição, sem criar um segundo Whisper.

## 2.2 Lacunas verificadas

### Feedback sensorial

**Observado:** o hero principal mostra estado, timer e animação, mas não uma forma de onda derivada do sinal. O popup escala uma barra por nível médio; não informa pico, clipping, ruído ou silêncio persistente.

**Decisão:** mostrar três sinais distintos:

- waveform/RMS de entrada em tempo real;
- marcador de pico/clipping e estado “sem sinal”;
- qualidade acústica estimada (`boa`, `ruidosa`, `baixa`, `saturada`).

Não rotular nível acústico como “confiança da transcrição”. Confiança textual só deve aparecer quando o provider fornecer probabilidade/logprobs ou quando houver um modelo de calibração validado. Caso contrário, usar “qualidade do áudio”.

### Popup rígido

**Observado:** já existe uma janela rápida, mas ela é um painel fixo 420 x 420, não uma pílula. A prop `onToggleQuickWindow` existe no hero, porém não é ligada pela página principal.

**Proposta de estados:**

| Estado | Geometria | Conteúdo |
|---|---|---|
| Ocioso | 260–320 x 44–52 | microfone, atalho, provider |
| Gravando | 320–420 x 56–72 | waveform, timer, pause/stop/cancel, qualidade |
| Processando | mesma pílula | etapa atual e cancelar |
| Concluído | compacto expansível | preview, copiar, abrir reunião |
| Erro | expansível | causa acionável, retry/fallback |

A pílula permanece always-on-top, arrastável, encaixável e keyboard-first. Expandir abre o painel atual; fechar visualmente não encerra gravação sem confirmação.

### Sem áudio persistido e sem offsets de mídia

**Observado:** `WhisperRecord` possui `audioUrl?`, mas `useWhisperRecording` não chama `saveMeetingAudio`. Segmentos guardam apenas `timestamp: string`, normalmente horário de parede (`toLocaleTimeString`), não `startMs/endMs` relativos ao áudio (`whisper.types.ts:4-10`; `useWhisperRecording.ts:305-337`).

**Consequência:** o timestamp não pode buscar uma posição do áudio; reprocessamento, auditoria e correção ficam frágeis.

**Contrato alvo:**

```ts
type TranscriptSegment = {
  id: string
  startMs: number
  endMs: number
  textRaw: string
  textClean?: string
  speakerId?: string
  source: 'mic' | 'system' | 'mixed'
  confidence?: number
  words?: Array<{ text: string; startMs: number; endMs: number; confidence?: number }>
}
```

O áudio deve ser salvo no root dedicado com hash, duração, codec e vínculo estável à reunião. A UI converte offsets para relógio apenas na apresentação. Clique no segmento chama `seek(startMs)` e destaca o trecho corrente durante playback.

Providers precisam de adaptadores de capacidade:

- se houver timestamps por palavra, persistir palavras;
- se houver apenas segmentos, sincronizar por segmento;
- se houver somente texto, marcar `timingPrecision: 'none'` e não simular timestamps;
- o CLI local deve produzir formato com tempos, não apenas `-otxt`.

### Resultado pós-reunião manual e heurístico

**Observado:** o gerador atual já cria resumo, decisões e ações, mas sua classificação é determinística por palavras-chave em `src/main/meeting/transcriptAssistant.ts`; a geração é acionada pelo usuário e o resultado oferece duas visões, estruturada e Markdown.

**Decisão:** executar automaticamente, depois do stop, um pipeline idempotente e cancelável:

```text
finalizar áudio
 -> validar arquivo/hash
 -> transcrever com timestamps
 -> limpar transcript sem apagar o raw
 -> extrair decisões/tarefas com proveniência
 -> persistir pacote de reunião
 -> notificar UI
```

As três abas obrigatórias devem compartilhar a mesma fonte:

1. **Inteligência:** resumo executivo, decisões, tarefas, responsáveis/prazos sugeridos, links aos segmentos e envio individual/em lote ao Planner em um clique.
2. **Transcrição limpa:** pontuação, parágrafos e falantes editáveis, preservando vínculo com offsets.
3. **Transcrição bruta:** output original imutável, timestamped, provider/model/versão e diagnósticos.

Toda extração automática precisa ter `sourceSegmentIds`, status de confirmação e opção de corrigir sem alterar o raw.

### Persistência frágil no renderer

**Observado:** registros, pastas e contexto do Whisper são armazenados em `localStorage` (`useWhisperPersistence.ts:13-68`). As chaves de Groq/OpenAI também são gravadas em `localStorage` (`whisperService.ts:78-92`).

**Decisão:** reuniões passam ao repositório dedicado e ao `StorageCoordinator`. Segredos devem migrar para o cofre do sistema operacional, expostos ao renderer apenas por operações, nunca pelo valor bruto. A migração deve preservar configurações existentes e limpar o valor antigo somente após verificação.

## 2.3 Ponte Obsidian em um clique

O Organon já usa Markdown, então a ponte pode ser simples e reversível:

```yaml
---
id: meeting_<uuid>
type: meeting
date: 2026-09-29T14:30:00-03:00
participants: []
projects: []
tags: [reuniao]
audio: ./assets/meeting_<uuid>.webm
transcript_raw: ./assets/meeting_<uuid>.raw.md
organon_revision: 42
---
```

Regras:

- vault escolhido explicitamente e validado;
- preview do destino e conflitos;
- escrita atômica, nome seguro e id estável;
- anexos em subpasta configurável;
- links para tarefas com IDs do Organon;
- repetir exportação atualiza o mesmo artefato ou cria versão, conforme política escolhida;
- nenhum plugin Obsidian é obrigatório para o MVP.

## 2.4 Critérios de aceite do pilar 2

- Waveform reage ao RMS real e acusa silêncio/clipping em teste calibrado.
- Pílula inicia/pausa/encerra por teclado sem abrir a janela principal.
- Fechar/ocultar janelas não perde gravação ativa.
- Áudio, raw, clean e intelligence sobrevivem a restart.
- Clique em segmento busca o áudio dentro de tolerância definida por provider.
- Raw permanece byte-logicamente imutável após edições da versão limpa.
- Cada decisão/tarefa automática aponta para pelo menos um segmento de origem.
- Exportação Obsidian repetida não duplica conteúdo silenciosamente.
- Teste físico cobre microfone, loopback, ruído, 60+ minutos e dispositivo trocado no meio.

---

# Pilar 3 — UX global e performance mensurável

## 3.1 Estratégia de interação

### Evoluir a paleta existente

**Observado:** `Ctrl+K` já abre `ViewsNavigatorModal`, com navegação por setas/Enter/Esc, views e ações de criar nota/tarefa. Há também `GlobalSearchDropdown` com catálogo próprio.

**Decisão:** transformar a paleta existente em `CommandRegistry`; não criar uma terceira superfície. Cada comando declara:

- id estável, título, palavras-chave e contexto;
- atalho e conflitos;
- se altera estado;
- precondições e preview;
- ação e resultado estruturado.

Unificar gradualmente `ViewsNavigatorModal` e `GlobalSearchDropdown` no mesmo índice de comandos. A paleta deve buscar views, notas, tarefas, projetos e comandos, com resultados agrupados.

### Planner keyboard-first

**Observado:** cartões compactos/contínuos possuem algumas ações diretas; cartões standard/expanded frequentemente abrem modal. Não há contrato consistente para `d` e `p`.

**Proposta:** quando um card estiver focado ou sob hover e o foco não estiver em input/editor:

- `d`: alternar concluído, com toast e undo;
- `p`: ciclar prioridade, exibindo a próxima;
- `e`/Enter: editar;
- `r`: lembrete;
- setas/J/K: mover foco;
- `?`: mostrar atalhos do contexto.

As mesmas ações devem existir nos quatro modos de card. Atalho sem foco contextual não executa mutação.

### Notas

- `Ctrl+K` encontra e abre nota sem navegar pela árvore.
- `Ctrl+P` pode ser alias de quick open apenas se não conflitar com prioridade contextual.
- backlinks, propriedades e comandos de bloco entram como ações da paleta.
- salvar deve indicar `salvando`, `salvo` e `conflito`, não apenas acontecer silenciosamente.

## 3.2 I/O e responsividade

**Sintoma observado:** o main process usa operações síncronas de filesystem e um save reescreve várias seções, cópias e snapshots. Debounce no renderer reduz frequência, mas não custo por commit.

**Causa:** ausência de coordenador transacional e de dirty-set por coleção; leitura também normaliza/persiste.

**Mudança:**

1. buffer de mutações no `StorageCoordinator`;
2. debounce adaptativo no main, não como garantia de integridade;
3. coalescência por entidade/coleção;
4. escrita assíncrona em worker/utility process quando apropriado;
5. commit por geração e evento único;
6. snapshots por política de risco, não a cada leitura/save incidental.

**Validação:** medir p50/p95/p99 de `store.load`, `commit`, bytes escritos e event-loop lag com stores pequenos, médios e grandes. O objetivo não é apenas “menos chamadas”, mas ausência de long tasks visíveis.

## 3.3 DOM e listas

**Observado:** não há biblioteca de virtualização. Timeline do Whisper (`SpeakerTimeline.tsx:216`), listas do Planner e árvore de Notas renderizam via `map`; a árvore de notas repete filtros/ordenações ao calcular filhos.

**Decisão:**

- indexar filhos por `parentId` uma vez por snapshot;
- virtualizar timeline, listas e resultados acima de limiar medido;
- manter overscan pequeno e altura previsível;
- preservar navegação por teclado e leitores de tela;
- não virtualizar listas curtas por padrão.

Aceite sugerido: 10 mil segmentos/tarefas com p95 de frame dentro de 16,7 ms no hardware de referência, sem crescimento linear de nós DOM visíveis e sem perder foco ao reciclar linhas.

## 3.4 Bundle e carregamento

O build atual produz, entre outros:

- `main`: 1.790,93 kB minificado / 473,18 kB gzip;
- `subset-shared`: 1.823,56 kB / 736,88 kB gzip;
- flowchart ELK: 1.448,28 kB;
- Excalidraw: 1.119,98 kB;
- WhisperPage: 127,30 kB / 30,03 kB gzip.

Já existe code splitting, mas o build alerta para chunks acima de 800 kB e informa que `src/api/organon.ts` é importado estática e dinamicamente, impedindo o split pretendido.

Ordem de trabalho:

1. corrigir fronteira de `src/api/organon.ts`;
2. carregar Excalidraw, Mermaid/ELK, PDF e editores avançados somente na rota/ação;
3. gerar relatório de composição por release;
4. estabelecer budget de entry chunk e bloquear regressão no CI;
5. otimizar imagens grandes sem comprometer qualidade.

## 3.5 Memória e processos “zumbis”

**Observado:** a janela principal é ocultada em vez de destruída por desenho de tray; o popup também é reutilizado. Isso não prova vazamento ou processo zumbi.

**Decisão:** instrumentar antes de corrigir:

- `app.getAppMetrics()` por tipo/PID;
- `process.getProcessMemoryInfo()` nos processos relevantes;
- contagem de `webContents`, streams, tracks, AudioContexts, timers e listeners;
- eventos `render-process-gone`, `unresponsive`, `destroyed`;
- marcadores abrir/fechar/ocultar popup e iniciar/parar gravação.

Cenário de soak: 100 ciclos da janela rápida + gravações curtas + 4 horas em tray. Aceite: retorno a uma faixa estável após GC/idle, zero track ativo após stop e número constante de `webContents` quando as janelas são reutilizadas.

## 3.6 Riscos de segurança adjacentes

Foram encontrados itens que merecem workstream próprio, sem correção silenciosa dentro deste plano:

- handlers globais aceitam qualquer permissão (`src/main/core/window.ts:9-17`);
- janela principal usa `sandbox: false` (`window.ts:105-110`);
- chaves de IA ficam em `localStorage`;
- `executeCliCommand` usa shell para uma string de comando (`src/main/storage/cliRunner.ts:14-42`).

Esses pontos aumentam o impacto potencial de conteúdo não confiável e devem ser tratados antes de ampliar automação MCP/IA. A correção precisa de matriz de capacidades para não quebrar captura de mídia, CLI e integrações.

---

# Pilar 4 — MCP transacional e ferramentas de contexto

## 4.1 Diagnóstico do servidor atual

**Observado:** o MCP atual expõe status, doctor, tarefas e notas. Entretanto:

- `organon_task_update` e `organon_task_delete` existem no dispatcher, mas não em `MCP_TOOLS` (`bin/lib/mcp.cjs:13-231`);
- o servidor anuncia protocolo fixo `2024-11-05` e versão `6.23.2`, enquanto o app é `6.23.10` (`mcp.cjs:269-278`);
- writes do CLI usam temp + rename por arquivo, mas falhas no canônico podem ser engolidas e `saveStoreData` não fornece commit transacional;
- não existe lock, revisão ou idempotency key compartilhada com o desktop;
- o rollback atual usa apenas os últimos eventos em memória e restaura cards/notas, sem garantir conteúdo Markdown (`realtimeSyncWatcher.ts:27-35`; `cliRunner.ts:56-91`).

**Risco:** duas sessões podem ler a mesma revisão e sobrescrever mudanças; uma sequência de ferramentas pode falhar no meio; “undo” pode aparentar sucesso sem restaurar sidecars.

## 4.2 Fronteira correta

MCP não deve gravar arquivos diretamente nem chamar a CLI por shell. O fluxo alvo é:

```text
MCP/GUI/CLI
  -> DomainCommandBus
  -> validação + autorização + precondições
  -> StorageCoordinator
  -> transaction journal + staging
  -> atomic commit
  -> audit event + index updates
```

Transação e undo são garantias da aplicação. Metadados MCP ajudam o cliente a entender risco, mas não substituem autorização, lock ou atomicidade.

Na especificação MCP `2026-07-28` não existe sessão implícita por conexão. “Sessão de undo” deve ser um handle opaco, explícito e durável do Organon, com autorização e expiração próprias; nunca estado escondido no processo stdio.

## 4.3 `organon_batch_mutate`

Contrato conceitual:

```json
{
  "requestId": "uuid-idempotente",
  "changeSetId": "handle-opaco-opcional",
  "expectedRevision": 41,
  "dryRun": false,
  "operations": [
    {
      "opId": "create-task",
      "kind": "task.create",
      "input": { "title": "Enviar proposta", "priority": "high" }
    },
    {
      "opId": "link-note",
      "kind": "note.append",
      "input": { "noteId": "meeting_123", "taskId": "$create-task.id" }
    }
  ]
}
```

Semântica obrigatória:

1. validar schema, limites e todas as referências antes de escrever;
2. produzir plano/diff em `dryRun`;
3. adquirir lock e conferir `expectedRevision`;
4. executar operações sobre snapshot imutável;
5. validar invariantes e sidecars;
6. commitar uma única geração;
7. gravar `transactionId`, `checkpointId`, origem, revisão antes/depois e hashes;
8. retornar resultados estruturados por `opId`;
9. retry com o mesmo `requestId` retorna o mesmo resultado, sem duplicar efeitos;
10. qualquer falha antes do commit deixa a revisão anterior visível.

Limites iniciais devem ser conservadores: número de operações, payload total, tamanho por nota e deadline. Resultado grande usa paginação ou `resource_link`, não um bloco de texto ilimitado.

Anotações recomendadas: `readOnlyHint: false`, `destructiveHint` conforme operações ou conservadoramente `true`, `idempotentHint: true` apenas quando `requestId` for obrigatório e efetivamente deduplicado, `openWorldHint: false`.

## 4.4 `organon_undo`

Undo deve ser uma nova transação compensatória, nunca apagar história:

```json
{
  "requestId": "uuid",
  "checkpointId": "checkpoint_abc",
  "expectedCurrentRevision": 42,
  "mode": "reject-if-diverged",
  "dryRun": true
}
```

Modos:

- `reject-if-diverged` — padrão seguro; recusa se entidades tocadas mudaram depois.
- `compensating` — produz operações inversas quando a política permitir.
- `preview`/`dryRun` — mostra o que volta, o que conflita e sidecars afetados.

O journal deve incluir JSON, Markdown, áudio/metadados e índices derivados necessários. Índices reconstruíveis podem ser invalidados em vez de versionados. Checkpoints têm retenção explícita; expiração nunca é silenciosa para transações ainda apresentadas como reversíveis.

## 4.5 Ferramentas de contexto

### `organon_notes_search`

Busca híbrida, não apenas embeddings:

- lexical/BM25 para termos exatos, IDs, pessoas e código;
- semântica por chunks para intenção;
- filtros por pasta, projeto, tags, data e tipo;
- resultado com score separado, trecho, noteId e offsets;
- índice incremental por hash de conteúdo;
- `embeddingModel`, dimensão e versão no manifesto;
- embeddings locais por padrão; provider externo somente com consentimento e política de dados.

O índice fica em `_sistema/indexes` e é descartável/reconstruível. A nota Markdown continua sendo fonte de verdade.

### `organon_schedule_pressure`

Entrada: janela temporal, timezone, capacidade diária, dias úteis, filtros e se inclui itens sem duração.

Saída:

- carga planejada versus capacidade;
- sobreposições e blocos indisponíveis;
- atrasados e itens em risco;
- concentração por projeto/prioridade;
- premissas e dados faltantes;
- recomendações sem mutação.

Itens sem estimativa não podem ser tratados como zero: devem compor uma faixa de incerteza.

### `organon_pending_digest`

Agrega tarefas, lembretes, follow-ups de reunião, itens vencidos e ações ainda não confirmadas. Deve aceitar projeto, período, status, prioridade e limite, deduplicar por entidade e devolver links/IDs, não somente prosa.

As três ferramentas são read-only e devem declarar `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false`.

## 4.6 Conformidade MCP

Antes de adicionar ferramentas:

- definir matriz de compatibilidade: manter `2024-11-05` apenas em adapter legado e adotar `2026-07-28` no core, com versão/capacidades em `_meta` de cada request;
- derivar `serverInfo.version` do package;
- fazer `tools/list` corresponder ao dispatcher, ter ordem determinística e cache/TTL coerentes;
- adicionar `resultType`, `outputSchema` e `structuredContent` aos novos contratos;
- paginação para list/search/digest;
- erros de protocolo para tool/argumento desconhecido e `isError` para falha de domínio;
- validação, access control, rate limit, sanitização, timeout e audit log;
- confirmação humana/preview para operações destrutivas.

A especificação MCP oficial exige validação de entradas e recomenda confirmação humana, timeouts e logs de uso. Anotações são hints não confiáveis por si mesmas; o servidor continua responsável por enforcement.

## 4.7 Critérios de aceite do pilar 4

- Falha na operação N de um batch deixa revisão e arquivos inalterados.
- Retry por `requestId` não duplica entidades.
- Concorrência com revisão antiga retorna conflito estruturado.
- Undo restaura metadados e conteúdo Markdown; divergência é explicitada.
- Reinício do MCP não perde journal/checkpoints dentro da retenção.
- GUI, CLI e MCP veem a mesma revisão imediatamente após commit.
- `tools/list`, dispatcher, schemas e versão do servidor passam teste de contrato.
- Busca semântica é avaliada em corpus rotulado, com precisão/recall e casos lexicais.
- Ferramentas read-only não alteram revision nem bytes do data root.

---

# 5. Decisões arquiteturais recomendadas

| ID | Decisão | Estado | Risco mitigado |
|---|---|---|---|
| D1 | Um data root canônico, descoberto passivamente e identificado por `rootId` | Aprovar | roots divergentes e store “sumido” |
| D2 | Boot guard read-only com token de hidratação | Aprovar | save de estado vazio/incompleto |
| D3 | Leitura pura; recuperação e manutenção são comandos explícitos | Aprovar | I/O oculto e snapshots incidentais |
| D4 | `StorageCoordinator` single-writer com revision/CAS | Aprovar | last-write-wins entre GUI/CLI/MCP |
| D5 | Commit por geração + journal | Aprovar | store multi-arquivo parcialmente publicado |
| D6 | Whisper/modelo fora do caminho crítico de primeira abertura | Aprovar | bootstrap monolítico e abandono |
| D7 | Áudio + offsets como fonte do transcript | Aprovar | timestamps fictícios e falta de auditabilidade |
| D8 | Raw imutável; clean/intelligence derivados e versionados | Aprovar | perda de proveniência |
| D9 | Evoluir popup e paleta existentes | Aprovar | duplicação de UX e dívida de navegação |
| D10 | Batch/undo MCP sobre o mesmo motor de domínio | Aprovar | atomicidade aparente e rollback parcial |
| D11 | Índices semânticos reconstruíveis, não fonte de verdade | Aprovar | lock-in e corrupção de notas |
| D12 | Instrumentar performance/memória antes de otimizar | Aprovar | correções especulativas e regressões |

# 6. Ordem de implementação e gates

## Onda 0 — Baseline e contratos

- ADRs para data root, transação, boot e reunião.
- Métricas de boot/I/O/memória/bundle.
- Fixtures de store pequeno/médio/grande.
- Testes de contrato MCP e inventário das ferramentas.
- Matriz de instalação/upgrade/uninstall.

**Gate:** métricas reproduzíveis e invariantes aprovadas.

## Onda 1 — Proteção contra perda de dados (P0)

- descoberta passiva única para desktop/CLI/MCP;
- boot guard e hydration token;
- remover side effects de load;
- impedir effects de manutenção antes da hidratação;
- hard gate de backup para migração/update;
- testes de config perdida e root múltiplo.

**Gate:** nenhum cenário de boot testado persiste store vazio sobre root válido.

## Onda 2 — Motor transacional compartilhado (P0/P1)

- `StorageCoordinator`, revision, lock e journal;
- commit por geração;
- adaptar GUI e CLI sem shell;
- `organon_batch_mutate` com dry-run/idempotência;
- `organon_undo` durável.

**Gate:** testes de falha e concorrência passam; sidecars participam do commit.

## Onda 3 — Contrato de reunião e Whisper (P1)

- persistir áudio e offsets;
- adaptadores de timestamps por provider;
- raw/clean/intelligence versionados;
- processamento automático pós-stop;
- pílula always-on-top e qualidade acústica;
- ponte Obsidian.

**Gate:** replay sincronizado, restart, reunião longa e exportação idempotente.

## Onda 4 — UX e performance (P1/P2)

- `CommandRegistry` sobre `Ctrl+K`;
- atalhos contextuais e ações consistentes do Planner;
- índices de árvore e virtualização orientada a limiar;
- reduzir I/O e chunks de entrada;
- soak de processos/janelas.

**Gate:** budgets de UX, bundle, event-loop e memória no CI/aceite.

## Onda 5 — Contexto semântico (P2)

- busca híbrida em notas;
- pressão de agenda;
- digest de pendências;
- avaliação offline de relevância e segurança.

**Gate:** qualidade medida em corpus real e zero mutação nas tools read-only.

# 7. Registro de riscos prioritários

| Risco | Probabilidade | Impacto | Prioridade | Tratamento |
|---|---:|---:|---:|---|
| Estado vazio salvo antes da hidratação | Média | Crítico | P0 | boot guard + token + save rejeitado no main |
| Desktop e CLI escolherem roots diferentes | Média | Alto | P0 | resolver único e `rootId` |
| Commit parcial entre JSON/Markdown/áudio | Média | Crítico | P0 | geração + journal + lock |
| Atualização continuar sem backup válido | Média | Alto | P0 | backup como hard gate |
| Corrida GUI/MCP/CLI | Alta conforme uso | Alto | P0 | revision/CAS + single writer |
| Histórico Whisper preso a `localStorage` | Média | Alto | P1 | persistência no data root |
| Timestamps não reproduzíveis | Alta | Médio/alto | P1 | offsets de mídia por provider |
| Segredos em `localStorage` | Média | Alto | P1 segurança | cofre do SO + migração |
| Permissões Electron globais permissivas | Média | Alto | P1 segurança | allowlist por origem/permissão |
| Uso de shell para comandos internos | Média | Alto | P1 segurança | API de domínio tipada |
| DOM/bundle crescer sem budget | Alta | Médio | P2 | virtualização e budgets |
| “Processo zumbi” tratado sem evidência | Média | Médio | P2 | instrumentação e soak primeiro |

# 8. Métricas de sucesso do programa

O scorecard deve cobrir: perda/corrupção sob fault injection; commits com revision/journal; tempo até UI utilizável; bytes diferenciais por release; p95 de commit e event-loop lag; taxa/latência/erro de seek do Whisper; passos por tarefa crítica; nós DOM, long tasks e memória após soak; batches atômicos, retries deduplicados, conflitos e undo MCP.

# 9. Fontes técnicas externas

- Electron, `app.getPath`, separação de `userData` e `sessionData`: https://www.electronjs.org/docs/latest/api/app
- Electron, métricas e ciclo de `webContents`: https://www.electronjs.org/docs/latest/api/web-contents
- electron-builder NSIS, uninstall e pacote diferencial: https://www.electron.build/v26/docs/nsis/
- electron-builder, auto-update e rollout progressivo: https://www.electron.build/docs/features/auto-update/
- MCP 2026-07-28, tools, estado explícito, schemas, erros e segurança: https://modelcontextprotocol.io/specification/2026-07-28/server/tools
- MCP 2026-07-28, versão por request e compatibilidade legada: https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning

# 10. Conclusão

A sequência correta é **proteger o estado, unificar o motor de mutação, enriquecer o contrato de reunião e só então ampliar automação e contexto**. Melhorias visuais isoladas no Whisper ou novas tools MCP, antes dessa base, aumentariam a superfície de concorrência e a aparência de confiabilidade sem entregar a garantia correspondente.

O maior ganho de curto prazo vem de três mudanças pequenas em superfície e grandes em efeito: bloquear saves antes da hidratação, tornar load realmente read-only e usar a mesma descoberta de data root em todos os entrypoints. O maior ganho estrutural vem do `StorageCoordinator` transacional, porque ele resolve simultaneamente data loss, I/O, batch MCP, undo e consistência entre interfaces.
