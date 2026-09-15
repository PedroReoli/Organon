import { useCallback, useEffect, useState } from 'react'
import { organonApi } from '../../api/organon'
import type { PlannerPreferences } from '../types'

const DEFAULTS: PlannerPreferences = {
  plannerStartHour: 5,
  plannerEndHour: 23,
  plannerInterval: 60,
}

const LS_KEY = 'organon:plannerPrefs'
const SYNC_EVENT = 'organon:plannerPrefsChanged'

function loadLocal(): PlannerPreferences {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { /* ignorar */ }
  return DEFAULTS
}

function saveLocal(prefs: PlannerPreferences) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(prefs))
    window.dispatchEvent(new Event(SYNC_EVENT))
  } catch { /* ignorar */ }
}

function fromApi(raw: { planner_start_hour: number; planner_end_hour: number; planner_interval: number }): PlannerPreferences {
  return {
    plannerStartHour: raw.planner_start_hour,
    plannerEndHour: raw.planner_end_hour,
    plannerInterval: raw.planner_interval as 30 | 60,
  }
}

export function usePlannerPreferences(isLoggedIn: boolean) {
  const [prefs, setPrefs] = useState<PlannerPreferences>(loadLocal)
  const [loading, setLoading] = useState(false)

  // Busca prefs do servidor ao logar
  useEffect(() => {
    if (!isLoggedIn) return
    setLoading(true)
    organonApi.preferences.getPlanner()
      .then(res => {
        const p = fromApi(res.data)
        setPrefs(p)
        saveLocal(p)
      })
      .catch(() => { /* mantém local */ })
      .finally(() => setLoading(false))
  }, [isLoggedIn])

  // Escuta mudanças feitas por outra instância do hook (ex: Settings → PlannerView)
  useEffect(() => {
    const handle = () => setPrefs(loadLocal())
    window.addEventListener(SYNC_EVENT, handle)
    return () => window.removeEventListener(SYNC_EVENT, handle)
  }, [])

  const savePrefs = useCallback(async (updates: Partial<PlannerPreferences>) => {
    const next = { ...prefs, ...updates }
    setPrefs(next)
    saveLocal(next)
    if (isLoggedIn) {
      try {
        await organonApi.preferences.savePlanner({
          planner_start_hour: next.plannerStartHour,
          planner_end_hour: next.plannerEndHour,
          planner_interval: next.plannerInterval,
        })
      } catch {
        // Não reverte — local já está atualizado
      }
    }
  }, [prefs, isLoggedIn])

  return { prefs, loading, savePrefs }
}
