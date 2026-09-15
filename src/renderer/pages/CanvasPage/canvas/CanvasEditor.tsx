// Requer: npm install @excalidraw/excalidraw jspdf
// Upgrade 18: lazy import de @excalidraw/excalidraw + CSS para tirar ~1.8MB do bundle inicial.
import { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react'
// @ts-ignore excalidraw types
import type {
  // @ts-ignore excalidraw types
  ExcalidrawImperativeAPI,
  // @ts-ignore excalidraw types
  ExcalidrawElement,
  // @ts-ignore excalidraw types
  AppState,
  // @ts-ignore excalidraw types
  BinaryFiles,
  // @ts-ignore excalidraw types
  LibraryItems,
} from '@excalidraw/excalidraw'

// O modulo inteiro entra num chunk separado. Componente E namespaces (MainMenu, exports) ficam dentro.
const ExcalidrawLazy = lazy(async () => {
  const mod = await import('@excalidraw/excalidraw')
  await import('@excalidraw/excalidraw/index.css')
  excalidrawModuleRef = mod
  return { default: mod.Excalidraw }
})

// Cache do modulo apos carregado, para os exports/MainMenu sem precisar reimportar.
let excalidrawModuleRef: typeof import('@excalidraw/excalidraw') | null = null

async function loadExcalidrawModule() {
  if (excalidrawModuleRef) return excalidrawModuleRef
  const mod = await import('@excalidraw/excalidraw')
  excalidrawModuleRef = mod
  return mod
}

interface CanvasEditorProps {
  canvasId:        string
  canvasName:      string
  initialSnapshot: Record<string, unknown> | null
  onBack:          () => void
  onSave:          (snapshot: Record<string, unknown>, thumbnail: string) => void
  onRename:        (name: string) => void
}

interface CanvasSnapshot {
  elements:     readonly ExcalidrawElement[]
  appState:     Partial<AppState>
  files:        BinaryFiles
  libraryItems: LibraryItems
}

const AUTOSAVE_DELAY = 3000

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })

// Ferramenta de desenho livre ativa por padrão
const DEFAULT_TOOL: AppState['activeTool'] = {
  type:            'freedraw',
  customType:      null,
  locked:          false,
  lastActiveTool:  null,
}

