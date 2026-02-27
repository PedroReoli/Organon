# Telas — Organon Mobile

Especificação de cada tela adaptada para mobile.
As funcionalidades são as mesmas do desktop, com layout reimaginado para tela pequena.

---

## 1. Today (Dashboard)

**Propósito:** Visão diária consolidada — o ponto de partida do dia.

### Layout mobile
```
┌─────────────────────────────────────────────┐
│  ☰  Organon · Hoje              [+]         │
├─────────────────────────────────────────────┤
│  Sexta-feira, 27 de fevereiro               │
│  ☀️ 24°C  |  3 tarefas hoje                 │
├─────────────────────────────────────────────┤
│  Prioridades do dia                   [ver]  │
│  ┌──────────────────────────────────────┐   │
│  │ P1 · Preparar apresentação  [todo]   │   │
│  │ P2 · Revisar contrato       [feito]  │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  Próximos eventos                     [ver]  │
│  ┌──────────────────────────────────────┐   │
│  │ 14h · Reunião semanal                │   │
│  │ 16h · Call com cliente               │   │
│  └──────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│  Hábitos hoje                         [ver]  │
│  ✅ Exercício  ⬜ Leitura  ⬜ Água         │
├─────────────────────────────────────────────┤
│  Resumo financeiro                    [ver]  │
│  Mês: -R$2.340 / +R$5.000                   │
└─────────────────────────────────────────────┘
```

### Adaptações mobile
- Cards de seção com scroll vertical
- "ver" navega para a tela correspondente
- FAB: cria card rápido para hoje

---

## 2. Planner (Planejamento semanal)

**Propósito:** Organizar tarefas por dia da semana e período do dia.

### Layout mobile
```
┌─────────────────────────────────────────────┐
│  ☰  Planejador                    [+]       │
├─────────────────────────────────────────────┤
│  ← Semana 9  (03–09 Mar 2025)  →            │
├─────────────────────────────────────────────┤
│  [Seg] [Ter] [Qua] [Qui] [Sex] [Sáb] [Dom]  │
│         ↑ tab ativa = dia atual             │
├─────────────────────────────────────────────┤
│  [Manhã] [Tarde] [Noite]                    │
├─────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐   │
│  │ Reunião com time        [todo] [P2]  │   │
│  ├──────────────────────────────────────┤   │
│  │ Revisar PR              [feito][P3]  │   │
│  ├──────────────────────────────────────┤   │
│  │ + Adicionar card                     │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Adaptações mobile
- Dias como tabs horizontais com scroll (swipe)
- Períodos (manhã/tarde/noite) como tabs secundárias
- Lista vertical de cards em vez de grid
- Tap longo no card para opções (mover, editar, excluir)
- FAB: novo card no dia/período ativo

---

## 3. Calendário

**Propósito:** Eventos, lembretes e recorrências.

### Layout mobile
```
┌─────────────────────────────────────────────┐
│  ☰  Calendário                    [+]       │
├─────────────────────────────────────────────┤
│  [Mês] [Semana] [Dia]                       │
├─────────────────────────────────────────────┤
│  ← Fevereiro 2025 →                        │
│  Dom Seg Ter Qua Qui Sex Sáb                │
│   1   2   3   4   5   6   7                 │
│   8   9  10  11  12  13  14                 │
│  [15] 16  17  18  19  20  21  ← hoje        │
│  22  23  24  25  26  27  28                 │
├─────────────────────────────────────────────┤
│  Eventos em 15/02                           │
│  > 10h · Dentista                           │
│  > 14h · Reunião de alinhamento             │
└─────────────────────────────────────────────┘
```

### Adaptações mobile
- Visualização mensal padrão
- Tap no dia mostra lista de eventos abaixo (bottom sheet expandível)
- Swipe horizontal para navegar entre meses/semanas
- FAB: novo evento

---

## 4. Backlog

**Propósito:** Tarefas sem data definida.

### Layout mobile
Lista simples com filtros por prioridade e status.
FAB: novo card.

---

## 5. Notas

**Propósito:** Notas em rich text com hierarquia de pastas.

### Layout mobile
```
┌─────────────────────────────────────────────┐
│  ☰  Notas                         [+]       │
├─────────────────────────────────────────────┤
│  📁 Trabalho                                │
│  📁 Pessoal                                 │
│  📄 Ideia rápida                            │
│  📄 Reunião 15/02                           │
└─────────────────────────────────────────────┘
```

**Ao abrir uma pasta:**
```
┌─────────────────────────────────────────────┐
│  ← Trabalho                        [+]      │
├─────────────────────────────────────────────┤
│  📁 Projetos                                │
│  📄 Briefing cliente X                      │
│  📄 Planejamento Q1                         │
└─────────────────────────────────────────────┘
```

**Ao abrir uma nota:**
- Tela full-screen com editor rich text
- Toolbar de formatação na parte inferior (não bloqueia texto)
- Botão voltar no header

### Adaptações mobile
- Hierarquia como lista com navegação por drill-down (sem painel lateral)
- Editor ocupa tela inteira
- Toolbar de formatação no fundo, acima do teclado
- FAB: nova nota/pasta no nível atual

---

## 6. CRM

**Propósito:** Gestão de contatos com pipeline.

### Layout mobile
```
┌─────────────────────────────────────────────┐
│  ☰  CRM                            [+]      │
├─────────────────────────────────────────────┤
│  [Todos] [Pipeline] [Por tag]               │
├─────────────────────────────────────────────┤
│  🔍 Buscar contato...                       │
├─────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐   │
│  │ João Silva          [Lead] [Dev]     │   │
│  │ Empresa X · joao@x.com               │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ Maria Costa         [Cliente] [UX]   │   │
│  │ Agência Y · maria@y.com              │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Visão Pipeline** — colunas horizontais com scroll:
```
[Lead] → [Contato] → [Proposta] → [Cliente] → [Inativo]
```

