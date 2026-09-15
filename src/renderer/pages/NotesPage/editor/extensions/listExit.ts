import { Extension } from '@tiptap/core'

/**
 * Permite sair de listas facilmente:
 * - Enter em item vazio: sai da lista (lift)
 * - Backspace no inicio de item vazio: sai da lista
 */
export const ListExit = Extension.create({
  name: 'listExit',
  priority: 101, // acima do default para interceptar antes

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { state } = editor
        const { selection } = state
        const { $from } = selection

        // Verifica se estamos em um listItem
        const listItem = $from.node(-1)
        if (!listItem || (listItem.type.name !== 'listItem' && listItem.type.name !== 'taskItem')) {
          return false
        }

        // Verifica se o item esta vazio (so tem um paragrafo vazio)
        const isEmptyItem = listItem.content.size <= 2 && !listItem.textContent.trim()

        if (isEmptyItem) {
          // Tenta fazer liftListItem
          const liftResult = editor.chain().liftListItem('listItem').run()
          if (liftResult) return true

          // Se nao conseguiu lift (ja no nivel mais externo), converte em paragrafo
          return editor.chain().clearNodes().run()
        }

        return false
      },
      Backspace: ({ editor }) => {
        const { state } = editor
        const { selection } = state
        const { $from } = selection

        // So intercepta se cursor esta no inicio do item
        if ($from.parentOffset !== 0) return false

        const listItem = $from.node(-1)
        if (!listItem || (listItem.type.name !== 'listItem' && listItem.type.name !== 'taskItem')) {
          return false
        }

        // Se o item esta vazio, sai da lista
        const isEmptyItem = listItem.content.size <= 2 && !listItem.textContent.trim()
        if (isEmptyItem) {
          const liftResult = editor.chain().liftListItem('listItem').run()
          if (liftResult) return true
          return editor.chain().clearNodes().run()
        }

        return false
      },
    }
  },
})