export const CanvasEditor = ({
  canvasId, canvasName, initialSnapshot, onBack, onSave, onRename,
}: CanvasEditorProps) => {
  const apiRef       = useRef<ExcalidrawImperativeAPI | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const libraryRef   = useRef<LibraryItems>([])

  const [saving,       setSaving]       = useState(false)
  const [editingName,  setEditingName]  = useState(false)
  const [nameValue,    setNameValue]    = useState(canvasName)
  const [showMenu,     setShowMenu]     = useState(false)
  const [presentation, setPresentation] = useState(false)

  const generateThumbnail = useCallback(async (
    elements: readonly ExcalidrawElement[],
    appState: Partial<AppState>,
    files:    BinaryFiles,
  ): Promise<string> => {
    try {
      if (!elements.filter(e => !e.isDeleted).length) return ''
      // Upgrade 18: quality 0.9 (era 0.5) para thumbnails reconheciveis.
      const mod = await loadExcalidrawModule()
      const blob = await mod.exportToBlob({ elements, appState, files, mimeType: 'image/png', quality: 0.9 })
      return blobToDataUrl(blob)
    } catch {
      return ''
    }
  }, [])

  const scheduleAutosave = useCallback((
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files:    BinaryFiles,
  ) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        const snapshot: CanvasSnapshot = {
          elements,
          appState:     { viewBackgroundColor: appState.viewBackgroundColor },
          files,
          libraryItems: libraryRef.current,
        }
        const thumbnail = await generateThumbnail(elements, appState, files)
        onSave(snapshot as unknown as Record<string, unknown>, thumbnail)
      } finally {
        setSaving(false)
      }
    }, AUTOSAVE_DELAY)
  }, [generateThumbnail, onSave])

  // Força save final ao sair
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      const api = apiRef.current
      if (!api) return
      const elements = api.getSceneElements()
      const appState = api.getAppState()
      const files    = api.getFiles()
      const snapshot: CanvasSnapshot = {
        elements,
        appState:     { viewBackgroundColor: appState.viewBackgroundColor },
        files,
        libraryItems: libraryRef.current,
      }
      void generateThumbnail(elements, appState, files).then(thumbnail => {
        onSave(snapshot as unknown as Record<string, unknown>, thumbnail)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasId])

  const handleExportPng = useCallback(async () => {
    const api = apiRef.current
    if (!api) return
    const elements = api.getSceneElements()
    if (!elements.filter((e: any) => !e.isDeleted).length) return
    try {
      const mod = await loadExcalidrawModule()
      const blob = await mod.exportToBlob({ elements, appState: api.getAppState(), files: api.getFiles(), mimeType: 'image/png' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `${canvasName}.png`; a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignora */ }
  }, [canvasName])

  /** Upgrade 18: export como SVG vetorial. */
  const handleExportSvg = useCallback(async () => {
    const api = apiRef.current
    if (!api) return
    const elements = api.getSceneElements()
    if (!elements.filter((e: any) => !e.isDeleted).length) return
    try {
      const mod = await loadExcalidrawModule()
      const svgEl = await mod.exportToSvg({
        elements,
        appState: api.getAppState(),
        files: api.getFiles(),
      })
      const serializer = new XMLSerializer()
      const svgString = serializer.serializeToString(svgEl)
      const blob = new Blob([svgString], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${canvasName}.svg`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignora */ }
  }, [canvasName])

  const handleExportPdf = useCallback(async () => {
    const api = apiRef.current
    if (!api) return
    const elements = api.getSceneElements()
    if (!elements.filter((e: any) => !e.isDeleted).length) return
    try {
      const [mod, jspdfMod] = await Promise.all([
        loadExcalidrawModule(),
        import('jspdf'),
      ])
      const { default: jsPDF } = jspdfMod
      const blob = await mod.exportToBlob({ elements, appState: api.getAppState(), files: api.getFiles(), mimeType: 'image/png' })
      const url  = URL.createObjectURL(blob)
      const img  = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image(); el.onload = () => resolve(el); el.onerror = reject; el.src = url
      })
      const pdf = new jsPDF({ orientation: img.width > img.height ? 'landscape' : 'portrait', unit: 'px', format: [img.width, img.height] })
      pdf.addImage(url, 'PNG', 0, 0, img.width, img.height)
      pdf.save(`${canvasName}.pdf`)
      URL.revokeObjectURL(url)
    } catch { /* ignora */ }
  }, [canvasName])

  const handleClearCanvas = useCallback(() => {
    apiRef.current?.resetScene()
    setShowMenu(false)
  }, [])

  // Upgrade 18: modo apresentacao (F11 entra, Esc sai). Esconde toolbar customizada e UI do excalidraw.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault()
        setPresentation((v) => !v)
      } else if (e.key === 'Escape' && presentation) {
        e.preventDefault()
        setPresentation(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [presentation])

  const handleNameSubmit = () => {
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== canvasName) onRename(trimmed)
    setEditingName(false)
  }

  const savedData = initialSnapshot as unknown as CanvasSnapshot | null

  const initialData = {
    elements:     savedData?.elements     ?? [],
    files:        savedData?.files        ?? {},
    libraryItems: savedData?.libraryItems ?? [],
    appState: {
      viewBackgroundColor: savedData?.appState?.viewBackgroundColor ?? '#1e1e2e',
      activeTool:          DEFAULT_TOOL,
      // Oculta elementos de UI desnecessários
      openMenu:            null,
    },
  }

  return (
    <div className={`cve-layout ${presentation ? 'is-presentation' : ''}`}>
      {/* ── Toolbar customizada (escondida em apresentacao) ───────────── */}
      {!presentation && (
      <div className="cve-toolbar">
        <button type="button" className="cve-back-btn" onClick={onBack} title="Voltar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="cve-name-wrap">
          {editingName ? (
            <input
              autoFocus
              className="cve-name-input"
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter')  handleNameSubmit()
                if (e.key === 'Escape') { setNameValue(canvasName); setEditingName(false) }
              }}
              onBlur={handleNameSubmit}
            />
          ) : (
            <button type="button" className="cve-name-btn" onClick={() => setEditingName(true)} title="Renomear">
              {canvasName}
            </button>
          )}
        </div>

        <div className="cve-toolbar-actions">
          {saving && <span className="cve-saving-indicator">Salvando...</span>}
          <button type="button" className="cve-export-btn" onClick={handleExportPng} title="Exportar PNG">PNG</button>
          <button type="button" className="cve-export-btn" onClick={handleExportSvg} title="Exportar SVG vetorial">SVG</button>
          <button type="button" className="cve-export-btn" onClick={handleExportPdf} title="Exportar PDF">PDF</button>
          <button
            type="button"
            className="cve-export-btn"
            onClick={() => setPresentation(true)}
            title="Modo apresentacao (F11)"
          >
            F11
          </button>

          {/* Menu de ações */}
          <div className="cve-menu-wrap">
            <button type="button" className="cve-export-btn" onClick={() => setShowMenu(v => !v)} title="Menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <circle cx="12" cy="5"  r="1.5" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </button>
            {showMenu && (
              <div className="cve-dropdown" onMouseLeave={() => setShowMenu(false)}>
                <button type="button" className="cve-dropdown-item cve-dropdown-danger" onClick={handleClearCanvas}>
                  Limpar tela
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {presentation && (
        <button
          type="button"
          className="cve-presentation-exit"
          onClick={() => setPresentation(false)}
          title="Sair (Esc)"
        >
          Sair (Esc)
        </button>
      )}

      {/* ── Canvas ───────────────────────────────────────────────────────── */}
      <div className="cve-canvas-wrap">
        <Suspense fallback={<div className="cve-loading">Carregando editor...</div>}>
        <ExcalidrawLazy
          excalidrawAPI={api => { apiRef.current = api }}
          initialData={initialData}
          onChange={scheduleAutosave}
          onLibraryChange={items => { libraryRef.current = items }}
          UIOptions={{
            canvasActions: {
              export:                   false,
              saveToActiveFile:         false,
              loadScene:                false,
              clearCanvas:              false,
              changeViewBackgroundColor: true,
              toggleTheme:              true,
            },
          }}
        />
        </Suspense>
      </div>
    </div>
  )
}