### Adaptações mobile
- Lista de contatos como cards
- Pipeline como scroll horizontal de colunas
- Detalhe do contato como tela separada (stack navigation)
- FAB: novo contato

---

## 7. Playbook

**Propósito:** Templates de comunicação reusáveis.

### Layout mobile
Lista por setor/categoria com cards expandíveis.
Tap abre template em modal de leitura/cópia.

---

## 8. Projetos

**Propósito:** Tracking de projetos de desenvolvimento.

### Layout mobile
Cards de projeto com status, links e cards vinculados.
FAB: novo projeto.

---

## 9. Clipboard

**Propósito:** Snippets de texto reutilizáveis.

### Layout mobile
Lista por categoria. Tap copia para o clipboard do sistema.
Swipe para editar/excluir.

---

## 10. Arquivos

**Propósito:** Gerenciar arquivos importados (PDFs, imagens).

### Layout mobile
Grid ou lista de arquivos. Tap abre preview.
Botão para importar do sistema de arquivos do dispositivo.

---

## 11. Atalhos

**Propósito:** Links organizados em pastas.

### Layout mobile
Hierarquia de pastas como lista. Tap abre URL no browser.
Swipe para copiar/editar/excluir.

---

## 12. Caminhos (Paths)

**Propósito:** Caminhos de sistema frequentemente usados.

### Adaptação mobile
No mobile, "caminhos" se tornam **links deeplink** e **links para pastas** (Google Drive, iCloud, etc.).
A funcionalidade de abrir path do sistema não existe em mobile (sandbox).

---

## 13. Apps

**Propósito:** Launcher de aplicativos.

### Adaptação mobile
No mobile, "apps" se tornam **links deeplink** para outros apps instalados.
Ex.: `spotify://`, `notion://`, `youtube://`
Sem execução de macros (não permitido pelo OS).

