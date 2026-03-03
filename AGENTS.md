# AGENTS.md

## Regras Obrigatorias do Projeto

1. **Codificacao de arquivos**
- Sempre usar **UTF-8** em todos os arquivos criados ou editados.
- Nunca salvar arquivos em ANSI, Latin-1 ou outras codificacoes.

2. **Documentacao obrigatoria para backend**
- Sempre que criar, alterar ou remover algo no backend de qualquer aplicacao, criar ou atualizar um arquivo `.md` de documentacao.
- Essa documentacao deve ser simples e direta, cobrindo no minimo:
  - objetivo do endpoint/rota
  - metodo HTTP e caminho
  - autenticacao necessaria
  - dados de entrada (body, query, params, headers)
  - exemplos de payload de requisicao
  - formato de resposta de sucesso
  - formato de erro e codigos HTTP
  - como os dados sao enviados e como sao recebidos
  - regras de validacao

3. **Local recomendado da documentacao de API**
- Salvar em `doc/` ou `docs/`, com nome claro por dominio.
- Exemplo: `doc/api-cards.md`, `doc/api-auth.md`.

4. **Definicao de pronto para backend**
- Uma tarefa de backend so e considerada concluida quando o codigo e o `.md` correspondente estiverem atualizados.

5. **Recomendacao de Conventional Commit no chat**
- Ao final de cada tarefa que envolva alteracao no projeto, sempre incluir no chat uma sugestao de **Conventional Commit** em portugues.
- A sugestao deve conter:
  - linha de commit no padrao Conventional Commit (`tipo(escopo): resumo`)
  - descricao curta do que foi feito
- Exemplo:
  - `feat(api): adiciona endpoint de sincronizacao de cards`
  - `Descricao: cria rota de listagem com paginacao por cursor e validacao de parametros.`
