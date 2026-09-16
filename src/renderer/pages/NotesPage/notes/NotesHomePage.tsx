import React, { useMemo } from 'react'
import type { Note, NoteFolder } from '@types'
import { Button } from '@shared/components/primitives'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface NotesHomePageProps {
  notes:          Note[]
  folders:        NoteFolder[]
  recentNoteIds:  string[]
  onOpenNote:     (id: string) => void
  onOpenFolder:   (id: string) => void
  onAddNote:      () => void
  onShowSearch:   () => void
  onOpenTrash?:   () => void
  trashCount?:    number
  onOpenTreeManager?: () => void
}

// ── Ícones inline ─────────────────────────────────────────────────────────────

const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)
const IconStar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)
const IconPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z" />
  </svg>
)
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const IconFolder = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)
const IconPage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
)
const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRelative(iso: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  const hr   = Math.floor(diff / 3600000)
  const day  = Math.floor(diff / 86400000)
  if (min < 1)   return 'agora'
  if (min < 60)  return `${min}min`
  if (hr < 24)   return `${hr}h`
  if (day < 7)   return `${day}d`
  if (day < 30)  return `${Math.floor(day / 7)}sem`
  return `${Math.floor(day / 30)}mês`
}

// ── Componente ────────────────────────────────────────────────────────────────

