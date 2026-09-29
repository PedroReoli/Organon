# ADR 0004 — Contrato de reunião

- Status: aceito
- Data: 2026-09-29

## Contexto

Texto sem áudio, offsets ou proveniência não permite replay sincronizado, correção auditável nem regeneração segura de resumos e ações.

## Decisão

Uma reunião durável referencia o WAV validado por hash, duração e bytes; segmentos carregam offsets reais do provider. A transcrição `raw` é preservada. Texto limpo e inteligência são derivados versionados com provider, modelo, idioma, precisão temporal, hash do áudio fonte e IDs dos segmentos usados.

Decisões e ações geradas começam como não confirmadas. Exportação ao Obsidian usa nome estável, overwrite atômico e cópia idempotente do áudio. Segredos de providers ficam criptografados no processo principal.

## Consequências

- Providers sem timestamps devem declarar precisão degradada; offsets não podem ser inventados.
- Reprocessamento cria nova derivação sem apagar a fonte.
- Homologação exige microfone/loopback reais, restart, replay, múltiplos falantes e reunião longa.

