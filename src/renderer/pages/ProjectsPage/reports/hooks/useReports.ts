import { useState, useEffect, useCallback, useRef } from 'react'
import { isElectron } from '@utils'
import type { WeekReport, GeneralReport } from '@types'

interface UseReportsResult {
  reports: WeekReport[]
  general: GeneralReport | null
  isLoading: boolean
  error: string | null
  reportsDir: string
  reload: () => void
}

export const useReports = (reportsDir?: string | null): UseReportsResult => {
  const dir = reportsDir?.trim() || ''
  const [reports, setReports] = useState<WeekReport[]>([])
  const [general, setGeneral] = useState<GeneralReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const watchingRef = useRef<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!isElectron() || !dir) {
      setIsLoading(false)
      return
    }
    if (!silent) setIsLoading(true)
    setError(null)
    try {
      const entries = await window.electronAPI.readDir(dir)
      const jsonFiles = entries.filter(e => e.isFile && e.name.endsWith('.json') && e.name !== 'general.json')

      const parsed: WeekReport[] = []
      for (const file of jsonFiles) {
        const filePath = `${dir}\\${file.name}`
        const raw = await (window.electronAPI as any).readTextFile(filePath) as string | null
        if (!raw) continue
        try {
          const data = JSON.parse(raw) as WeekReport
          if (data.date && data.repos) parsed.push(data)
        } catch {
          // JSON inválido — ignora
        }
      }

      parsed.sort((a, b) => b.date.localeCompare(a.date))
      setReports(parsed)

      // Carregar general.json
      const generalPath = `${dir}\\general.json`
      const generalRaw = await (window.electronAPI as any).readTextFile(generalPath) as string | null
      if (generalRaw) {
        try {
          const g = JSON.parse(generalRaw) as GeneralReport
          if (g.repos && g.weeklyTotals) setGeneral(g)
        } catch {
          setGeneral(null)
        }
      } else {
        setGeneral(null)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }, [dir])

  // fs.watch
  useEffect(() => {
    if (!isElectron() || !dir) return

    const api = window.electronAPI as any

    const handleChange = () => { void load(true) }

    if (watchingRef.current && watchingRef.current !== dir) {
      void api.unwatchReportsDir(watchingRef.current)
      api.offReportsChanged(handleChange)
      watchingRef.current = null
    }

    void api.watchReportsDir(dir)
    api.onReportsChanged(handleChange)
    watchingRef.current = dir

    return () => {
      void api.unwatchReportsDir(dir)
      api.offReportsChanged(handleChange)
      watchingRef.current = null
    }
  }, [dir, load])

  useEffect(() => {
    void load()
  }, [load])

  return { reports, general, isLoading, error, reportsDir: dir, reload: () => void load(true) }
}
