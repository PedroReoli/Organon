Tudo implementado. Resumo do que foi feito:

1. Instância única — main/index.ts: app.requestSingleInstanceLock() adicionado. Segunda instância fecha e traz a janela existente para frente.

2. Busca de atalhos + notas — ShortcutSearchModal.tsx: Resultados agora incluem notas com seções separadas "Atalhos" / "Notas". Clicar numa nota navega para ela.

3. Drag pasta para raiz — NotesView.tsx: Drop zone visível aparece durante o drag com texto "Mover para raiz". Resolve o problema de onDragLeave disparando ao passar sobre filhos.

4. Atalhos de Notas configuráveis — Adicionados notes-new (Ctrl+N) e notes-search (Ctrl+F) ao DEFAULT_SETTINGS.keyboardShortcuts. Aparecem na tela Configurações e são configuráveis. NotesView lê e usa os atalhos configurados.

5. Modal de confirmação ao excluir nota — Modal centralizado com ícone de lixeira, nome da nota e botões "Cancelar" / "Excluir". Disparado de qualquer ponto de exclusão (barra lateral, editor, menu de contexto).

6. Subpágina inline no editor — Novo nó Tiptap subpageBlock: ao invocar /page, o bloco com ícone de página e título aparece onde o cursor estava. Clicar no bloco navega para a subpágina. Botão × para remover a referência.

7. Revisão do doc da API — O documento está correto. Lacunas identificadas: falta exemplo do body do POST /sync/batch, recursos não sincronizados deveriam ser explicitamente listados como locais, client_updated_at não aparece como campo especial na seção 8, e verificar se PATCH /finance/incomes/:id existe ou foi omitido.