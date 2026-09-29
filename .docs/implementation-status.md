# Status de implementação do plano diretor

**Atualizado em:** 29/09/2026  
**Intervalo de implementação:** `df9b0d8..0190557`  
**Regra de evidência:** build/teste automatizado não é homologação física, visual ou de produção.

## Resultado por onda

| Onda | Entrega no código | Evidência automatizada | Gate externo |
|---|---|---|---|
| 0 — baseline e contratos | cinco ADRs, métricas, fixtures small/medium/large, contrato MCP e matrizes de aceite | `test:storage:baseline`, `benchmark:storage`, `test:mcp`, build budget | matriz Windows física |
| 1 — proteção de dados | descoberta passiva, load read-only, hydration token, backup hard gate e boot repetido | fault injection, dez boots, config perdida, backup/restore | upgrade/reinstall/uninstall reais |
| 2 — motor transacional | geração, `CURRENT`, lock, CAS, journal, worker, dirty-set, batch/idempotência/undo e sidecars imutáveis | `test:storage:v2`, `validate-cli-storage`, `test:mcp` | concorrência/queda forçada em máquinas reais |
| 3 — reunião/Whisper | WAV+hash, segmentos/offsets, raw/clean/intelligence versionados, síntese pós-stop, pill, waveform, replay e Obsidian | instalador retomável, checksum, fixture JSON completa e parser | microfone/loopback, múltiplas vozes e 60+ min |
| 4 — UX/performance | CommandRegistry, atalhos/undo, estados de save, lazy loading, índices, virtualização por limiar, imagens e budgets | typecheck, build, bundle budget e runtime diagnostics | inspeção visual e soak de 100 ciclos/4 h |
| 5 — contexto semântico | busca híbrida local, agenda, digest, índice descartável, CLI de rebuild e read-only fingerprint | corpus rotulado: precision@1 1,0 e recall@3 1,0 em 5 consultas | ampliar corpus representativo sem dados sensíveis |

## Estado técnico consolidado

- Desktop, CLI e MCP compartilham raiz, revisão e commit transacional.
- Saves do renderer exigem hidratação e usam worker; CLI/migração mantêm caminho síncrono explícito.
- Seções imutáveis são reutilizadas por hard link, com fallback de cópia e métricas de bytes.
- Edição de notas e áudio de reunião publica nomes versionados por hash; gerações anteriores não têm seus sidecars sobrescritos.
- O updater exige backup válido antes do download e usa política versionada de canary/stable, sem downgrade automático.
- Whisper instala modelos fora do boot crítico, retoma downloads e valida hash/bytes/manifesto.
- Segredos de providers ficam no processo principal com `safeStorage`; permissões, sandbox e execução de CLI usam allowlists.
- MCP expõe 23 tools determinísticas, batch atômico, retry idempotente, CAS, undo durável e compatibilidade moderna/legada.
- Imagens estáticas caíram de aproximadamente 1,41 MB para 232 KB; o pacote mantém budgets explícitos.
- Dependências diretas obsoletas foram removidas e o audit atual retornou zero vulnerabilidades conhecidas.

## Validação final automatizada

`npm.cmd test` passou integralmente em 29/09/2026:

- TypeScript renderer e main/preload;
- política de release stable;
- build Vite/Electron e 11 artefatos obrigatórios;
- budget de 164 chunks, 11.432.270 bytes de JavaScript;
- storage/migração/backup/restore/fault injection/worker/sidecars/CLI;
- baselines de 22.928, 836.601 e 4.147.236 bytes lógicos;
- instalador e transcrição Whisper;
- MCP, busca semântica e coerência de 124 handlers IPC.

`npm.cmd run audit:dependencies` também passou com zero vulnerabilidades. Permanece um aviso de chunk circular `tiptap -> radix-ui -> tiptap` e existem chunks grandes aceitos por budgets específicos; o build não os trata como regressão silenciosa.

## Homologação ainda necessária

Os seguintes itens dependem de hardware, instaladores assinados, tempo real ou julgamento visual e não foram marcados como aceitos:

1. [Matriz Windows](./acceptance/windows-lifecycle-matrix.md) em Windows 10/11, incluindo upgrade, reinstall e uninstall.
2. [Validação física](./acceptance/physical-validation.md) de microfone, loopback, múltiplos falantes, reunião longa e replay.
3. Soak de 100 ciclos da janela rápida e quatro horas em tray, observando memória, tracks e `webContents`.
4. Inspeção visual da pill, waveform, paleta, backlog virtualizado e imagens otimizadas.
5. Rollout canário real e promoção stable conforme [política de rollout](./acceptance/rollout-and-rollback.md).

Nenhum artefato foi publicado e nenhum release foi criado por esta implementação.

