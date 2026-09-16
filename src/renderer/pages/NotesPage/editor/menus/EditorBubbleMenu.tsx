import React from 'react'
import { BubbleMenu } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Highlighter,
  Sparkles,
  ListTodo,
  Info
} from 'lucide-react'

interface EditorBubbleMenuProps {
  editor: Editor | null
  onOpenAiMenu?: () => void
}

export const EditorBubbleMenu: React.FC<EditorBubbleMenuProps> = ({ editor, onOpenAiMenu }) => {
  if (!editor) return null

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100, placement: 'top-start' }}
      shouldShow={({ state, from, to }) => {
        const { doc, selection } = state
        const { empty } = selection
        // Don't show on empty selection or if inside image / node view with its own controls
        if (empty || from === to || editor.isActive('table')) return false
        const text = doc.textBetween(from, to).trim()
        return text.length > 0
      }}
      className="flex items-center gap-0.5 p-1 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-lg text-zinc-700 dark:text-zinc-300 text-xs z-40 select-none animate-in fade-in zoom-in-95"
    >
      {onOpenAiMenu && (
        <button
          type="button"
          onClick={onOpenAiMenu}
          title="Assistente IA (Ctrl+J)"
          className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 text-indigo-600 dark:text-indigo-400 font-semibold rounded transition-colors mr-1 border border-indigo-500/20"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>IA</span>
        </button>
      )}

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Negrito (Ctrl+B)"
        className={`p-1.5 rounded transition-colors ${editor.isActive('bold') ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
      >
        <Bold className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Itálico (Ctrl+I)"
        className={`p-1.5 rounded transition-colors ${editor.isActive('italic') ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
      >
        <Italic className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Tachado"
        className={`p-1.5 rounded transition-colors ${editor.isActive('strike') ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Código Inline"
        className={`p-1.5 rounded transition-colors ${editor.isActive('code') ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
      >
        <Code className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="Realçar / Destaque"
        className={`p-1.5 rounded transition-colors ${editor.isActive('highlight') ? 'bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
      >
        <Highlighter className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Lista de Tarefas"
        className={`p-1.5 rounded transition-colors ${editor.isActive('taskList') ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
      >
        <ListTodo className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => (editor.chain().focus() as any).toggleCallout({ type: 'note' }).run()}
        title="Converter em Callout"
        className={`p-1.5 rounded transition-colors ${editor.isActive('callout') ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
    </BubbleMenu>
  )
}
