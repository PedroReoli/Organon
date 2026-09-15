import React, { useState, useMemo } from 'react'

export interface LibraryItem {
  id: string
  title: string
  category: 'document' | 'pdf' | 'receipt' | 'media' | 'project'
  filePath: string
  tags: string[]
  updatedAt: string
  fileSize?: string
}

const INITIAL_LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: 'lib-1',
    title: 'Especificação do Ecossistema Organon',
    category: 'document',
    filePath: 'F:\\Projetos\\Reoli\\Ecossistema\\.docs\\README.md',
    tags: ['Arquitetura', 'Documentação'],
    updatedAt: '14/08/2026',
    fileSize: '4.2 KB',
  },
  {
    id: 'lib-2',
    title: 'Relatório Semanal de Projetos Git Engine',
    category: 'pdf',
    filePath: 'F:\\Projetos\\Reoli\\Ecossistema\\data\\reports\\.week-reports\\relatorio-semanal.md',
    tags: ['Git', 'Relatório'],
    updatedAt: '14/08/2026',
    fileSize: '12.8 KB',
  },
  {
    id: 'lib-3',
    title: 'Configurações de Sincronização Wi-Fi',
    category: 'project',
    filePath: 'F:\\Projetos\\Reoli\\Ecossistema\\Apps\\Organon\\src\\main\\localSyncServer.ts',
    tags: ['Rede', 'Código'],
    updatedAt: '14/08/2026',
    fileSize: '8.1 KB',
  },
]

export const LibraryPage: React.FC = () => {
  const [items, setItems] = useState<LibraryItem[]>(INITIAL_LIBRARY_ITEMS)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [newTitle, setNewTitle] = useState('')
  const [newPath, setNewPath] = useState('')
  const [newCategory, setNewCategory] = useState<LibraryItem['category']>('document')
  const [newTags, setNewTags] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory
      const matchSearch =
        !search ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      return matchCat && matchSearch
    })
  }, [items, selectedCategory, search])

  const handleOpenPath = (filePath: string) => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.runCommand) {
      void (window as any).electronAPI.runCommand(`explorer "${filePath}"`)
    } else {
      alert(`Caminho do arquivo: ${filePath}`)
    }
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newPath.trim()) return

    const newItem: LibraryItem = {
      id: `lib-${Date.now()}`,
      title: newTitle.trim(),
      filePath: newPath.trim(),
      category: newCategory,
      tags: newTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      updatedAt: new Date().toLocaleDateString('pt-BR'),
      fileSize: 'Local',
    }

    setItems((prev) => [newItem, ...prev])
    setNewTitle('')
    setNewPath('')
    setNewTags('')
    setShowAddModal(false)
  }

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto', background: 'var(--color-background, #12121a)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text, #ffffff)', margin: 0 }}>
            Biblioteca de Arquivos & Mídias
          </h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
            Gerencie documentos, PDFs, comprovantes e arquivos locais integrados ao ecossistema
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--color-primary, #6366f1)',
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          + Adicionar Arquivo
        </button>
      </div>

      {/* Controles de Busca e Filtro */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar por nome ou tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            height: 40,
            padding: '0 14px',
            borderRadius: 8,
            border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
            background: 'var(--color-surface, #1e1e2d)',
            color: 'var(--color-text)',
            fontSize: 13,
          }}
        />

        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { id: 'all', label: 'Todos' },
            { id: 'document', label: 'Documentos' },
            { id: 'pdf', label: 'PDFs' },
            { id: 'receipt', label: 'Comprovantes' },
            { id: 'project', label: 'Projetos' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: selectedCategory === cat.id ? 'var(--color-primary, #6366f1)' : 'rgba(255,255,255,0.05)',
                color: selectedCategory === cat.id ? '#ffffff' : 'var(--color-text-muted)',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Arquivos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {filteredItems.map((item) => (
          <div
            key={item.id}
            style={{
              padding: 16,
              borderRadius: 12,
              background: 'var(--color-surface, #1e1e2d)',
              border: '1px solid var(--color-border, rgba(255,255,255,0.08))',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 4,
                    textTransform: 'uppercase',
                    background:
                      item.category === 'pdf'
                        ? '#ef444422'
                        : item.category === 'document'
                        ? '#3b82f622'
                        : '#10b98122',
                    color:
                      item.category === 'pdf'
                        ? '#f87171'
                        : item.category === 'document'
                        ? '#60a5fa'
                        : '#34d399',
                  }}
                >
                  {item.category}
                </span>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.updatedAt}</span>
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>
                {item.title}
              </h3>
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.filePath}
              </p>
            </div>

            {/* Tags e Ação */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {item.tags.map((t, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: 10,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    #{t}
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleOpenPath(item.filePath)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--color-text)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Abrir no Windows
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Adição */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <form
            onSubmit={handleAddItem}
            style={{
              width: 420,
              padding: 24,
              borderRadius: 14,
              background: 'var(--color-surface, #1e1e2d)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
              Adicionar Arquivo à Biblioteca
            </h2>

            <input
              type="text"
              placeholder="Título do Arquivo"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              style={{
                height: 38,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
                fontSize: 13,
              }}
            />

            <input
              type="text"
              placeholder="Caminho Completo (ex: C:\Documentos\arquivo.pdf)"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              required
              style={{
                height: 38,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
                fontSize: 13,
              }}
            />

            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as any)}
              style={{
                height: 38,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
                fontSize: 13,
              }}
            >
              <option value="document">Documento</option>
              <option value="pdf">PDF</option>
              <option value="receipt">Comprovante</option>
              <option value="project">Projeto</option>
            </select>

            <input
              type="text"
              placeholder="Tags separadas por vírgula (ex: Fiscal, Contrato)"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              style={{
                height: 38,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text)',
                fontSize: 13,
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  padding: '6px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'var(--color-primary, #6366f1)',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
