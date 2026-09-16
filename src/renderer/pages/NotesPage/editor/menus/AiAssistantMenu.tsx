import React, { useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Sparkles,
  Table,
  CheckCheck,
  FileText,
  X,
  ArrowRight
} from 'lucide-react'

interface AiAssistantMenuProps {
  isOpen: boolean
  onClose: () => void
  editor: Editor | null
}

export const AiAssistantMenu: React.FC<AiAssistantMenuProps> = ({ isOpen, onClose, editor }) => {
  const [customPrompt, setCustomPrompt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen || !editor) return null

  const getSelectedText = () => {
    const { from, to } = editor.state.selection
    return editor.state.doc.textBetween(from, to, ' ')
  }

  const handleAction = async (actionType: string) => {
    const selectedText = getSelectedText()
    setIsProcessing(true)

    try {
      // Local smart transforms
      if (actionType === 'to-table') {
        const lines = selectedText.split(/\r?\n/).filter(l => l.trim().length > 0)
        let tableHtml = '<table><tbody>'
        if (lines.length > 0) {
          tableHtml += `<tr><th><p>Item</p></th><th><p>Detalhes</p></th></tr>`
          lines.forEach(line => {
            const cleanLine = line.replace(/^[-*•\d.)]\s*/, '')
            const parts = cleanLine.split(/[:-]\s*(.+)/)
            const col1 = parts[0] || cleanLine
            const col2 = parts[1] || '-'
            tableHtml += `<tr><td><p>${col1}</p></td><td><p>${col2}</p></td></tr>`
          })
        }
        tableHtml += '</tbody></table>'
        editor.chain().focus().insertContent(tableHtml).run()
        onClose()
        return
      }

      if (actionType === 'summarize') {
        const sentences = selectedText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5)
        const summary = sentences.slice(0, 3).map(s => `<li><p>${s}</p></li>`).join('')
        editor.chain().focus().insertContent(`<ul>${summary}</ul>`).run()
        onClose()
        return
      }

      if (actionType === 'callout') {
        (editor.chain().focus() as any).toggleCallout({ type: 'tip' }).run()
        onClose()
        return
      }

      if (customPrompt.trim()) {
        // Wrap as quote or highlight for now
        editor.chain().focus().toggleHighlight().run()
        onClose()
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>Assistente IA do Organon</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="O que você deseja fazer com o texto selecionado?"
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAction('custom')
              }}
              className="w-full pl-3 pr-9 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 dark:focus:ring-indigo-500/40"
            />
            <button
              type="button"
              onClick={() => handleAction('custom')}
              disabled={!customPrompt.trim()}
              className="absolute right-2 top-2 p-1 text-zinc-400 hover:text-indigo-500 disabled:opacity-40 transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Ações Rápidas
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleAction('to-table')}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-left transition-all text-xs"
            >
              <Table className="w-4 h-4 text-purple-500 shrink-0" />
              <div>
                <div className="font-medium text-zinc-800 dark:text-zinc-200">Gerar Tabela</div>
                <div className="text-[10px] text-zinc-500">Transformar lista em tabela</div>
              </div>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleAction('summarize')}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-left transition-all text-xs"
            >
              <FileText className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <div className="font-medium text-zinc-800 dark:text-zinc-200">Resumir</div>
                <div className="text-[10px] text-zinc-500">Extrair tópicos chave</div>
              </div>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleAction('callout')}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-left transition-all text-xs"
            >
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <div>
                <div className="font-medium text-zinc-800 dark:text-zinc-200">Bloco de Destaque</div>
                <div className="text-[10px] text-zinc-500">Converter em Callout</div>
              </div>
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleAction('improve')}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-left transition-all text-xs"
            >
              <CheckCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <div className="font-medium text-zinc-800 dark:text-zinc-200">Melhorar Tom</div>
                <div className="text-[10px] text-zinc-500">Clareza e gramática</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
