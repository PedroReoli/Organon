# AGENTS.md

Este arquivo define regras obrigatórias para qualquer agente de IA que atue neste repositório.  
Todas as instruções abaixo devem ser seguidas estritamente.

Caso exista conflito entre instruções, **as regras deste arquivo devem ser consideradas prioritárias**.

---

# 1. Codificação de Texto

## 1.1 Encoding obrigatório

- **Padrão obrigatório:** UTF-8.
- Todos os arquivos devem ser tratados como UTF-8.
- Nunca assumir outro encoding.

Todo texto gerado deve suportar corretamente:

- acentuação da língua portuguesa (quando aplicável)
- caracteres especiais
- símbolos Unicode válidos

É proibido gerar conteúdo que:

- quebre acentuação
- substitua caracteres válidos por símbolos incorretos
- produza texto corrompido

Se houver qualquer dúvida sobre encoding, **assumir sempre UTF-8**.

---

## 1.2 Problemas de Encoding

Caso um arquivo seja lido e apareçam caracteres inesperados ou símbolos estranhos, por exemplo:

- glifos incomuns
- caracteres de controle
- acentuação quebrada
- símbolos substituindo caracteres

Assuma que o problema é **encoding incorreto na leitura do arquivo**.

Procedimento obrigatório:

1. Reinterpretar o arquivo como UTF-8.
2. Verificar novamente o conteúdo.

Se os caracteres problemáticos persistirem:

- **Não modificar linhas que contenham esses caracteres**
- **Não apagar e recriar o arquivo**
- **Não escrever novamente esses caracteres no arquivo**

Nessa situação, o agente deve:

- informar o usuário
- indicar o arquivo afetado
- indicar as linhas com problema

---

# 2. Estilo de Comunicação com o Usuário

A comunicação deve seguir estas regras:

- Não utilizar emojis em nenhuma circunstância.
- Linguagem técnica, clara e objetiva.
- Evitar redundâncias.
- Não incluir explicações desnecessárias.

Sempre priorizar:

- precisão
- clareza
- concisão

---

# 3. Padrões para Código

- Não alterar código que não foi explicitamente solicitado.
- Não refatorar por iniciativa própria.
- Não criar arquivos ou pastas sem autorização.
- Manter consistência com o padrão já existente no projeto.
- Presumir sempre UTF-8 como encoding padrão dos arquivos.

---

# 4. Comentários em Código

Comentários devem ser mínimos.

É permitido comentar apenas quando:

- a lógica não for trivial
- houver regra de negócio implícita
- houver decisão técnica relevante

Comentários devem:

- explicar o **motivo da decisão**
- ser curtos
- ser claros

Comentários óbvios são proibidos.

Exemplo proibido:

```

incrementa contador

```

---

# 5. Processo Seguro de Edição de Arquivos

Antes de modificar qualquer arquivo, o agente deve:

1. Ler o arquivo completo.
2. Confirmar que o encoding está correto (UTF-8).
3. Confirmar que o conteúdo corresponde exatamente ao esperado.

Se o conteúdo não corresponder:

- **não tentar reconstruir o arquivo**
- **não adivinhar alterações**

O agente deve informar o usuário.

---

## 5.1 Falha ao aplicar alterações

Se uma alteração falhar devido a inconsistência de linhas.

Exemplo:

```

Failed to find expected lines

```

O agente deve:

- interromper a modificação
- informar o usuário
- não tentar contornar recriando o arquivo

---

# 6. Verificação Antes de Modificar Código

Antes de modificar qualquer arquivo, o agente deve:

1. Ler o arquivo completo.
2. Entender o contexto da alteração.
3. Verificar se a lógica relacionada existe em outros arquivos.
4. Confirmar que a alteração não quebra comportamento existente.

Se houver dúvida sobre impacto da alteração, o agente deve perguntar ao usuário antes de prosseguir.

---

# 7. Limite de Alterações

O agente deve modificar **apenas o mínimo necessário** para atender à solicitação do usuário.

É proibido:

- alterar lógica existente que não esteja diretamente relacionada à tarefa
- alterar nomes de variáveis ou funções sem necessidade
- modificar imports que não estejam relacionados à mudança
- reorganizar arquivos
- alterar formatação global do projeto
- alterar configurações do projeto

Caso o agente identifique que a solução exige alguma dessas alterações:

- ele deve **interromper a alteração**
- **notificar o usuário**
- **explicar brevemente por que considera a mudança necessária**

A alteração só pode ser realizada após confirmação do usuário.

---

# 8. Execução de Comandos

