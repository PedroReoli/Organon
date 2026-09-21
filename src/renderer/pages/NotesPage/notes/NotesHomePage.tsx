import React, { useMemo } from 'react'
import {
  FolderTree,
  FileText,
  Star,
  Clock,
  Search,
  Folder,
  Plus,
  Trash2,
  Pin,
  Lock,
  ArrowUpRight,
  BookOpen,
} from 'lucide-react'
import type { Note, NoteFolder } from '@types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface NotesHomePageProps {
  notes: Note[]
  folders: NoteFolder[]
  recentNoteIds: string[]
  onOpenNote: (id: string) => void
  onOpenFolder: (id: string) => void
  onAddNote: () => void
  onShowSearch: () => void
  onOpenTrash?: () => void
  trashCount?: number
  onOpenTreeManager?: () => void
}

function fmtRelative(iso: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  const hr = Math.floor(diff / 3600000)
  const day = Math.floor(diff / 86400000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}m`
  if (hr < 24) return `${hr}h`
  if (day < 7) return `${day}d`
  if (day < 30) return `${Math.floor(day / 7)}sem`
  return `${Math.floor(day / 30)}mês`
}

export const NotesHomePage: React.FC<NotesHomePageProps> = ({
  notes,
  folders,
  recentNoteIds,
  onOpenNote,
  onOpenFolder,
  onAddNote,
  onShowSearch,
  onOpenTrash,
  trashCount = 0,
  onOpenTreeManager,
}) => {
  const noteMap = useMemo(() => new Map(notes.map(n => [n.id, n])), [notes])

  const recentNotes = useMemo(
    () => recentNoteIds.map(id => noteMap.get(id)).filter(Boolean) as Note[],
    [recentNoteIds, noteMap],
  )

  const favorites = useMemo(
    () => notes.filter(n => n.isFavorite).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 6),
    [notes],
  )

  const stats = useMemo(() => ({
    total: notes.length,
    folders: folders.length,
    favorites: notes.filter(n => n.isFavorite).length,
    pinned: notes.filter(n => n.isPinned).length,
    locked: notes.filter(n => n.isLocked).length,
  }), [notes, folders])

  const chartData = useMemo(() => {
    const sortedFolders = folders.map(f => ({
      name: f.name,
      count: notes.filter(n => n.folderId === f.id).length
    })).sort((a, b) => b.count - a.count).slice(0, 5)

    if (sortedFolders.length === 0) {
      return [{ name: 'Sem pasta', count: notes.filter(n => !n.folderId).length }]
    }
    return sortedFolders
  }, [notes, folders])

  return (
    <div
      style={{
        background: 'var(--color-background)',
        color: 'var(--color-text)',
      }}
      className="w-full h-full overflow-y-auto p-4 sm:p-6 space-y-4"
    >
      {/* ========================================================
          HERO BANNER & AÇÕES SUPERIORES
          ======================================================== */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border shadow-xs"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 14%, transparent)',
                color: 'var(--color-primary)',
                borderColor: 'color-mix(in srgb, var(--color-primary) 28%, transparent)',
              }}
              className="text-xs font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1.5"
            >
              <BookOpen className="w-3 h-3" />
              Base de Conhecimento
            </span>
            <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-medium">
              {stats.total} notas • {stats.folders} pastas
            </span>
          </div>
          <h1
            style={{ color: 'var(--color-text)' }}
            className="text-lg sm:text-xl font-extrabold tracking-tight"
          >
            Hub Geral de Notas & Documentação
          </h1>
        </div>

        {/* Barra de Ações Rápidas */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenTreeManager && (
            <button
              type="button"
              onClick={onOpenTreeManager}
              style={{
                borderColor: 'var(--color-border)',
                background: 'color-mix(in srgb, var(--color-background) 60%, var(--color-surface))',
                color: 'var(--color-text)',
              }}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all cursor-pointer"
              title="Gerenciar estrutura de pastas e notas"
            >
              <FolderTree className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              <span>Gerenciar Pastas</span>
            </button>
          )}

          {onOpenTrash && (
            <button
              type="button"
              onClick={onOpenTrash}
              style={{
                borderColor: trashCount > 0 ? 'rgba(244, 63, 94, 0.3)' : 'var(--color-border)',
                background: trashCount > 0 ? 'rgba(244, 63, 94, 0.08)' : 'color-mix(in srgb, var(--color-background) 60%, var(--color-surface))',
                color: trashCount > 0 ? '#f43f5e' : 'var(--color-text-muted)',
              }}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 hover:brightness-110 transition-all cursor-pointer"
              title="Abrir Lixeira de Notas"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Lixeira {trashCount > 0 ? `(${trashCount})` : ''}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onAddNote}
            style={{
              background: 'var(--color-primary)',
              color: 'var(--color-primary-text, #ffffff)',
              boxShadow: '0 2px 8px color-mix(in srgb, var(--color-primary) 35%, transparent)',
            }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:brightness-110 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nova Nota</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          BENTO GRID DE ESTATÍSTICAS E ATALHOS (3 COLUNAS)
          ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Recentes */}
        <div
          onClick={onShowSearch}
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
          className="group relative border p-3.5 rounded-xl shadow-xs hover:border-[var(--color-primary)] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-semibold">Acessadas Recentemente</span>
            <div
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                color: 'var(--color-primary)',
              }}
              className="p-1.5 rounded-lg"
            >
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span style={{ color: 'var(--color-text)' }} className="text-2xl font-black">
              {recentNotes.length}
            </span>
            <span style={{ color: 'var(--color-primary)' }} className="text-xs font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Ver Histórico <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Favoritas */}
        <div
          onClick={onShowSearch}
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
          className="group relative border p-3.5 rounded-xl shadow-xs hover:border-amber-500/50 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-semibold">Notas Favoritas</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span style={{ color: 'var(--color-text)' }} className="text-2xl font-black">
              {stats.favorites}
            </span>
            <span className="text-xs font-semibold text-amber-500 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Filtrar Favoritas <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Busca e Exploração */}
        <div
          onClick={onShowSearch}
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
          className="group relative border p-3.5 rounded-xl shadow-xs hover:border-[var(--color-primary)] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-semibold">Pesquisa & Filtros</span>
            <div
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                color: 'var(--color-primary)',
              }}
              className="p-1.5 rounded-lg"
            >
              <Search className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span style={{ color: 'var(--color-text)' }} className="text-2xl font-black">
              {stats.total} <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-normal">docs</span>
            </span>
            <span style={{ color: 'var(--color-primary)' }} className="text-xs font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              Buscar Notas ⌘K <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          CONTEÚDO PRINCIPAL EM 2 COLUNAS
          ======================================================== */}
      {notes.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* Coluna Esquerda: Favoritas & Lista de Notas (8 Colunas) */}
          <div className="lg:col-span-8 space-y-3.5">
            {/* Favoritas em Grade */}
            {favorites.length > 0 && (
              <div
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
                className="p-4 rounded-xl border shadow-xs"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold uppercase tracking-wider">
                    Notas em Destaque
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {favorites.map(note => {
                    const folder = folders.find(f => f.id === note.folderId)
                    return (
                      <div
                        key={note.id}
                        onClick={() => onOpenNote(note.id)}
                        style={{
                          background: 'color-mix(in srgb, var(--color-background) 70%, var(--color-surface))',
                          borderColor: 'var(--color-border)',
                        }}
                        className="p-3 rounded-lg border hover:border-amber-500/50 transition-all cursor-pointer flex flex-col justify-between gap-2 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            style={{ color: 'var(--color-text)' }}
                            className="text-xs font-bold truncate group-hover:text-amber-400 transition-colors"
                          >
                            {note.title || 'Sem título'}
                          </span>
                          <span style={{ color: 'var(--color-text-muted)' }} className="text-[10px] shrink-0 font-medium">
                            {fmtRelative(note.updatedAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px]">
                          {folder && (
                            <span
                              style={{
                                background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                                color: 'var(--color-primary)',
                              }}
                              className="px-1.5 py-0.5 rounded font-semibold truncate max-w-[120px]"
                            >
                              📁 {folder.name}
                            </span>
                          )}
                          {note.isPinned && (
                            <span className="text-emerald-400 flex items-center gap-0.5">
                              <Pin className="w-2.5 h-2.5" /> Fixada
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Minhas Notas (Lista Principal) */}
            <div
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
              className="p-4 rounded-xl border shadow-xs"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--color-primary)]" />
                  <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold uppercase tracking-wider">
                    Todas as Notas Recentes
                  </h3>
                </div>
                <span style={{ color: 'var(--color-text-muted)' }} className="text-xs font-medium">
                  {notes.length} documentos
                </span>
              </div>

              <div className="space-y-1.5">
                {notes.slice(0, 10).map(note => {
                  const folder = folders.find(f => f.id === note.folderId)
                  return (
                    <div
                      key={note.id}
                      onClick={() => onOpenNote(note.id)}
                      style={{
                        background: 'color-mix(in srgb, var(--color-background) 60%, var(--color-surface))',
                        borderColor: 'var(--color-border)',
                      }}
                      className="p-2.5 rounded-lg border hover:border-[var(--color-primary)] transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors shrink-0" />
                        <span
                          style={{ color: 'var(--color-text)' }}
                          className="text-xs font-semibold truncate group-hover:text-[var(--color-primary)] transition-colors"
                        >
                          {note.title || 'Sem título'}
                        </span>
                        {folder && (
                          <span
                            style={{
                              background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                              color: 'var(--color-primary)',
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                          >
                            {folder.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] shrink-0" style={{ color: 'var(--color-text-muted)' }}>
                        {note.isPinned && <Pin className="w-3 h-3 text-emerald-400" />}
                        {note.isLocked && <Lock className="w-3 h-3 text-rose-400" />}
                        {note.isFavorite && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                        <span>{fmtRelative(note.updatedAt)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Coluna Direita: Distribuição & Pastas (4 Colunas) */}
          <div className="lg:col-span-4 space-y-3.5">
            {/* Gráfico de Distribuição */}
            {chartData.length > 0 && (
              <div
                style={{
                  background: 'var(--color-surface)',
                  borderColor: 'var(--color-border)',
                }}
                className="p-4 rounded-xl border shadow-xs"
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <Folder className="w-4 h-4 text-[var(--color-primary)]" />
                  <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold uppercase tracking-wider">
                    Volume por Pasta
                  </h3>
                </div>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={176}>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
                      <XAxis
                        dataKey="name"
                        stroke="var(--color-text-muted)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val: string) => (val && val.length > 8 ? `${val.slice(0, 8)}…` : val || '')}
                      />
                      <YAxis stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--color-surface)',
                          borderColor: 'var(--color-border)',
                          borderRadius: '8px',
                          color: 'var(--color-text)',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={24}>
                        {chartData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--color-primary)' : 'color-mix(in srgb, var(--color-primary) 60%, white)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Pastas em Destaque */}
            <div
              style={{
                background: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
              className="p-4 rounded-xl border shadow-xs"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-[var(--color-primary)]" />
                  <h3 style={{ color: 'var(--color-text)' }} className="text-xs font-bold uppercase tracking-wider">
                    Pastas Ativas
                  </h3>
                </div>
                <span style={{ color: 'var(--color-text-muted)' }} className="text-[11px]">
                  {folders.length} totais
                </span>
              </div>

              <div className="space-y-1.5">
                {folders.length === 0 ? (
                  <div style={{ color: 'var(--color-text-muted)' }} className="py-4 text-center text-xs">
                    Nenhuma pasta criada.
                  </div>
                ) : (
                  folders.filter(f => !f.parentId).slice(0, 6).map(folder => {
                    const count = notes.filter(n => n.folderId === folder.id).length
                    return (
                      <div
                        key={folder.id}
                        onClick={() => onOpenFolder(folder.id)}
                        style={{
                          background: 'color-mix(in srgb, var(--color-background) 60%, var(--color-surface))',
                          borderColor: 'var(--color-border)',
                        }}
                        className="p-2 rounded-lg border hover:border-[var(--color-primary)] transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Folder className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                          <span style={{ color: 'var(--color-text)' }} className="text-xs font-medium truncate group-hover:text-[var(--color-primary)] transition-colors">
                            {folder.name || 'Sem nome'}
                          </span>
                        </div>
                        <span
                          style={{
                            background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                            color: 'var(--color-primary)',
                          }}
                          className="text-[10px] font-bold px-1.5 py-0.2 rounded"
                        >
                          {count}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
          className="p-12 rounded-xl border text-center flex flex-col items-center justify-center space-y-4"
        >
          <div
            style={{
              background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
              color: 'var(--color-primary)',
            }}
            className="p-4 rounded-full"
          >
            <FileText className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 style={{ color: 'var(--color-text)' }} className="text-base font-bold">
              Seu Caderno de Notas Está Vazio
            </h3>
            <p style={{ color: 'var(--color-text-muted)' }} className="text-xs">
              Crie notas em Markdown com suporte a tags, links bidirecionais e visualizador de grafo.
            </p>
          </div>
          <button
            type="button"
            onClick={onAddNote}
            style={{
              background: 'var(--color-primary)',
              color: 'var(--color-primary-text, #ffffff)',
            }}
            className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:brightness-110"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Primeira Nota</span>
          </button>
        </div>
      )}
    </div>
  )
}
