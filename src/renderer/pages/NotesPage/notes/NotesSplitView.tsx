import React, { useState } from 'react'
import type { Note } from '@types'
import { WysiwygEditor } from '../editor/WysiwygEditor'
import { Columns2, X, FileText } from 'lucide-react'

interface NotesSplitViewProps {
  primaryNote: Note
  primaryContent: string
  onPrimaryContentChange: (noteId: string, html: string) => void
  notes: Note[]
  onClose: () => void
}

export const NotesSplitView: React.FC<NotesSplitViewProps> = ({
  primaryNote,
  primaryContent,
  onPrimaryContentChange,
  notes,
  onClose
}) => {
  const [secondaryNoteId, setSecondaryNoteId] = useState<string>(
    notes.find(n => n.id !== primaryNote.id)?.id || primaryNote.id
  )

  const secondaryNote = notes.find(n => n.id === secondaryNoteId) || primaryNote

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-xs">
        <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-medium">
          <Columns2 className="w-4 h-4 text-blue-500" />
          <span>Modo Dividido (Split View)</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 px-2 py-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          <span>Fechar Divisão</span>
        </button>
      </div>

      <div className="flex-1 grid grid-cols-2 divide-x divide-zinc-200 dark:divide-zinc-800 overflow-hidden">
        {/* Left Pane (Primary Note) */}
        <div className="flex flex-col h-full overflow-hidden p-4">
          <div className="font-semibold text-sm text-zinc-800 dark:text-zinc-200 mb-2 truncate">
            {primaryNote.title || 'Nota Principal'}
          </div>
          <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <WysiwygEditor
              content={primaryContent}
              onChange={html => onPrimaryContentChange(primaryNote.id, html)}
              mode="full"
              placeholder="Edite a nota principal..."
            />
          </div>
        </div>

        {/* Right Pane (Secondary Note) */}
        <div className="flex flex-col h-full overflow-hidden p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              <select
                value={secondaryNoteId}
                onChange={e => setSecondaryNoteId(e.target.value)}
                className="text-xs font-medium bg-transparent border-b border-zinc-300 dark:border-zinc-700 focus:outline-hidden text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                {notes.map(n => (
                  <option key={n.id} value={n.id} className="bg-white dark:bg-zinc-900">
                    {n.title || 'Sem Título'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="text-xs text-zinc-500 mb-2 select-none">
              Referência / Leitura da segunda nota
            </div>
            <div className="prose prose-invert max-w-none text-sm text-zinc-700 dark:text-zinc-300">
              <p className="font-medium text-base mb-2">{secondaryNote.title}</p>
              <div className="text-xs text-zinc-400">
                Última atualização: {new Date(secondaryNote.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
