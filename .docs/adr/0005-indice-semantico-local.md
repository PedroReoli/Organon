# ADR 0005 — Índice semântico local descartável

- Status: aceito
- Data: 2026-09-29

## Contexto

Busca contextual precisa continuar local, determinística e segura, sem transformar um índice derivado em fonte de verdade nem fazer uma tool read-only gravar dados.

## Decisão

O índice usa chunks com offsets e vetores locais versionados. Seu manifesto registra schema, modelo, dimensão e revisão de origem. `organon index rebuild` é a única reconstrução persistente explícita; uma busca diante de índice ausente ou obsoleto calcula em memória e não grava.

O ranking combina BM25, similaridade semântica e fallback de trigramas. Um corpus rotulado mede `precision@1` e `recall@3`, enquanto um fingerprint completo do data root prova ausência de mutação durante consultas.

## Consequências

- Qualquer troca de modelo ou dimensão invalida o índice.
- Conteúdo canônico permanece em store/Markdown.
- Expansões de vocabulário precisam acompanhar casos de avaliação, sem reduzir limiares para esconder regressões.

