# ADR 0002 — Commit por geração

- Status: aceito
- Data: 2026-09-29

## Contexto

O estado inclui coleções relacionadas e sidecars. Sobrescrever vários JSONs em sequência permite estados parciais, conflitos entre processos e undo incompleto.

## Decisão

Cada mutação parte de uma revisão conhecida, adquire lock de escritor, prepara uma geração autocontida, valida hashes, publica a pasta e troca `CURRENT` atomicamente. O journal registra origem, revisão anterior, revisão nova e resultado. Compare-and-swap rejeita revisões divergentes.

Desktop, CLI e MCP usam esse mesmo coordenador. Batch MCP prepara todas as operações antes de publicar; idempotência e checkpoints duráveis permitem retry e undo. Índices derivados nunca participam da fonte de verdade e podem ser reconstruídos.

## Consequências

- Uma falha anterior a `CURRENT` mantém a geração anterior visível.
- Uma falha posterior à troca é reconhecida como commit concluído.
- Espelhos legados são apenas compatibilidade; falhar ao atualizá-los não desfaz a geração canônica.
- Gerações e journals exigem política de retenção e métricas de bytes/latência.

