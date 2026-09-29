# Homologação física pendente

Os itens abaixo não podem ser substituídos por typecheck, build, fixtures ou simulação de áudio.

## Áudio e reunião

- microfone real, loopback real e troca de dispositivo durante a sessão;
- reunião de pelo menos 60 minutos e arquivo próximo do limite operacional;
- duas ou mais vozes, silêncio, clipping e ruído de fundo;
- stop, restart do app, replay/seek por segmento e exportação Obsidian idempotente;
- comparação dos offsets do provider com o áudio ouvido.

## Soak de processo

- 100 ciclos de abrir/ocultar/fechar a janela rápida com gravações curtas;
- 4 horas em tray;
- zero track ativo após stop;
- quantidade estável de janelas e `webContents` quando há reutilização;
- memória retorna a uma faixa estável após idle/GC e event-loop permanece dentro do budget definido pelo time.

## Ciclo de vida

Executar toda a [matriz Windows](./windows-lifecycle-matrix.md) com instaladores assinados do canal candidato. Registrar falhas sem reclassificar testes estruturais como aceite visual ou de produção.

