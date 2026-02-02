import { useEffect, useMemo, useState } from 'react'
import type { FileItem } from '../types'
import { isElectron } from '../utils'

interface FilesViewProps {
  files: FileItem[]
  onImportFiles: () => void
  onImportFilePaths: (paths: string[]) => Promise<{ imported: number; failed: number }>
  onOpenFile: (file: FileItem) => void
  onDeleteFile: (file: FileItem) => void
}

type FileFilter = 'all' | 'image' | 'pdf' | 'docx' | 'other'

export const FilesView = ({ files, onImportFiles, onImportFilePaths, onOpenFile, onDeleteFile }: FilesViewProps) => {
  const [filter, setFilter] = useState<FileFilter>('all')
  const [urlMap, setUrlMap] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [showDropOverlay, setShowDropOverlay] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importToast, setImportToast] = useState<string | null>(null)

  const filteredFiles = filter === 'all'
    ? files
    : files.filter(f => f.type === filter)

  const visibleFiles = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return filteredFiles
    return filteredFiles.filter(f => f.name.toLowerCase().includes(q))
  }, [filteredFiles, query])

  const stats = useMemo(() => {
    const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0)
    const byType = files.reduce<Record<FileItem['type'], number>>((acc, f) => {
      acc[f.type] = (acc[f.type] ?? 0) + 1
      return acc
    }, { image: 0, pdf: 0, docx: 0, other: 0 })
    return { totalBytes, byType }
  }, [files])

  useEffect(() => {
    if (!isElectron()) return
    let cancelled = false

    const loadUrls = async () => {
      for (const file of visibleFiles) {
        if (file.type !== 'image') continue
        if (urlMap[file.id]) continue
        try {
          const url = await window.electronAPI.getFileUrl(file.path)
          if (!url || cancelled) continue
          setUrlMap(prev => (prev[file.id] ? prev : { ...prev, [file.id]: url }))
        } catch {
          // Ignora
        }
      }
    }

    loadUrls()
    return () => {
      cancelled = true
    }
  }, [visibleFiles, urlMap])

  const getFileIcon = (type: FileItem['type']) => {
    switch (type) {
      case 'image':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        )
      case 'pdf':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M10 9h4M10 13h4M10 17h4" />
          </svg>
        )
      case 'docx':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8M16 17H8M10 9H8" />
          </svg>
        )
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
        )
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleDropFiles = async (paths: string[]) => {
    const unique = Array.from(new Set(paths.filter(Boolean)))
    if (unique.length === 0) return

    setIsImporting(true)
    try {
      const { imported, failed } = await onImportFilePaths(unique)
      if (imported > 0 && failed === 0) {
        setImportToast(`${imported} arquivo(s) importado(s).`)
      } else if (imported > 0 && failed > 0) {
        setImportToast(`${imported} importado(s), ${failed} falhou(aram).`)
      } else {
        setImportToast(`Falha ao importar ${failed} arquivo(s).`)
      }
      setTimeout(() => setImportToast(null), 3500)
    } finally {
      setIsImporting(false)
    }
  }

  const extractPathsFromDrop = (e: React.DragEvent) => {
    const list = Array.from(e.dataTransfer.files ?? [])
    return list
      .map(file => (file as File & { path?: string }).path)
      .filter((p): p is string => !!p)
  }

  return (
    <div className="files-layout">
      <header className="files-header">
        <div>
          <h2>Arquivos</h2>
          <p>Importe (copia) arquivos para dentro do app e organize por tipo.</p>
        </div>
        <div className="files-header-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowDropOverlay(true)}
            disabled={!isElectron()}
            title={!isElectron() ? 'Disponivel apenas no app desktop' : 'Arraste e solte varios arquivos de uma vez'}
          >
            Arrastar arquivos
          </button>
          <button className="btn btn-primary" onClick={onImportFiles} disabled={!isElectron()}>
            + Importar
          </button>
        </div>
      </header>

      <div className="files-toolbar">
        <div className="files-search">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="form-input"
            placeholder="Buscar por nome..."
          />
        </div>

        <div className="files-stats" aria-label="Resumo de arquivos">
          <span className="files-stat-pill">{files.length} arquivos</span>
          <span className="files-stat-pill">{formatSize(stats.totalBytes)}</span>
        </div>
      </div>

      <div className="files-filters">
        {(['all', 'image', 'pdf', 'docx', 'other'] as FileFilter[]).map(f => (
          <button
            key={f}
            className={`files-filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all'
              ? `Todos (${files.length})`
              : f === 'image'
                ? `Imagens (${stats.byType.image})`
                : f === 'pdf'
                  ? `PDF (${stats.byType.pdf})`
                  : f === 'docx'
                    ? `DOCX (${stats.byType.docx})`
                    : `Outros (${stats.byType.other})`}
          </button>
        ))}
      </div>

      <div className="files-content">
        {importToast && (
          <div className="files-toast" role="status" aria-live="polite">
            {importToast}
          </div>
        )}

        {visibleFiles.length === 0 ? (
          <div className="files-empty">
            <div className="files-empty-card">
              <div className="files-empty-title">Nenhum arquivo aqui</div>
              <div className="files-empty-subtitle">
                {query.trim()
                  ? 'Nenhum arquivo corresponde a sua busca.'
                  : 'Importe arquivos para organiza-los aqui.'}
              </div>
              <div className="files-empty-actions">
                <button className="btn btn-primary" onClick={onImportFiles} disabled={!isElectron()}>
                  Importar arquivos
                </button>
                <button className="btn btn-secondary" onClick={() => setShowDropOverlay(true)} disabled={!isElectron()}>
                  Arrastar e soltar
                </button>
              </div>
            </div>
          </div>
        ) : filter === 'image' ? (
          <div className="files-grid">
            {visibleFiles.map(file => (
              <div key={file.id} className="files-image-card">
                <div className="files-image-preview">
                  {urlMap[file.id] ? (
                    <img src={urlMap[file.id]} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    getFileIcon(file.type)
                  )}
                </div>
                <div className="files-image-name" title={file.name}>{file.name}</div>
                <div className="files-image-actions">
                  <button className="btn btn-secondary" onClick={() => onOpenFile(file)}>
                    Abrir
                  </button>
                  <button className="btn btn-danger" onClick={() => onDeleteFile(file)}>
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="files-list">
            {visibleFiles.map(file => (
              <div key={file.id} className="files-list-item">
                <div className="files-list-icon">
                  {getFileIcon(file.type)}
                </div>
                <div className="files-list-info">
                  <span className="files-list-name">{file.name}</span>
                  <span className="files-list-meta">
                    {formatSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="files-list-actions">
                  <button className="btn btn-secondary" onClick={() => onOpenFile(file)}>
                    Abrir
                  </button>
                  <button className="btn btn-danger" onClick={() => onDeleteFile(file)}>
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDropOverlay && (
        <div
          className={`files-drop-overlay ${isDragging ? 'is-dragging' : ''}`}
          onClick={() => !isImporting && setShowDropOverlay(false)}
          onDragEnter={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!isElectron()) return
            setIsDragging(true)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!isElectron()) return
            setIsDragging(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDragging(false)
          }}
          onDrop={async (e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDragging(false)
            if (!isElectron() || isImporting) return
            const paths = extractPathsFromDrop(e)
            await handleDropFiles(paths)
            setShowDropOverlay(false)
          }}
        >
          <div className="files-drop-modal" onClick={(e) => e.stopPropagation()}>
            <div className="files-drop-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12" />
                <path d="M7 8l5-5 5 5" />
                <rect x="4" y="15" width="16" height="6" rx="2" />
              </svg>
            </div>
            <div className="files-drop-title">Arraste e solte arquivos aqui</div>
            <div className="files-drop-subtitle">
              {isImporting ? 'Importando...' : 'Importacao em massa (copia para dentro do app).'}
            </div>
            <div className="files-drop-actions">
              <button className="btn btn-secondary" onClick={() => setShowDropOverlay(false)} disabled={isImporting}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
