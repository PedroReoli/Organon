# Matriz de ciclo de vida no Windows

Esta matriz distingue cobertura automatizada de homologação em instaladores reais. `PASS automatizado` não equivale a aceite físico.

| Cenário | Invariante | Cobertura atual | Homologação física |
|---|---|---|---|
| Primeira instalação por usuário | app inicia e cria a raiz somente após mutação | build/configuração | Pendente |
| Upgrade sobre raiz dedicada | backup íntegro antecede download; contagens e `rootId` permanecem | gate de backup e testes de storage | Pendente |
| Upgrade com configuração perdida | raiz dedicada válida é redescoberta sem criar raiz vazia | teste automatizado | Pendente |
| Upgrade interrompido antes de `CURRENT` | geração anterior continua visível | fault injection | Pendente |
| Upgrade interrompido após `CURRENT` | commit publicado é recuperado como concluído | fault injection | Pendente |
| Reinstalação mesma versão | dados e configuração durável permanecem | política do pacote | Pendente |
| Desinstalação padrão | app é removido; data root não é apagado | `deleteAppDataOnUninstall=false` | Pendente |
| Instalação sem admin | fluxo por usuário funciona sem elevação obrigatória | configuração NSIS | Pendente |
| Caminho com espaços/acentos | app, CLI, modelo e exportação funcionam | testes parciais de paths | Pendente |
| Windows 10 x64 | boot, gravação, atualização e uninstall | não executado | Pendente |
| Windows 11 x64 | boot, gravação, atualização e uninstall | não executado | Pendente |

## Evidência a guardar por execução

- versão origem/destino, hash do instalador e canal;
- caminhos efetivos de instalação, `userData`, `sessionData` e data root;
- `rootId`, revisão, contagens e validação de backup antes/depois;
- logs do updater e screenshots das decisões do instalador;
- resultado de uninstall e prova de que a raiz durável permaneceu.

