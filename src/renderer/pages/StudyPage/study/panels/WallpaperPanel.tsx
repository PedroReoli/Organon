import React from 'react'
import type { SearchImageResult } from '@Study/study/types'

interface WallpaperPanelProps {
  wallpaperUrlInput:  string
  setWallpaperUrlInput: (v: string) => void
  imageSearch:        string
  setImageSearch:     (v: string) => void
  searchLoading:      boolean
  searchError:        string | null
  searchResults:      SearchImageResult[]
  searchPage:         number
  setSearchPage:      (updater: (prev: number) => number) => void
  totalSearchPages:   number
  pagedSearchResults: SearchImageResult[]
  applyWallpaperUrl:  (url: string) => void
  handleWallpaperUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  searchImages:       () => void
  setWallpaperUrl:    (url: string) => void
}

export const WallpaperPanel = ({
  wallpaperUrlInput, setWallpaperUrlInput,
  imageSearch, setImageSearch,
  searchLoading, searchError, searchResults, searchPage, setSearchPage,
  totalSearchPages, pagedSearchResults,
  applyWallpaperUrl, handleWallpaperUpload, searchImages, setWallpaperUrl,
}: WallpaperPanelProps) => (
  <div className="study-panel-section">
    <h3>Fundo</h3>
    <label className="study-file-upload-btn">
      <input type="file" accept="image/*" onChange={handleWallpaperUpload} />
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      Escolher imagem local
    </label>

    <div className="study-input-row">
      <input
        type="text"
        value={wallpaperUrlInput}
        onChange={e => setWallpaperUrlInput(e.target.value)}
        placeholder="URL de imagem"
      />
      <button type="button" className="study-btn" onClick={() => applyWallpaperUrl(wallpaperUrlInput)}>
        Aplicar
      </button>
    </div>

    <p className="study-panel-hint">Pesquisa web: 6 imagens por pagina (3x2).</p>
    <div className="study-input-row">
      <input
        type="text"
        value={imageSearch}
        onChange={e => setImageSearch(e.target.value)}
        placeholder="Pesquisar imagem na internet"
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); searchImages() }
        }}
      />
      <button type="button" className="study-btn" onClick={searchImages}>
        Buscar
      </button>
    </div>

    {searchLoading && <p className="study-panel-hint">Buscando imagens...</p>}
    {searchError && <p className="study-panel-error">{searchError}</p>}

    {searchResults.length > 0 && (
      <>
        <div className="study-image-grid">
          {pagedSearchResults.map(image => (
            <button
              key={image.id}
              type="button"
              className="study-image-item"
              onClick={() => applyWallpaperUrl(image.fullUrl)}
              title={image.title}
            >
              <img src={image.thumbUrl} alt={image.title} loading="lazy" />
              <span>{image.title}</span>
            </button>
          ))}
        </div>

        <div className="study-pagination">
          <button
            type="button"
            className="study-btn study-btn-ghost"
            onClick={() => setSearchPage(prev => Math.max(1, prev - 1))}
            disabled={searchPage <= 1}
          >
            Anterior
          </button>
          <strong>{searchPage} / {totalSearchPages}</strong>
          <button
            type="button"
            className="study-btn study-btn-ghost"
            onClick={() => setSearchPage(prev => Math.min(totalSearchPages, prev + 1))}
            disabled={searchPage >= totalSearchPages}
          >
            Proxima
          </button>
        </div>
      </>
    )}

    <button type="button" className="study-btn study-btn-ghost" onClick={() => setWallpaperUrl('')}>
      Remover fundo
    </button>
  </div>
)
