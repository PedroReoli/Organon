import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { isElectron, copyTextToClipboard } from '../utils'

type DirEntry = { name: string; isDirectory: boolean; isFile: boolean }

interface FileBrowserProps {
  rootPath: string
  onFileOpen?: (fullPath: string) => void
}

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'])
const PDF_EXTS = new Set(['pdf'])

const joinPath = (base: string, child: string): string => {
  const sep = base.includes('\\') ? '\\' : '/'
  return base.replace(/[/\\]+$/, '') + sep + child
}

const getFileExtension = (name: string): string => {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

const FILE_TYPE_ICONS: Record<string, string> = {
  ts: '#3178c6', tsx: '#3178c6', js: '#f7df1e', jsx: '#f7df1e',
  py: '#3776ab', rs: '#dea584', go: '#00add8', java: '#ed8b00',
  c: '#a8b9cc', cpp: '#00599c', cs: '#68217a', rb: '#cc342d',
  php: '#777bb4', swift: '#fa7343', kt: '#7f52ff',
  html: '#e34f26', css: '#1572b6', scss: '#c69', sass: '#c69',
  vue: '#4fc08d', svelte: '#ff3e00',
  json: '#292929', yaml: '#cb171e', yml: '#cb171e', xml: '#f60',
  csv: '#22a366', sql: '#336791', toml: '#9c4121',
  md: '#083fa1', txt: '#888', pdf: '#ff0000', doc: '#2b579a', docx: '#2b579a',
  xls: '#217346', xlsx: '#217346', ppt: '#b7472a', pptx: '#b7472a',
  png: '#a4c639', jpg: '#a4c639', jpeg: '#a4c639', gif: '#a4c639',
  svg: '#ffb13b', webp: '#a4c639', ico: '#a4c639', bmp: '#a4c639',
  mp4: '#ff6600', avi: '#ff6600', mkv: '#ff6600', mov: '#ff6600',
  mp3: '#1db954', wav: '#1db954', flac: '#1db954', ogg: '#1db954',
  zip: '#ffc107', rar: '#ffc107', '7z': '#ffc107', tar: '#ffc107', gz: '#ffc107',
  env: '#ecd53f', gitignore: '#f05032', lock: '#888',
  exe: '#00a4ef', msi: '#00a4ef', bat: '#4d4d4d', sh: '#4eaa25', cmd: '#4d4d4d',
}

const getFileColor = (name: string): string => {
  const ext = getFileExtension(name)
  return FILE_TYPE_ICONS[ext] || 'var(--color-text-muted)'
}

export const FileBrowser = ({ rootPath, onFileOpen }: FileBrowserProps) => {
  const [dirEntries, setDirEntries] = useState<DirEntry[]>([])
  const [dirLoading, setDirLoading] = useState(false)
  const [dirError, setDirError] = useState(false)
  const [browsePath, setBrowsePath] = useState<string>(rootPath)
  const [fileFilter, setFileFilter] = useState('')
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  // Rename state
  const [renamingEntry, setRenamingEntry] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Preview state
  const [previewEntry, setPreviewEntry] = useState<{ name: string; url: string; type: 'image' | 'pdf' } | null>(null)

  const rootNormalized = rootPath.replace(/[/\\]+$/, '')

  const loadDir = useCallback(async (dirPath: string) => {
    if (!isElectron()) return
    setDirLoading(true)
    setDirError(false)
    setFileFilter('')
    setRenamingEntry(null)
    try {
      const entries = await window.electronAPI.readDir(dirPath)
      setDirEntries(entries)
      setBrowsePath(dirPath)
    } catch {
      setDirEntries([])
      setDirError(true)
    } finally {
      setDirLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDir(rootPath)
  }, [rootPath, loadDir])

  const filteredEntries = useMemo(() => {
    const q = fileFilter.trim().toLowerCase()
    if (!q) return dirEntries
    return dirEntries.filter(e => e.name.toLowerCase().includes(q))
  }, [dirEntries, fileFilter])

  const dirFolders = useMemo(() => filteredEntries.filter(e => e.isDirectory), [filteredEntries])
  const dirFiles = useMemo(() => filteredEntries.filter(e => e.isFile), [filteredEntries])

  const isAtRoot = browsePath.replace(/[/\\]+$/, '') === rootNormalized

  const browseRelative = useMemo(() => {
    const current = browsePath.replace(/[/\\]+$/, '')
    if (current === rootNormalized) return ''
    return current.slice(rootNormalized.length).replace(/^[/\\]/, '')
  }, [browsePath, rootNormalized])

  const rootTitle = useMemo(() => {
    const normalized = rootPath.replace(/\\/g, '/').replace(/\/+$/, '')
    const segments = normalized.split('/').filter(Boolean)
    return segments[segments.length - 1] ?? rootPath
  }, [rootPath])

  const handleNavigateInto = (folderName: string) => {
    const newPath = joinPath(browsePath, folderName)
    void loadDir(newPath)
  }

  const handleNavigateUp = () => {
    const normalized = browsePath.replace(/\\/g, '/')
    const segments = normalized.split('/').filter(Boolean)
    if (segments.length <= 1) return
    segments.pop()
    let parent = segments.join('/')
    if (browsePath.includes('\\')) parent = parent.replace(/\//g, '\\')
    if (normalized.startsWith('/')) parent = '/' + parent
    void loadDir(parent)
  }

  const handleOpenFile = (fileName: string) => {
    const fullPath = joinPath(browsePath, fileName)
    if (onFileOpen) {
      onFileOpen(fullPath)
    } else if (isElectron()) {
      void window.electronAPI.openPath(fullPath)
    }
  }

  const handleCopyPath = (entryName: string) => {
    const fullPath = joinPath(browsePath, entryName)
    void copyTextToClipboard(fullPath)
    setCopiedPath(entryName)
    setTimeout(() => setCopiedPath(null), 2000)
  }

  // Rename
  const handleStartRename = (entryName: string) => {
    setRenamingEntry(entryName)
    setRenameValue(entryName)
    setTimeout(() => renameInputRef.current?.focus(), 50)
  }

  const handleConfirmRename = async () => {
    if (!renamingEntry || !renameValue.trim() || renameValue === renamingEntry) {
      setRenamingEntry(null)
      return
    }
    if (!isElectron()) return
    const oldPath = joinPath(browsePath, renamingEntry)
    const newPath = joinPath(browsePath, renameValue.trim())
    const ok = await window.electronAPI.renamePath(oldPath, newPath)
    setRenamingEntry(null)
    if (ok) void loadDir(browsePath)
  }

  const handleCancelRename = () => {
    setRenamingEntry(null)
    setRenameValue('')
  }

  // Preview
  const handlePreview = async (entryName: string) => {
    const ext = getFileExtension(entryName)
    const fullPath = joinPath(browsePath, entryName)
    if (!isElectron()) return

    const url = await window.electronAPI.getAbsoluteFileUrl(fullPath)
    if (IMAGE_EXTS.has(ext)) {
      setPreviewEntry({ name: entryName, url, type: 'image' })
    } else if (PDF_EXTS.has(ext)) {
      setPreviewEntry({ name: entryName, url, type: 'pdf' })
    }
  }

  const isPreviewable = (name: string): boolean => {
    const ext = getFileExtension(name)
    return IMAGE_EXTS.has(ext) || PDF_EXTS.has(ext)
  }

  return (
    <div className="file-browser">
      <div className="file-browser-header">
        <div className="file-browser-nav">
          {!isAtRoot && (
            <button className="file-browser-nav-btn" onClick={handleNavigateUp} title="Voltar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <button
            className="file-browser-nav-btn"
            onClick={() => void loadDir(rootPath)}
            title="Voltar ao root"
            disabled={isAtRoot}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
          <button className="file-browser-nav-btn" onClick={() => void loadDir(browsePath)} title="Recarregar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
        <div className="file-browser-location">
          <span className="file-browser-location-root">{rootTitle}</span>
          {browseRelative && (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10" style={{ opacity: 0.4 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span className="file-browser-location-sub">{browseRelative.replace(/\\/g, ' / ')}</span>
            </>
          )}
        </div>
        <div className="file-browser-stats">
          {dirFolders.length > 0 && <span>{dirFolders.length} pasta{dirFolders.length !== 1 ? 's' : ''}</span>}
          {dirFiles.length > 0 && <span>{dirFiles.length} arquivo{dirFiles.length !== 1 ? 's' : ''}</span>}
        </div>
      </div>

      {/* Filter always visible */}
      <div className="file-browser-filter">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={fileFilter}
          onChange={e => setFileFilter(e.target.value)}
          placeholder="Filtrar arquivos..."
          className="file-browser-filter-input"
        />
        {fileFilter && (
          <button className="file-browser-filter-clear" onClick={() => setFileFilter('')}>&times;</button>
        )}
      </div>

      <div className="file-browser-content">
        <div className="file-browser-list">
          {dirLoading && (
            <div className="file-browser-loading">Carregando...</div>
          )}
          {dirError && (
            <div className="file-browser-error">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              Nao foi possivel ler este diretorio.
            </div>
          )}
          {!dirLoading && !dirError && filteredEntries.length === 0 && (
            <div className="file-browser-empty">
              {fileFilter ? 'Nenhum resultado' : 'Pasta vazia'}
            </div>
          )}

          {/* Folders */}
          {dirFolders.map(entry => (
            <div
              key={'d:' + entry.name}
              className="file-browser-entry file-browser-entry-dir"
              onClick={() => renamingEntry !== entry.name && handleNavigateInto(entry.name)}
            >
              <span className="file-browser-entry-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" style={{ color: 'var(--color-primary)' }}>
                  <path d="M4 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.586a1 1 0 0 1-.707-.293L10.293 4.293A1 1 0 0 0 9.586 4H4z" />
                </svg>
              </span>
              {renamingEntry === entry.name ? (
                <input
                  ref={renameInputRef}
                  className="file-browser-rename-input"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') void handleConfirmRename()
                    if (e.key === 'Escape') handleCancelRename()
                  }}
                  onBlur={() => void handleConfirmRename()}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="file-browser-entry-name">{entry.name}</span>
              )}
              <div className="file-browser-entry-actions" onClick={e => e.stopPropagation()}>
                <button className="file-browser-action-btn" onClick={() => handleStartRename(entry.name)} title="Renomear">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button className="file-browser-action-btn" onClick={() => handleCopyPath(entry.name)} title="Copiar caminho">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                    {copiedPath === entry.name ? (
                      <path d="M20 6L9 17l-5-5" />
                    ) : (
                      <>
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="file-browser-entry-arrow">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          ))}

          {/* Files */}
          {dirFiles.map(entry => (
            <div
              key={'f:' + entry.name}
              className="file-browser-entry file-browser-entry-file"
              onClick={() => renamingEntry !== entry.name && handleOpenFile(entry.name)}
            >
              <span className="file-browser-entry-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18" style={{ color: getFileColor(entry.name) }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </span>
              {renamingEntry === entry.name ? (
                <input
                  ref={renameInputRef}
                  className="file-browser-rename-input"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') void handleConfirmRename()
                    if (e.key === 'Escape') handleCancelRename()
                  }}
                  onBlur={() => void handleConfirmRename()}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="file-browser-entry-name">{entry.name}</span>
              )}
              <div className="file-browser-entry-actions" onClick={e => e.stopPropagation()}>
                <button className="file-browser-action-btn" onClick={() => handleStartRename(entry.name)} title="Renomear">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button className="file-browser-action-btn" onClick={() => handleCopyPath(entry.name)} title="Copiar caminho">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                    {copiedPath === entry.name ? (
                      <path d="M20 6L9 17l-5-5" />
                    ) : (
                      <>
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </>
                    )}
                  </svg>
                </button>
                {isPreviewable(entry.name) && (
                  <button className="file-browser-action-btn" onClick={() => void handlePreview(entry.name)} title="Preview">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                )}
              </div>
              <span className="file-browser-entry-ext">{getFileExtension(entry.name).toUpperCase() || '\u2014'}</span>
            </div>
          ))}
        </div>

        {/* Preview panel */}
        {previewEntry && (
          <div className="file-browser-preview">
            <div className="file-browser-preview-header">
              <span className="file-browser-preview-title">{previewEntry.name}</span>
              <button className="file-browser-preview-close" onClick={() => setPreviewEntry(null)}>&times;</button>
            </div>
            <div className="file-browser-preview-body">
              {previewEntry.type === 'image' && (
                <img
                  src={previewEntry.url}
                  alt={previewEntry.name}
                  className="file-browser-preview-img"
                />
              )}
              {previewEntry.type === 'pdf' && (
                <embed
                  src={previewEntry.url}
                  type="application/pdf"
                  className="file-browser-preview-pdf"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
