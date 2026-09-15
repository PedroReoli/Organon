// Cliente de canvas — armazenamento 100% local via IPC do Electron

export interface CanvasItem {
  id:         string
  name:       string
  thumbnail:  string | null
  createdAt:  string
  updatedAt:  string
}

export interface CanvasFull extends CanvasItem {
  snapshot: Record<string, unknown>
}

function toItem(c: CanvasFull): CanvasItem {
  return {
    id:        c.id,
    name:      c.name,
    thumbnail: c.thumbnail,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

export const canvasApi = {
  list: async (): Promise<{ data: CanvasItem[] }> => {
    const canvases = await (window.electronAPI as any).canvasList()
    return { data: canvases.map(toItem) }
  },

  get: async (id: string): Promise<{ data: CanvasFull }> => {
    const canvas = await (window.electronAPI as any).canvasGet(id)
    if (!canvas) throw new Error(`Canvas ${id} não encontrado`)
    return { data: canvas }
  },

  create: async (name?: string): Promise<{ data: CanvasItem }> => {
    const canvas = await (window.electronAPI as any).canvasCreate(name)
    return { data: toItem(canvas) }
  },

  save: async (
    id: string,
    payload: { snapshot?: Record<string, unknown>; thumbnail?: string; name?: string },
  ): Promise<{ data: CanvasItem }> => {
    const canvas = await (window.electronAPI as any).canvasSave(id, payload)
    if (!canvas) throw new Error(`Canvas ${id} não encontrado`)
    return { data: toItem(canvas) }
  },

  remove: async (id: string): Promise<void> => {
    await (window.electronAPI as any).canvasDelete(id)
  },
}
