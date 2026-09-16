import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Rows,
  Columns,
  Trash2,
  Plus,
  Minus,
  Split,
  Merge,
  Heading,
  Copy,
  Check,
  Lock,
  Percent,
  Hash
} from 'lucide-react'

interface TableFloatingMenuProps {
  editor: Editor | null
}

export const TableFloatingMenu: React.FC<TableFloatingMenuProps> = ({ editor }) => {
  const [copied, setCopied] = useState(false)

  if (!editor || !editor.isEditable || !editor.isActive('table')) {
    return null
  }

  const handleCopyTable = () => {
    // Tenta obter o texto formatado da tabela
    const selection = editor.state.selection
    const node = selection.$from.node(-1) // Table node
    if (node && node.type.name === 'table') {
      let mdTable = ''
      node.forEach((row, _offset, index) => {
        const cells: string[] = []
        row.forEach(cell => {
          cells.push(cell.textContent.trim())
        })
        mdTable += `| ${cells.join(' | ')} |\n`
        if (index === 0) {
          mdTable += `| ${cells.map(() => '---').join(' | ')} |\n`
        }
      })
      navigator.clipboard.writeText(mdTable)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <div
      style={{
        background: 'var(--color-surface, #1e1e2e)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text)',
      }}
      className="flex items-center gap-1 p-1.5 border shadow-2xl rounded-xl text-xs select-none z-40 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-lg"
    >
      {/* LINHAS: Adicionar / Remover */}
      <div className="flex items-center gap-0.5 border-r border-neutral-700/30 pr-1.5 mr-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().addRowBefore().run()}
          title="Adicionar linha acima"
          className="p-1.5 hover:bg-white/[0.08] rounded-md transition-colors flex items-center gap-1 font-medium text-blue-400"
        >
          <Rows className="w-3.5 h-3.5" />
          <Plus className="w-2.5 h-2.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          title="Adicionar linha abaixo"
          className="p-1.5 hover:bg-white/[0.08] rounded-md transition-colors flex items-center gap-1 font-medium text-blue-400"
        >
          <Rows className="w-3.5 h-3.5" />
          <span className="text-[10px]">+Linha</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().deleteRow().run()}
          title="Excluir linha atual"
          className="p-1.5 hover:bg-rose-500/15 text-rose-400 rounded-md transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
      </div>

      {/* COLUNAS: Adicionar / Remover */}
      <div className="flex items-center gap-0.5 border-r border-neutral-700/30 pr-1.5 mr-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          title="Adicionar coluna à direita"
          className="p-1.5 hover:bg-white/[0.08] rounded-md transition-colors flex items-center gap-1 font-medium text-purple-400"
        >
          <Columns className="w-3.5 h-3.5" />
          <span className="text-[10px]">+Coluna</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().deleteColumn().run()}
          title="Excluir coluna atual"
          className="p-1.5 hover:bg-rose-500/15 text-rose-400 rounded-md transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
      </div>

      {/* INSERÇÃO DE TIPOS DE CAMPOS RÁPIDOS NA CÉLULA */}
      <div className="flex items-center gap-0.5 border-r border-neutral-700/30 pr-1.5 mr-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().insertContent({ type: 'passwordBlock', attrs: { text: '' } }).run()}
          title="Inserir Campo Senha / Mascarado (****)"
          className="p-1.5 hover:bg-amber-500/15 text-amber-400 rounded-md transition-colors flex items-center gap-1"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="text-[10px] font-semibold">Senha</span>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().insertContent('0.00%').run()}
          title="Inserir Porcentagem (%)"
          className="p-1.5 hover:bg-white/[0.08] text-emerald-400 rounded-md transition-colors"
        >
          <Percent className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().insertContent('123').run()}
          title="Inserir Número / Inteiro"
          className="p-1.5 hover:bg-white/[0.08] text-cyan-400 rounded-md transition-colors"
        >
          <Hash className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* FORMATAÇÃO / MESCLAGEM */}
      <div className="flex items-center gap-0.5 border-r border-neutral-700/30 pr-1.5 mr-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
          title="Alternar cabeçalho"
          className="p-1.5 hover:bg-white/[0.08] rounded-md transition-colors opacity-80 hover:opacity-100"
        >
          <Heading className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().mergeCells().run()}
          title="Mesclar células"
          className="p-1.5 hover:bg-white/[0.08] rounded-md transition-colors opacity-80 hover:opacity-100"
        >
          <Merge className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().splitCell().run()}
          title="Dividir célula"
          className="p-1.5 hover:bg-white/[0.08] rounded-md transition-colors opacity-80 hover:opacity-100"
        >
          <Split className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 1-CLICK COPIAR TABELA */}
      <button
        type="button"
        onClick={handleCopyTable}
        title="Copiar tabela inteira para a área de transferência"
        className="p-1.5 hover:bg-white/[0.08] rounded-md transition-colors flex items-center gap-1 text-[11px] font-medium"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 font-bold">Copiado!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 text-neutral-300" />
            <span>Copiar</span>
          </>
        )}
      </button>

      {/* EXCLUIR TABELA */}
      <button
        type="button"
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="Excluir tabela inteira"
        className="p-1.5 hover:bg-rose-500/15 text-rose-500 rounded-md transition-colors ml-0.5"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
