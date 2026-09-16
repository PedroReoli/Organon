import React, { useState } from 'react'
import {
  X,
  FileCode,
  FileText,
  Sparkles,
  Printer,
  Download,
  Check,
  Copy
} from 'lucide-react'
import { copyTextToClipboard } from '@utils'

interface NoteExportModalProps {
  isOpen: boolean
  onClose: () => void
  noteTitle: string
  noteContent: string
}

export const NoteExportModal: React.FC<NoteExportModalProps> = ({
  isOpen,
  onClose,
  noteTitle,
  noteContent
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null)

  if (!isOpen) return null

  const getCleanMarkdown = () => {
    const text = noteContent
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    return `# ${noteTitle || 'Sem Título'}\n\n${text}`
  }

  const getPlainText = () => {
    return noteContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }

  const getAiPrompt = () => {
    return `### CONTEXTO DA NOTA: "${noteTitle}"\n\n${getCleanMarkdown()}\n\n---\n**INSTRUÇÃO:** Analise o conteúdo acima e forneça um resumo executivo com os próximos passos acionáveis.`
  }

  const handleCopy = async (type: string, content: string) => {
    const success = await copyTextToClipboard(content)
    if (success) {
      setCopiedType(type)
      setTimeout(() => setCopiedType(null), 1800)
    }
  }

  const handleDownloadMd = () => {
    const md = getCleanMarkdown()
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(noteTitle || 'nota').toLowerCase().replace(/[^a-z0-9_-]/gi, '_')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrintPdf = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              Exportar & Copiar Nota
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Formatos de Cópia Rápida
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleCopy('md', getCleanMarkdown())}
                className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 hover:border-blue-500/50 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 rounded-lg text-left transition-all group text-xs"
              >
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">Markdown</span>
                </div>
                {copiedType === 'md' ? (
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCopy('text', getPlainText())}
                className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 rounded-lg text-left transition-all group text-xs"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">Texto Limpo</span>
                </div>
                {copiedType === 'text' ? (
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCopy('ai', getAiPrompt())}
                className="flex items-center justify-between p-3 border border-indigo-200 dark:border-indigo-900/50 hover:border-indigo-500/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 rounded-lg text-left transition-all group text-xs"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">Prompt IA</span>
                </div>
                {copiedType === 'ai' ? (
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-600 shrink-0" />
                )}
              </button>
            </div>
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-2">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Exportar Arquivos
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadMd}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium rounded-lg transition-colors text-xs"
              >
                <Download className="w-4 h-4" />
                <span>Salvar Arquivo .md</span>
              </button>

              <button
                type="button"
                onClick={handlePrintPdf}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-xs shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Salvar PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
