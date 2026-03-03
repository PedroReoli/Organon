# Fragmentacao das Telas Mobile (sem alterar layout)

Objetivo: quebrar arquivos grandes em partes pequenas, com arquitetura facil de manter, sem perder nada visual.

## Regras para todas as telas

1. Nao alterar JSX visual final, espacamentos, cores, fontes, textos e navegacao.
2. Separar em `sections`, `components`, `hooks`, `styles`, `types`, `constants`.
3. Manter o container da tela com responsabilidade minima: orquestrar estado, navegacao e composicao.
4. Extrair logica repetida para hooks.
5. Extrair estilos para arquivo proprio quando a tela passar de ~250 linhas.
6. Validar cada tela com comparacao visual antes/depois.

Estrutura padrao por tela:

```txt
mobile/src/screens/<Tela>/
  <Tela>Screen.tsx
  sections/
  components/
  hooks/
  constants.ts
  types.ts
  styles.ts
  utils.ts
```

## Solucao por tela

### 1) StudyScreen (1420 linhas)

Problema: tela com muita responsabilidade (tabs, swipe, pomodoro, notificacao, CRUD de metas/flashcards/notas, relatorios, footer).

Quebrar em:

```txt
mobile/src/screens/study/
  StudyScreen.tsx
  hooks/
    useStudyPomodoro.ts
    useStudySwipeTabs.ts
    useStudyForms.ts
  sections/
    StudyDashboardSection.tsx
    StudyGoalsSection.tsx
    StudyReportsSection.tsx
    StudyHistorySection.tsx
    StudyFlashcardsSection.tsx
    StudyNotesSection.tsx
    StudyConfigSection.tsx
  components/
    StudyTopNav.tsx
    StudyFooter.tsx
    GoalCard.tsx
    FlashcardItem.tsx
    NoteItem.tsx
  sheets/
    GoalSheet.tsx
    FlashcardSheet.tsx
    NoteSheet.tsx
  constants.ts
  styles.ts
  types.ts
```

Ordem recomendada:
1. Extrair `styles`.
2. Extrair `sections`.
3. Extrair `sheets`.
4. Extrair hooks (pomodoro + swipe).
5. Ajustar imports sem mudar layout.

### 2) PlannerScreen (1244 linhas)

Problema: regras de backlog/hoje/kanban/swipe junto com renderizacao.

Quebrar em:

```txt
mobile/src/screens/planner/
  PlannerScreen.tsx
  sections/
    PlannerHeaderSection.tsx
    PlannerBoardSection.tsx
    PlannerBacklogSection.tsx
    PlannerTodaySection.tsx
  components/
    DaySummaryBar.tsx
    PlannerCardItem.tsx
    PlannerFooter.tsx
  hooks/
    usePlannerBoard.ts
    usePlannerSwipe.ts
    usePlannerFilters.ts
  styles.ts
  constants.ts
  types.ts
```

### 3) CalendarScreen (1177 linhas)

Problema: calendario mensal, selecao, evento, edicao e listagem acoplados.

Quebrar em:

```txt
mobile/src/screens/calendar/
  CalendarScreen.tsx
  sections/
    CalendarGridSection.tsx
    CalendarDayEventsSection.tsx
    CalendarFooterSection.tsx
  components/
    MonthHeader.tsx
    DayCell.tsx
    EventCard.tsx
    PeriodFilterChips.tsx
  sheets/
    MonthPickerSheet.tsx
    EventFormSheet.tsx
    EventDetailsSheet.tsx
  hooks/
    useCalendarState.ts
    useCalendarEventsFilter.ts
    useCalendarSwipe.ts
  styles.ts
  constants.ts
  types.ts
```

### 4) FinancialScreen (1041 linhas)

Problema: receitas/despesas/config e navegacao por swipe tudo junto.

Quebrar em:

```txt
mobile/src/screens/financial/
  FinancialScreen.tsx
  sections/
    FinancialOverviewSection.tsx
    FinancialExpensesSection.tsx
    FinancialIncomesSection.tsx
    FinancialGoalsSection.tsx
  components/
    FinancialNavbar.tsx
    FinancialFooter.tsx
    MonthSelectorGrid.tsx
    TransactionCard.tsx
  sheets/
    ExpenseFormSheet.tsx
    IncomeFormSheet.tsx
    FinancialSettingsSheet.tsx
  hooks/
    useFinancialMonth.ts
    useFinancialSwipe.ts
    useFinancialTotals.ts
  styles.ts
  constants.ts
  types.ts
```