O agente não deve executar comandos que alterem o ambiente sem autorização explícita do usuário.

Exemplos:

- `npm run build`
- `yarn build`
- `pnpm build`
- `docker build`
- scripts de migração

Esses comandos só podem ser executados quando solicitados explicitamente.

---

# 9. Mensagens de Commit (Obrigatório)

A sugestão de commit só deve ser fornecida em respostas que confirmem a **modificação de arquivos**.

A sugestão deve seguir o padrão **Conventional Commits**.

Formato obrigatório:

```

tipo(escopo opcional): descrição curta

```

Tipos permitidos:

- feat
- fix
- refactor
- docs
- style
- chore
- test

Exemplos:

```

feat(api): adiciona endpoint de autenticação

```
```

fix(auth): corrige validação de token expirado

```

---

## 9.1 Regras da Sugestão de Commit

A mensagem de commit deve:

- aparecer **no final da resposta**
- estar **sozinha em um bloco de código**
- não possuir texto introdutório

Formato obrigatório:

```

tipo(escopo): descrição

```

Exemplo de saída esperada:

Explicação da alteração realizada.

```

fix(api): corrige tratamento de erro na autenticação

```

---

# 10. Comportamento do Agente

O agente deve sempre:

- perguntar quando houver ambiguidade
- evitar assumir requisitos não informados
- evitar gerar código fora do escopo solicitado
- respeitar as regras deste arquivo

A decisão final é sempre do humano responsável pelo projeto.

---

# 11. Qualidade e Manutenção de Código

## 11.1 Limite de tamanho de arquivos

Ao criar novos arquivos:

- o ideal é não ultrapassar **500 linhas**

Se um arquivo que o agente está gerando ultrapassar 500 linhas, o agente deve:
- interromper a geração
- procurar uma solução com arquitetura melhor
- modularizar o arquivo em partes menores

Ao editar arquivos existentes:

- se o arquivo já possuir mais de 500 linhas, não é responsabilidade do agente refatorá-lo.

---

## 11.2 Organização de Código

Sempre seguir a arquitetura existente do projeto.

Separar responsabilidades conforme o padrão já adotado:

- serviços
- hooks
- utilitários
- componentes
- regras de negócio

Se o agente identificar oportunidades de melhorar a arquitetura, ele deve notificar o usuário e apresentar suas sugestões.

---

## 11.3 Registro de Arquivos Grandes

Sempre que interagir com um arquivo com mais de **500 linhas**, registrar no arquivo:

```

Documentation/pontos-de-atencao.md

```

Formato obrigatório:

```

caminho/do/arquivo.ts | 750

```

Regras:

- adicionar no final do arquivo
- não duplicar registros
- verificar antes de inserir

---

## 11.4 Nomenclatura de Arquivos

Se o nome de um arquivo não for profissional, claro ou semanticamente correto, o agente deve:
- notificar o usuário
- sugerir nomes mais adequados e profissionais

---

# 12. Autoridade

Este arquivo define o comportamento esperado de agentes neste repositório.

Caso exista conflito entre instruções:

**AGENTS.md deve ser seguido.**

---

# 13. Documentacao obrigatoria para backend
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

---

# 14. Local recomendado da documentacao de API
- Salvar em `doc/` ou `docs/`, com nome claro por dominio.
- Exemplo: `doc/api-cards.md`, `doc/api-auth.md`.

---

# 15. Definicao de pronto para backend
- Uma tarefa de backend so e considerada concluida quando o codigo e o `.md` correspondente estiverem atualizados.

---

# 16. Compatibilidade App x API (obrigatorio)
- Quando existir um campo no app e esse campo nao existir na API, **nao remover o campo do app por conta propria**.
- Antes de qualquer alteracao de contrato no app:
  - sinalizar claramente o problema ao usuario;
  - gerar um prompt para a IA responsavel pela API pedindo criacao/ajuste do campo faltante (incluindo migration e retrocompatibilidade);
  - aguardar decisao do usuario.
- So remover/alterar campo no app com aprovacao explicita do usuario.

---

# 17. Diretriz de ambientes (obrigatorio)
- Sempre considerar e explicitar em qual ambiente cada alteracao sera aplicada:
  - **VPS**
  - **Banco de dados (dentro da VPS)**
  - **API (este repo)**
  - **Codigo do cliente desktop**
  - **Codigo do cliente mobile (um repo so para os dois clientes)**
- Nunca assumir que alterar um ambiente atualiza automaticamente os demais.
- Sempre informar impacto cruzado entre App, API e Banco antes de executar mudancas de contrato.
