# Arquitetura do Organon

## Visao geral
Organon adota uma arquitetura desktop local.
A aplicacao roda em Electron e usa uma interface React no processo de renderizacao.
O objetivo tecnico central e manter baixa complexidade operacional com alta confiabilidade de dados locais.

## Camadas principais

### Shell desktop
A camada Electron cuida da janela, ciclo de vida da aplicacao e acesso ao sistema operacional.
Tambem centraliza operacoes que precisam de permissao local, como abrir caminhos, importar arquivos e executar aplicativos.

### Interface
A camada React organiza as telas por dominio funcional.
Cada view representa um contexto de uso, com interacoes focadas em produtividade e continuidade.

### Estado e regras
A camada de estado concentra normalizacao, migracao de formato, operacoes de escrita e consistencia entre modulos.
Regras de negocio sao aplicadas antes da persistencia para evitar dados incompletos ou incoerentes.

### Persistencia
O armazenamento e local, com leitura e escrita estruturada de dados.
A estrategia prioriza autonomia offline, previsibilidade e controle total pelo usuario.

## Fluxo de dados
A interacao nasce na interface, passa por handlers de dominio e chega na camada de estado.
A camada de estado atualiza memoria, normaliza estrutura e dispara persistencia local.
Na abertura do app, os dados sao carregados, validados e ajustados para o formato atual.

## Organizacao funcional
A navegacao interna distribui o produto por blocos de trabalho, conteudo, ferramentas e uso pessoal.
A configuracao da navbar e customizavel, mantendo rotas fixas e permitindo reorganizacao visual.

## Integracoes locais
O app integra com recursos do sistema para:
- abrir links e caminhos
- manipular arquivos importados
- registrar e executar aplicativos
- backup e restauracao
- notificacoes de lembrete

## Confiabilidade operacional
A abordagem local-first reduz dependencia de servicos externos.
Backups e recuperacao compoem a estrategia de resiliencia.
A evolucao do estado inclui compatibilidade com formatos anteriores para preservar historico de uso.