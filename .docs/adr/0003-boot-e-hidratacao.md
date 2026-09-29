# ADR 0003 — Boot e hidratação

- Status: aceito
- Data: 2026-09-29

## Contexto

Effects do renderer podem disparar antes de o estado persistido chegar e salvar o store inicial vazio sobre dados válidos.

## Decisão

`store:load` retorna um handshake com raiz, revisão, integridade e token de hidratação efêmero por `webContents`. `store:save` exige o token vigente e a revisão esperada. Destruir o renderer, trocar a raiz ou recarregar invalida a sessão anterior.

Carregamento, recuperação e diagnóstico são read-only. Timers de manutenção, backup e sincronização só são configurados após hidratação confirmada.

## Consequências

- Saves antigos ou concorrentes falham explicitamente e precisam recarregar/reconciliar.
- O renderer serializa sua fila de saves por sessão.
- Boot repetido pode ser verificado por revisão, conteúdo e `mtime` invariantes.

