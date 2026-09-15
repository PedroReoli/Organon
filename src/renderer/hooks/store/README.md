# Store slices

Pasta de **funcoes puras de mutacao** do estado do `useStore`. Definido no upgrade 07 sub-A + upgrade 19.

## Por que assim

O `useStore.ts` original tem 2227 linhas com 90+ mutations inline. Big bang real (cada slice com state isolado via Context) exigiria refator de todos os componentes consumidores e e arriscado.

A abordagem aqui e modular **sem mudar a assinatura externa** do `useStore`:

1. Cada arquivo `*.slice.ts` exporta funcoes puras de transformacao de estado: `(prevStore, args) => nextStore`.
2. O `useStore.ts` importa essas funcoes e as chama dentro dos `useCallback` que ja existem.
3. Componentes nao mudam: continuam consumindo as funcoes do `useStore` exatamente como antes.
4. Quando um slice estiver bem testado e isolado, o proximo passo (futuro) e migrar para hooks com state proprio (`useCardsStore`, `useNotesStore` etc) e Context.

Beneficios imediatos:
- Cada arquivo de slice fica abaixo de 300 linhas.
- Mutations testaveis isoladamente (entrada -> saida, sem React).
- `useStore.ts` reduzido (orquestrador fino).
- Pattern claro para novas features.

## Convencao

Cada slice exporta funcoes nomeadas com prefixo do dominio:

```ts
// cards.slice.ts
export function cardsAdd(prev: Store, args: { title: string }): Store
export function cardsAddWithDate(prev: Store, args: {...}): { store: Store; createdId: string | null }
export function cardsEdit(prev: Store, cardId: string, updates: ...): Store
export function cardsRemove(prev: Store, cardId: string): Store
export function cardsMoveToCell(prev: Store, ...): Store
export function cardsReorderInCell(prev: Store, ...): Store
```

Funcoes que precisam retornar dado adicional alem do novo store retornam um objeto `{ store, ...extra }`.

## Migracao em progresso

- [x] cards.slice.ts
- [x] notes.slice.ts
- [x] calendar.slice.ts
- [x] financial.slice.ts
- [x] habits.slice.ts
- [ ] crm.slice.ts
- [ ] study.slice.ts
- [ ] shortcuts.slice.ts
- [ ] clipboard.slice.ts
- [ ] apps.slice.ts
- [ ] playbook.slice.ts
- [ ] meetings.slice.ts
- [ ] projects.slice.ts
- [ ] colorPalettes.slice.ts
- [ ] quickAccess.slice.ts
- [ ] settings.slice.ts

Os 5 primeiros sao exemplos do pattern. Os demais serao migrados em sprints futuros usando o mesmo padrao.
