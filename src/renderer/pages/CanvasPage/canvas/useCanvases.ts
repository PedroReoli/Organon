import { useCallback, useEffect, useState } from 'react'
import { canvasApi, type CanvasItem, type CanvasFull } from '../../../../api/canvas'

export function useCanvases() {
  const [canvases, setCanvases]   = useState<CanvasItem[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await canvasApi.list()
      setCanvases(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const createCanvas = useCallback(async (name?: string): Promise<string | null> => {
    try {
      const { data } = await canvasApi.create(name)
      setCanvases(prev => [data, ...prev])
      return data.id
    } catch {
      return null
    }
  }, [])

  const deleteCanvas = useCallback(async (id: string) => {
    try {
      await canvasApi.remove(id)
      setCanvases(prev => prev.filter(c => c.id !== id))
    } catch { /* ignora */ }
  }, [])

  const saveCanvas = useCallback(async (
    id: string,
    snapshot: Record<string, unknown>,
    thumbnail: string,
  ) => {
    try {
      const { data } = await canvasApi.save(id, { snapshot, thumbnail })
      setCanvases(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
    } catch { /* autosave silencioso */ }
  }, [])

  const renameCanvas = useCallback(async (id: string, name: string) => {
    try {
      const { data } = await canvasApi.save(id, { name })
      setCanvases(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
    } catch { /* ignora */ }
  }, [])

  const loadCanvas = useCallback(async (id: string): Promise<CanvasFull | null> => {
    try {
      const { data } = await canvasApi.get(id)
      return data
    } catch {
      return null
    }
  }, [])

  return {
    canvases,
    loading,
    error,
    fetchList,
    createCanvas,
    deleteCanvas,
    saveCanvas,
    renameCanvas,
    loadCanvas,
  }
}
