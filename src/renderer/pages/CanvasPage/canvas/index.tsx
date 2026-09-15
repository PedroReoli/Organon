import { useMemo, useState } from 'react'
import { CanvasListView } from './CanvasListView'
import { CanvasEditor }   from './CanvasEditor'
import { useCanvases }    from './useCanvases'
import { CanvasFolderSidebar } from './CanvasFolderSidebar'
import { CanvasVersionsModal } from './CanvasVersionsModal'
import type { CanvasFull } from '../../../api/canvas'
import type { CanvasFolder, CanvasVersionEntry } from '@types'

interface CanvasViewProps {
  userLoggedIn: boolean
  canvasFolders: CanvasFolder[]
  canvasFolderAssignments: Record<string, string | null>
  canvasVersions: Record<string, CanvasVersionEntry[]>
  onAddCanvasFolder: (name: string) => string
  onRenameCanvasFolder: (id: string, name: string) => void
  onRemoveCanvasFolder: (id: string) => void
  onMoveCanvasToFolder: (canvasId: string, folderId: string | null) => void
  onSnapshotVersion: (canvasId: string, snapshot: Record<string, unknown>, thumbnail?: string) => void
  onRemoveVersion: (canvasId: string, versionId: string) => void
}

// Estado do editor: qual canvas está aberto e seu snapshot carregado
type EditorState = {
  id:       string
  name:     string
  snapshot: Record<string, unknown> | null
}

export const CanvasView = ({
  userLoggedIn,
  canvasFolders,
  canvasFolderAssignments,
  canvasVersions,
  onAddCanvasFolder,
  onRenameCanvasFolder,
  onRemoveCanvasFolder,
  onSnapshotVersion,
  onRemoveVersion,
}: CanvasViewProps) => {
  const {
    canvases, loading, error,
    createCanvas, deleteCanvas, saveCanvas, renameCanvas, loadCanvas,
  } = useCanvases()

  const [editorState, setEditorState] = useState<EditorState | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [showVersions, setShowVersions] = useState(false)

  // Filtra canvases pela pasta selecionada
  const filteredCanvases = useMemo(() => {
    if (selectedFolderId === null) return canvases
    if (selectedFolderId === '__unassigned__') {
      return canvases.filter((c) => !canvasFolderAssignments[c.id])
    }
    return canvases.filter((c) => canvasFolderAssignments[c.id] === selectedFolderId)
  }, [canvases, selectedFolderId, canvasFolderAssignments])

  const countByFolder = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of canvases) {
      const fid = canvasFolderAssignments[c.id]
      if (fid) counts[fid] = (counts[fid] ?? 0) + 1
    }
    return counts
  }, [canvases, canvasFolderAssignments])

  const unassignedCount = useMemo(
    () => canvases.filter((c) => !canvasFolderAssignments[c.id]).length,
    [canvases, canvasFolderAssignments],
  )

  const handleOpen = async (id: string) => {
    const full: CanvasFull | null = await loadCanvas(id)
    if (!full) return
    setEditorState({ id: full.id, name: full.name, snapshot: full.snapshot ?? null })
  }

  const handleCreate = async (name: string) => {
    const id = await createCanvas(name)
    if (id) await handleOpen(id)
  }

  const handleBack = () => setEditorState(null)

  const handleSave = (snapshot: Record<string, unknown>, thumbnail: string) => {
    if (!editorState) return
    void saveCanvas(editorState.id, snapshot, thumbnail)
    // Upgrade 18: snapshot local de versao a cada save (cap 10)
    onSnapshotVersion(editorState.id, snapshot, thumbnail)
  }

  const handleRestoreVersion = (snapshot: Record<string, unknown>) => {
    if (!editorState) return
    setEditorState({ ...editorState, snapshot })
    void saveCanvas(editorState.id, snapshot, '')
  }

  const handleRename = (name: string) => {
    if (!editorState) return
    void renameCanvas(editorState.id, name)
    setEditorState(prev => prev ? { ...prev, name } : null)
  }

  if (editorState) {
    const versions = canvasVersions[editorState.id] ?? []
    return (
      <>
        <CanvasEditor
          key={editorState.id}
          canvasId={editorState.id}
          canvasName={editorState.name}
          initialSnapshot={editorState.snapshot}
          onBack={handleBack}
          onSave={handleSave}
          onRename={handleRename}
        />
        {/* Botao de versoes flutuante */}
        <button
          type="button"
          className="canvas-versions-fab"
          onClick={() => setShowVersions(true)}
          title="Ver versoes salvas"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> {versions.length}
        </button>
        {showVersions && (
          <CanvasVersionsModal
            canvasId={editorState.id}
            versions={versions}
            onClose={() => setShowVersions(false)}
            onRestore={handleRestoreVersion}
            onRemoveVersion={(vid) => onRemoveVersion(editorState.id, vid)}
          />
        )}
      </>
    )
  }

  return (
    <div className="canvas-view-with-folders">
      <CanvasFolderSidebar
        folders={canvasFolders}
        selectedFolderId={selectedFolderId}
        countByFolder={countByFolder}
        totalCount={canvases.length}
        unassignedCount={unassignedCount}
        onSelectFolder={setSelectedFolderId}
        onAddFolder={onAddCanvasFolder}
        onRenameFolder={onRenameCanvasFolder}
        onRemoveFolder={onRemoveCanvasFolder}
      />
      <CanvasListView
        canvases={filteredCanvases}
        loading={loading}
        error={error}
        userLoggedIn={userLoggedIn}
        onCreate={handleCreate}
        onOpen={(id) => {
          // Se selectedFolderId esta ativo, atribui novo canvas a ela ao criar
          void handleOpen(id)
        }}
        onDelete={deleteCanvas}
        onRename={(id, name) => void renameCanvas(id, name)}
      />
    </div>
  )
}