---

## 14. Cores

**Propósito:** Paletas de cores para trabalho de design.

### Layout mobile
Grid de cores por paleta. Tap copia o hex.
Swipe para editar/excluir.

---

## 15. Hábitos

**Propósito:** Tracking de hábitos diários/semanais.

### Layout mobile
```
┌─────────────────────────────────────────────┐
│  ☰  Hábitos                        [+]      │
├─────────────────────────────────────────────┤
│  ← Semana de 10–16 fev →                   │
├─────────────────────────────────────────────┤
│  Exercício (diário)                         │
│  [S] [✅] [✅] [⬜] [✅] [⬜] [S]            │
├─────────────────────────────────────────────┤
│  Leitura (30 min)                           │
│  [S] [✅] [⬜] [✅] [✅] [⬜] [S]            │
├─────────────────────────────────────────────┤
│  Água (8 copos)                             │
│  [S] [6/8][7/8][8/8][5/8][⬜] [S]           │
└─────────────────────────────────────────────┘
```

### Adaptações mobile
- Scroll vertical de hábitos, scroll horizontal de dias
- Tap no checkbox registra entrada
- Tap longo no dia permite editar ou pular com motivo
- FAB: novo hábito

---

## 16. Estudo

**Propósito:** Sessões de estudo com tracking de tempo e foco.

### Layout mobile
Timer de sessão centralizado.
Lista de sessões recentes abaixo.
Integração com YouTube/áudio via links.

---

## 17. Financeiro

**Propósito:** Controle de despesas, receitas, contas e orçamentos.

### Layout mobile
```
┌─────────────────────────────────────────────┐
│  ☰  Financeiro                     [+]      │
├─────────────────────────────────────────────┤
│  [Visão Geral][Despesas][Receitas][Contas]  │
│               [Orçamento]                   │
├─────────────────────────────────────────────┤
│  Fevereiro 2025                             │
│  Saldo: +R$ 2.660,00                        │
│  ████████████░░░░  R$2.340/R$4.000 gasto   │
├─────────────────────────────────────────────┤
│  Lançamentos recentes                       │
│  > 27/02 · Supermercado     -R$320,00       │
│  > 26/02 · Salário         +R$5.000,00      │
│  > 25/02 · Netflix           -R$55,90       │
└─────────────────────────────────────────────┘
```

### Adaptações mobile
- Tabs para separar visões
- Gráficos de barra horizontal para orçamentos
- Lista de lançamentos com swipe para editar/excluir
- FAB: novo lançamento

---

## 18. Histórico

**Propósito:** Log de atividades recentes.

### Layout mobile
Lista cronológica de eventos (criar, editar, excluir por domínio).
Filtros por tipo (Cards, Notas, Eventos, etc.).

---

## 19. Configurações

**Propósito:** Preferências, temas, dados, conta.

### Layout mobile
Lista de seções:
- **Aparência** — tema (dark/light), fonte
- **Navegação** — ordem das seções no drawer
- **Conta** — login/logout Appwrite, status sync
- **Dados** — backup, restaurar, exportar
- **Sobre** — versão, changelog

---

## Padrões visuais comuns

### Cards de item
```
┌──────────────────────────────────────────────┐
│  [Ícone] Título                   [badge]    │
│  Subtítulo / metadado                        │
│  [tag] [tag]                     data/hora   │
└──────────────────────────────────────────────┘
```

### Bottom sheet para modais de criação/edição
- Abre de baixo para cima
- Campo por campo com teclado nativo
- Botões "Cancelar" e "Salvar" no topo do sheet

### Empty state
```
┌──────────────────────────────────────────────┐
│                                              │
│            [ícone ilustrativo]               │
│                                              │
│       Nenhuma [entidade] ainda.              │
│    Toque no + para criar o primeiro.         │
│                                              │
└──────────────────────────────────────────────┘
```
