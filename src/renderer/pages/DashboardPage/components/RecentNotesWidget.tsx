import React from 'react'
import type { Note } from '@types'
import { FileText, ArrowRight, Clock, Star, Pin } from 'lucide-react'

interface RecentNotesWidgetProps {
  notes: Note[]
  onOpenNote: (noteId: string) => void
  onNavigateToNotes: () => void
}

export const RecentNotesWidget: React.FC<RecentNotesWidgetProps> = ({
  notes,
  onOpenNote,
  onNavigateToNotes
}) => {
  const recent = [...notes]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 4)

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
      className="border p-4 rounded-xl shadow-xs flex flex-col justify-between h-full"
    >
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                color: 'var(--color-primary)',
              }}
              className="p-1.5 rounded-lg"
            >
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold">Notas Recentes</h3>
              <p style={{ color: 'var(--color-text-muted)' }} className="text-[11px]">Últimos documentos editados</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToNotes}
            style={{ color: 'var(--color-primary)' }}
            className="text-xs font-medium flex items-center gap-0.5 hover:opacity-80 transition-opacity"
          >
            <span>Ver Todas</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-1.5">
          {recent.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)' }} className="py-6 text-center text-xs">Nenhuma nota encontrada.</div>
          ) : (
            recent.map(note => {
              const formattedDate = new Date(note.updatedAt || note.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short'
              })

              return (
                <div
                  key={note.id}
                  onClick={() => onOpenNote(note.id)}
                  style={{
                    background: 'color-mix(in srgb, var(--color-background) 60%, var(--color-surface))',
                    borderColor: 'var(--color-border)',
                  }}
                  className="flex items-center justify-between p-2 rounded-lg border hover:border-[var(--color-primary)] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText
                      style={{ color: 'var(--color-text-muted)' }}
                      className="w-3.5 h-3.5 group-hover:text-[var(--color-primary)] transition-colors shrink-0"
                    />
                    <span
                      style={{ color: 'var(--color-text)' }}
                      className="text-xs font-medium truncate group-hover:text-[var(--color-primary)]"
                    >
                      {note.title || 'Sem título'}
                    </span>
                  </div>

                  <div style={{ color: 'var(--color-text-muted)' }} className="flex items-center gap-2 shrink-0 ml-2 text-[10px]">
                    {note.isPinned && <Pin className="w-2.5 h-2.5 text-amber-500" />}
                    {note.isFavorite && <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />}
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {formattedDate}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <div
        style={{
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-muted)',
        }}
        className="pt-2 border-t mt-2 text-[11px] flex items-center justify-between"
      >
        <span>{notes.length} documentos totais</span>
        <span
          style={{ color: 'var(--color-primary)' }}
          className="cursor-pointer font-medium hover:underline"
          onClick={onNavigateToNotes}
        >
          Criar Nova Nota
        </span>
      </div>
    </div>
  )
}