### 5) HabitsScreen (588 linhas)

Problema: lista, relatorio e detalhes ainda simplificados.

Quebrar em:

```txt
mobile/src/screens/habits/
  HabitsScreen.tsx
  sections/
    HabitsListSection.tsx
    HabitsReportsSection.tsx
  components/
    HabitCard.tsx
    HabitProgress.tsx
    HabitDetailPanel.tsx
  hooks/
    useHabitsProgress.ts
    useHabitsReports.ts
  styles.ts
  types.ts
```

### 6) NotesScreen (384 linhas)

Quebrar em:

```txt
mobile/src/screens/notes/
  NotesScreen.tsx
  sections/
    NotesFoldersSection.tsx
    NotesListSection.tsx
  components/
    NoteCard.tsx
    FolderChip.tsx
  hooks/
    useNotesFilters.ts
  styles.ts
```

### 7) TodayScreen (363 linhas)

Quebrar em:

```txt
mobile/src/screens/today/
  TodayScreen.tsx
  sections/
    TodaySummarySection.tsx
    TodayTasksSection.tsx
    TodayHabitsSection.tsx
  components/
    TodayCard.tsx
  hooks/
    useTodayData.ts
  styles.ts
```

### 8) HistoryScreen (330 linhas)

Quebrar em:

```txt
mobile/src/screens/history/
  HistoryScreen.tsx
  sections/
    HistoryTimelineSection.tsx
    HistoryFiltersSection.tsx
  components/
    HistoryItemCard.tsx
  hooks/
    useHistoryFilter.ts
  styles.ts
```

### 9) SettingsScreen (302 linhas)

Quebrar em:

```txt
mobile/src/screens/settings/
  SettingsScreen.tsx
  sections/
    ThemeSection.tsx
    PreferencesSection.tsx
    SyncSection.tsx
  components/
    SettingRow.tsx
  hooks/
    useSettingsActions.ts
  styles.ts
```

### 10) CRMScreen (234 linhas)

Quebrar em:

```txt
mobile/src/screens/crm/
  CRMScreen.tsx
  sections/
    CRMContactsSection.tsx
    CRMInteractionsSection.tsx
  components/
    CRMContactCard.tsx
  hooks/
    useCRMData.ts
  styles.ts
```

### 11) ShortcutsScreen (197 linhas)

Quebrar em:

```txt
mobile/src/screens/shortcuts/
  ShortcutsScreen.tsx
  sections/
    ShortcutsFoldersSection.tsx
    ShortcutsGridSection.tsx
  components/
    ShortcutCard.tsx
  hooks/
    useShortcuts.ts
  styles.ts
```

### 12) PlaybookScreen (177 linhas)

Quebrar em:

```txt
mobile/src/screens/playbook/
  PlaybookScreen.tsx
  sections/
    PlaybookListSection.tsx
  components/
    PlaybookCard.tsx
  hooks/
    usePlaybooks.ts
  styles.ts
```

### 13) ColorsScreen (126 linhas)

Quebrar em:

```txt
mobile/src/screens/colors/
  ColorsScreen.tsx
  components/
    PaletteCard.tsx
  hooks/
    useColorPalettes.ts
  styles.ts
```

## Estrategia de execucao (simples)

1. Refatorar primeiro telas grandes: `Study`, `Planner`, `Calendar`, `Financial`.
2. Em cada tela:
   - mover apenas estilos;
   - mover apenas secoes visuais;
   - mover regras para hooks;
   - rodar teste visual e lint/typecheck.
3. Depois aplicar o mesmo padrao nas telas medias/pequenas.

## Definicao de pronto por tela

1. Layout identico ao atual (comparacao visual).
2. Mesmo comportamento (swipe, botoes, sheets, filtros, navegação).
3. Arquivo principal da tela com foco em composicao (idealmente <250 linhas).
4. Hooks e componentes com nomes claros e responsabilidade unica.
