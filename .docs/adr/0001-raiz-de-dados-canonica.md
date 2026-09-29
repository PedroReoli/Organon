# ADR 0001 — Raiz de dados canônica

- Status: aceito
- Data: 2026-09-29

## Contexto

Desktop, CLI e MCP não podem inferir raízes diferentes nem criar uma raiz vazia durante uma leitura. Uma configuração perdida também não pode ocultar silenciosamente uma raiz dedicada válida.

## Decisão

Todos os entrypoints usam o mesmo resolvedor, com esta precedência: configuração explícita válida, raiz dedicada descoberta passivamente e, por fim, raiz legada. A identidade exposta é `rootId`, derivada do caminho canônico normalizado. Leituras de uma raiz inexistente são estritamente sem efeitos colaterais.

O diretório de sessão do Electron é separado dos dados duráveis. O uninstall preserva a raiz de dados e uma migração só é concluída depois de backup validado e pós-condições de contagem/integridade.

## Consequências

- Trocas de raiz exigem nova hidratação e invalidam tokens anteriores.
- Descoberta nunca grava; criação ocorre apenas em uma operação mutável explícita.
- Raízes múltiplas são um estado diagnosticável, não uma escolha silenciosa por data de modificação.

