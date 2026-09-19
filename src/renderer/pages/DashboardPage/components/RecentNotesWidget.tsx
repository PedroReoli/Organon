import React from 'react'
import type { Note } from '@types'
import { NotePencil, FileText, ArrowRight, Clock, Star, PushPin, Plus } from '@phosphor-icons/react'

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
              <NotePencil size={18} weight="duotone" />
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
            <ArrowRight size={12} weight="bold" />
          </button>
        </div>

        <div className="space-y-1.5">
          {recent.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)' }} className="py-6 text-center text-xs">
              <NotePencil size={20} weight="duotone" className="mx-auto mb-1 opacity-40" />
              Nenhuma nota encontrada.
            </div>
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
                      className="group-hover:text-[var(--color-primary)] transition-colors shrink-0"
                      size={14}
                      weight="duotone"
                    />
                    <span
                      style={{ color: 'var(--color-text)' }}
                      className="text-xs font-medium truncate group-hover:text-[var(--color-primary)]"
                    >
                      {note.title || 'Sem título'}
                    </span>
                  </div>

                  <div style={{ color: 'var(--color-text-muted)' }} className="flex items-center gap-2 shrink-0 ml-2 text-[10px]">
                    {note.isPinned && <PushPin size={11} weight="fill" className="text-amber-500" />}
                    {note.isFavorite && <Star size={11} weight="fill" className="text-amber-500" />}
                    <span className="flex items-center gap-0.5">
                      <Clock size={11} weight="duotone" />
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
        <button
          type="button"
          style={{ color: 'var(--color-primary)' }}
          className="cursor-pointer font-medium hover:underline flex items-center gap-1"
          onClick={onNavigateToNotes}
        >
          <Plus size={11} weight="bold" />
          <span>Criar Nova Nota</span>
        </button>
      </div>
    </div>
  )
}
