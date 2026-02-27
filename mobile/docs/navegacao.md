# Navegação — Organon Mobile

## Conceito

No desktop, o app tem uma sidebar fixa sempre visível com todos os módulos.
No mobile, o espaço é limitado — a sidebar vira um **Drawer lateral** acessível pelo **hamburger menu**.

A busca global, que no desktop é um modal separado (Ctrl+K), no mobile fica **dentro do próprio drawer**, sempre visível quando ele está aberto.

---

## Header (barra superior)

Presente em todas as telas. Contém:

```
┌─────────────────────────────────────────────┐
│  ☰   Organon · [Nome da Tela]          [···]│
└─────────────────────────────────────────────┘
```

- **☰ (hamburguer)** — abre o drawer
- **Título** — nome do app + tela atual
- **[···] (ações contextuais)** — ações específicas da tela (ex.: "Novo card", "Filtrar", "Exportar")

---

## Drawer (menu lateral)

Ao tocar no hamburger, um drawer desliza da esquerda.

### Layout do drawer

```
┌──────────────────────────────┐
│  🔍 Buscar...                │  ← campo de busca
├──────────────────────────────┤
│  [hoje]  [configurações]     │  ← atalhos fixos
├──────────────────────────────┤
│  ▾ Organização               │  ← seção colapsável
│     📅 Planejador            │
│     🗓 Calendário            │
│     📋 Backlog               │
├──────────────────────────────┤
│  ▾ Trabalho                  │
│     👥 CRM                   │
│     📖 Playbook              │
│     🗂 Projetos              │
│     🎨 Cores                 │
├──────────────────────────────┤
│  ▾ Ferramentas               │
│     🔗 Atalhos               │
│     📁 Caminhos              │
│     🚀 Apps                  │
├──────────────────────────────┤
│  ▾ Conteúdo                  │
│     📝 Notas                 │
│     📎 Clipboard             │
│     🗃 Arquivos              │
├──────────────────────────────┤
│  ▾ Pessoal                   │
│     ✅ Hábitos               │
│     📚 Estudo                │
│     💰 Financeiro            │
├──────────────────────────────┤
│  🕐 Histórico                │
└──────────────────────────────┘
```

### Comportamento do drawer
- Abre com gesto de swipe da esquerda para a direita (além do botão)
- Fecha ao tocar em qualquer item ou fora do drawer
- Seções colapsáveis: estado de expandido/recolhido salvo em AsyncStorage
- Item ativo destacado com cor de destaque do tema
- Avatar/nome do usuário no topo (se autenticado no Appwrite)

---

## Busca global (dentro do drawer)

O campo de busca no topo do drawer é o ponto central de busca.

### O que a busca retorna
- Cards (tarefas) — por título e descrição
- Eventos de calendário — por título
- Notas — por título e conteúdo
- Contatos CRM — por nome, empresa, email
- Atalhos — por nome e URL
- Itens do clipboard — por texto
- Playbooks — por título e setor

### Como funciona
1. Usuário digita no campo
2. Resultado aparece em tempo real abaixo do campo (substitui a lista de navegação)
3. Resultados agrupados por tipo (Cards, Notas, Contatos, etc.)
4. Toque no resultado navega para a tela correspondente e abre o item

### Layout dos resultados

```
┌──────────────────────────────┐
│  🔍 "reunião"                │
├──────────────────────────────┤
│  Cards                       │
│  > Reunião com cliente       │
│  > Preparar pauta reunião    │
├──────────────────────────────┤
│  Calendário                  │
│  > Reunião semanal (Sex 14h) │
├──────────────────────────────┤
│  Notas                       │
│  > Ata de reunião - Jan      │
└──────────────────────────────┘
```

---

## Navegação interna das telas

Algumas telas têm sub-navegação interna (não usa o drawer, usa tabs ou seletores locais).

### Planner
```
[Seg] [Ter] [Qua] [Qui] [Sex] [Sáb] [Dom]
─── navegação horizontal entre dias ───
[Manhã] [Tarde] [Noite]  ← tabs de período
```

### Calendário
```
[Mês] [Semana] [Dia]  ← tabs de visualização
```

### Financeiro
```
[Visão geral] [Despesas] [Receitas] [Contas] [Orçamento]
```

### Notas
```
Pasta atual → Subpastas/Notas  ← breadcrumb + lista
```

### CRM
```
[Todos] [Pipeline] [Por tag]  ← tabs
```

### Hábitos
```
← [Semana atual] →  ← navegação temporal
```

---

## Gestos nativos

| Gesto | Ação |
|---|---|
| Swipe da esquerda | Abre o drawer |
| Swipe da direita no drawer | Fecha o drawer |
| Pull-to-refresh | Atualiza dados / força sync |
| Swipe horizontal (Planner) | Navega entre dias |
| Long press em card/item | Abre menu de ações (editar, excluir, mover) |
| Swipe horizontal em item de lista | Ações rápidas (excluir, completar) |

---

## FAB (Floating Action Button)

Cada tela tem um FAB no canto inferior direito para a ação principal:

| Tela | Ação do FAB |
|---|---|
| Today | Novo card rápido |
| Planner | Novo card no dia/período atual |
| Calendário | Novo evento |
| Notas | Nova nota |
| CRM | Novo contato |
| Hábitos | Novo hábito |
| Financeiro | Novo lançamento |
| Clipboard | Novo item |
| Atalhos | Novo atalho |

---

## Estrutura React Navigation

```tsx
// Pseudocódigo da estrutura de navegação

<NavigationContainer>
  <Drawer.Navigator
    drawerContent={(props) => <AppDrawer {...props} />}
    screenOptions={{
      header: (props) => <AppHeader {...props} />,
      drawerType: 'slide',
      swipeEnabled: true,
    }}
  >
    <Drawer.Screen name="today" component={TodayScreen} />
    <Drawer.Screen name="planner" component={PlannerScreen} />
    <Drawer.Screen name="calendar" component={CalendarScreen} />
    <Drawer.Screen name="backlog" component={BacklogScreen} />
    <Drawer.Screen name="notes" component={NotesScreen} />
    <Drawer.Screen name="crm" component={CRMScreen} />
    <Drawer.Screen name="playbook" component={PlaybookScreen} />
    <Drawer.Screen name="projects" component={ProjectsScreen} />
    <Drawer.Screen name="clipboard" component={ClipboardScreen} />
    <Drawer.Screen name="files" component={FilesScreen} />
    <Drawer.Screen name="shortcuts" component={ShortcutsScreen} />
    <Drawer.Screen name="paths" component={PathsScreen} />
    <Drawer.Screen name="apps" component={AppsScreen} />
    <Drawer.Screen name="colors" component={ColorsScreen} />
    <Drawer.Screen name="habits" component={HabitsScreen} />
    <Drawer.Screen name="study" component={StudyScreen} />
    <Drawer.Screen name="financial" component={FinancialScreen} />
    <Drawer.Screen name="history" component={HistoryScreen} />
    <Drawer.Screen name="settings" component={SettingsScreen} />
  </Drawer.Navigator>
</NavigationContainer>
```