export const NotesHomePage = ({
  notes, folders, recentNoteIds,
  onOpenNote, onOpenFolder, onAddNote, onShowSearch, onOpenTrash, trashCount = 0, onOpenTreeManager,
}: NotesHomePageProps) => {
  const noteMap = useMemo(() => new Map(notes.map(n => [n.id, n])), [notes])

  const recentNotes = useMemo(
    () => recentNoteIds.map(id => noteMap.get(id)).filter(Boolean) as Note[],
    [recentNoteIds, noteMap],
  )

  const favorites = useMemo(
    () => notes.filter(n => n.isFavorite).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6),
    [notes],
  )

  const pinned = useMemo(
    () => notes.filter(n => n.isPinned && !n.isFavorite).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6),
    [notes],
  )

  const stats = useMemo(() => ({
    total:     notes.length,
    folders:   folders.length,
    favorites: notes.filter(n => n.isFavorite).length,
    pinned:    notes.filter(n => n.isPinned).length,
    locked:    notes.filter(n => n.isLocked).length,
  }), [notes, folders])

  const hubs = [
    {
      id: 'recents',
      label: 'Recentes',
      sublabel: `${recentNotes.length} acessadas`,
      icon: <IconClock />,
      color: 'var(--color-primary)',
      onClick: onShowSearch,
    },
    {
      id: 'favorites',
      label: 'Favoritas',
      sublabel: `${stats.favorites} notas`,
      icon: <IconStar />,
      color: '#f59e0b',
      onClick: onShowSearch,
    },
    {
      id: 'search',
      label: 'Buscar',
      sublabel: 'Pesquisar notas',
      icon: <IconSearch />,
      color: 'var(--color-primary)',
      onClick: onShowSearch,
    },
  ]

  // Dados para o gráfico
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
    <div className="projects-content-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Visão Geral de Notas</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            {stats.total} nota{stats.total !== 1 ? 's' : ''} organizada{stats.total !== 1 ? 's' : ''} em {stats.folders} pasta{stats.folders !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onOpenTreeManager && (
            <button 
              className="projects-btn" 
              style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '8px 14px', borderRadius: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }} 
              onClick={onOpenTreeManager}
              title="Central de Gerenciamento da Estrutura de Notas"
            >
              <span>🌳 Gerenciar Estrutura</span>
            </button>
          )}
          {onOpenTrash && (
            <button 
              className="projects-btn" 
              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '8px 14px', borderRadius: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }} 
              onClick={onOpenTrash}
              title="Abrir lixeira"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" />
              </svg>
              Lixeira {trashCount !== undefined && trashCount > 0 ? `(${trashCount})` : ''}
            </button>
          )}
          <button 
            className="projects-btn" 
            style={{ background: 'var(--accent-primary, var(--color-primary))', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', boxShadow: '0 2px 8px var(--color-primary-glow)', cursor: 'pointer' }} 
            onClick={onAddNote}
          >
            <IconPlus /> Nova Nota
          </button>
        </div>
      </div>

      {/* Hubs / Atalhos Compactos em Grid 3 Colunas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {hubs.map(hub => {
          return (
            <div
              key={hub.id}
              className="projects-stat-card"
              style={{
                cursor: 'pointer',
                padding: '14px 16px',
                height: '88px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                position: 'relative',
                overflow: 'hidden',
              }}
              onClick={hub.onClick}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: hub.color, borderRadius: '4px 0 0 4px' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-text)', letterSpacing: '-0.01em' }}>{hub.label}</span>
                <div style={{ color: hub.color, background: `${hub.color}1e`, padding: '6px', borderRadius: '8px', display: 'flex', border: `1px solid ${hub.color}33` }}>
                  {React.cloneElement(hub.icon as React.ReactElement, { width: 15, height: 15 })}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, lineHeight: 1, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                  {hub.id === 'recents' ? recentNotes.length : hub.id === 'favorites' ? stats.favorites : hub.id === 'pinned' ? stats.pinned : ''}
                  {hub.id === 'search' && <span style={{ fontSize: '13px', color: hub.color, fontWeight: 600 }}>Explorar &rarr;</span>}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500 }}>{hub.sublabel}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Corpo principal em 2 colunas */}
      {notes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '16px' }}>
        
        {/* COLUNA ESQUERDA (Principal) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Favoritas */}
          {favorites.length > 0 && (
            <section className="projects-dashboard-card" style={{ borderRadius: '10px', padding: '14px 16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ color: '#f59e0b', display: 'flex' }}><IconStar /></div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>Notas Favoritas</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                {favorites.map(note => (
                  <div 
                    key={note.id} 
                    onClick={() => onOpenNote(note.id)} 
                    style={{ cursor: 'pointer', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px', transition: 'all 0.15s', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '8px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', padding: '4px', borderRadius: '4px', display: 'flex' }}><IconStar /></div>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 500 }}>{fmtRelative(note.updatedAt)}</span>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}>
                      {note.title || 'Sem título'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Minhas Notas (Lista Principal) */}
          <section className="projects-dashboard-card" style={{ borderRadius: '10px', padding: '14px 16px', background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ color: 'var(--color-primary)', display: 'flex' }}><IconPage /></div>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>Minhas Notas</h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{notes.length} notas</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {notes.slice(0, 10).map(note => {
                const folder = folders.find(f => f.id === note.folderId)
                return (
                  <div 
                    key={note.id} 
                    onClick={() => onOpenNote(note.id)} 
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--color-background)', border: '1px solid var(--color-border)', borderRadius: '6px', transition: 'all 0.15s' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--color-text-muted)', display: 'flex', flexShrink: 0 }}><IconPage /></div>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{note.title || 'Sem título'}</span>
                      {folder && <span style={{ fontSize: '10px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600, flexShrink: 0 }}>{folder.name}</span>}
                      {note.isPinned && <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', flexShrink: 0 }}>FIXADO</span>}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 500, flexShrink: 0, marginLeft: '12px' }}>{fmtRelative(note.updatedAt)}</span>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        {/* COLUNA DIREITA (Sidebar/Estatísticas) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Gráfico */}
          {notes.length > 0 && chartData.length > 0 && (
            <section className="projects-dashboard-card" style={{ borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ color: 'var(--color-primary)', display: 'flex' }}><IconFolder /></div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Distribuição por Pastas</h3>
              </div>
              <div style={{ height: '170px', width: '100%', minWidth: 0, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 24 }}>
                    <XAxis 
                      dataKey="name" 
                      stroke="var(--color-text-muted)" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val: string) => (val && val.length > 10 ? `${val.slice(0, 10)}…` : val || '')}
                    />
                    <YAxis stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text)', fontSize: '12px' }}
                      itemStyle={{ color: 'var(--color-primary)', fontWeight: 600 }}
                      cursor={{ fill: 'var(--color-surface)', opacity: 0.4 }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={28}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--color-primary)' : '#818cf8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Pastas em Destaque */}
          {folders.length > 0 && (
            <section className="projects-dashboard-card" style={{ borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ color: 'var(--color-primary)', display: 'flex' }}><IconFolder /></div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Pastas Principais</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {folders.filter(f => !f.parentId).slice(0, 6).map(folder => {
                  const count = notes.filter(n => n.folderId === folder.id).length
                  return (
                    <div 
                      key={folder.id} 
                      onClick={() => onOpenFolder(folder.id)} 
                      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-primary)', border: '1px solid transparent', borderRadius: '8px', transition: 'all 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-tertiary)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'var(--bg-primary)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <div style={{ color: 'var(--text-muted)', display: 'flex' }}><IconFolder /></div>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, fontSize: '12px', color: 'var(--text-primary)' }}>{folder.name || 'Sem nome'}</span>
                      </div>
                      <span style={{ fontSize: '10px', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

        </div>
      </div>
      )}

      {/* Estado vazio */}
      {notes.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '50%', marginBottom: '24px' }}>
            <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ opacity: 0.5 }}>
              <path d="M40 8H16a4 4 0 0 0-4 4v40a4 4 0 0 0 4 4h32a4 4 0 0 0 4-4V20L40 8z" />
              <polyline points="40 8 40 20 52 20" />
              <line x1="24" y1="32" x2="40" y2="32" />
              <line x1="24" y1="40" x2="34" y2="40" />
            </svg>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Seu espaço de anotações</h3>
          <p style={{ marginBottom: '32px', maxWidth: '300px', lineHeight: 1.5 }}>Comece criando sua primeira nota para organizar suas ideias, documentos e rascunhos.</p>
          <button 
            className="projects-btn" 
            style={{ background: 'var(--accent-primary, var(--color-primary))', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', boxShadow: '0 4px 12px var(--color-primary-glow)' }} 
            onClick={onAddNote}
          >
            <IconPlus /> Criar primeira nota
          </button>
        </div>
      )}

    </div>
  )
}
