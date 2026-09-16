import React from 'react'
import type { Editor } from '@tiptap/react'
import {
  Rows,
  Columns,
  Trash2,
  Plus,
  Minus,
  Split,
  Merge,
  Heading
} from 'lucide-react'

interface TableFloatingMenuProps {
  editor: Editor | null
}

export const TableFloatingMenu: React.FC<TableFloatingMenuProps> = ({ editor }) => {
  if (!editor || !editor.isEditable || !editor.isActive('table')) {
    return null
  }

  return (
    <div className="flex items-center gap-0.5 p-1 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-lg text-zinc-700 dark:text-zinc-300 text-xs select-none z-30 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center gap-0.5 border-r border-zinc-200 dark:border-zinc-800 pr-1 mr-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().addRowBefore().run()}
          title="Adicionar linha acima"
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
        >
          <div className="flex items-center gap-0.5">
            <Rows className="w-3.5 h-3.5 text-blue-500" />
            <Plus className="w-2.5 h-2.5 text-blue-500" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          title="Adicionar linha abaixo"
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
        >
          <div className="flex items-center gap-0.5">
            <Rows className="w-3.5 h-3.5 text-blue-500" />
            <Plus className="w-2.5 h-2.5 text-blue-500" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().deleteRow().run()}
          title="Excluir linha atual"
          className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-500 rounded transition-colors"
        >
          <div className="flex items-center gap-0.5">
            <Rows className="w-3.5 h-3.5" />
            <Minus className="w-2.5 h-2.5" />
          </div>
        </button>
      </div>

      <div className="flex items-center gap-0.5 border-r border-zinc-200 dark:border-zinc-800 pr-1 mr-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().addColumnBefore().run()}
          title="Adicionar coluna à esquerda"
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
        >
          <div className="flex items-center gap-0.5">
            <Columns className="w-3.5 h-3.5 text-purple-500" />
            <Plus className="w-2.5 h-2.5 text-purple-500" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          title="Adicionar coluna à direita"
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
        >
          <div className="flex items-center gap-0.5">
            <Columns className="w-3.5 h-3.5 text-purple-500" />
            <Plus className="w-2.5 h-2.5 text-purple-500" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().deleteColumn().run()}
          title="Excluir coluna atual"
          className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-500 rounded transition-colors"
        >
          <div className="flex items-center gap-0.5">
            <Columns className="w-3.5 h-3.5" />
            <Minus className="w-2.5 h-2.5" />
          </div>
        </button>
      </div>

      <div className="flex items-center gap-0.5 border-r border-zinc-200 dark:border-zinc-800 pr-1 mr-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          title="Alternar linha de cabeçalho"
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-600 dark:text-zinc-400"
        >
          <Heading className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().mergeCells().run()}
          title="Mesclar células selecionadas"
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-600 dark:text-zinc-400"
        >
          <Merge className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().splitCell().run()}
          title="Dividir célula"
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-600 dark:text-zinc-400"
        >
          <Split className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="Excluir tabela inteira"
        className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-500 rounded transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
