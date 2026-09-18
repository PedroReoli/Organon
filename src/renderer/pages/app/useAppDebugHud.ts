import { useState, useEffect } from 'react'
import type { Settings } from '@types'
import type { AppView } from '../shared/InternalNav'
import { APP_VIEW_LABELS, DEBUG_SCREEN_EVENT } from './app.constants'

interface UseAppDebugHudOptions {
  settings: Settings
  activeView: AppView
}

export function useAppDebugHud({ settings, activeView }: UseAppDebugHudOptions) {
  const debugTitlebarEnabled = import.meta.env.DEV && (settings.debugHudTitlebar ?? false)
  const debugInlineEnabled = import.meta.env.DEV && (settings.debugHudInline ?? false)
  const debugHoverEnabled = import.meta.env.DEV && (settings.debugHudHover ?? true)
  const debugAnyEnabled = debugTitlebarEnabled || debugInlineEnabled

  const [debugScreenOverride, setDebugScreenOverride] = useState<string | null>(null)
  const [debugHover, setDebugHover] = useState<string | null>(null)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const onScreen = (event: Event) => {
      const e = event as CustomEvent<{ screen?: string }>
      setDebugScreenOverride(e.detail?.screen ?? null)
    }
    window.addEventListener(DEBUG_SCREEN_EVENT, onScreen as EventListener)
    return () => window.removeEventListener(DEBUG_SCREEN_EVENT, onScreen as EventListener)
  }, [])

  useEffect(() => {
    if (!debugAnyEnabled || !debugHoverEnabled) {
      setDebugHover(null)
      return
    }

    let raf = 0
    let last = ''

    const pickLabel = (target: EventTarget | null) => {
      const el = target as HTMLElement | null
      if (!el || !el.closest) return ''

      const parts: string[] = []
      let node: HTMLElement | null = el

      while (node && parts.length < 6) {
        const debugName = node.getAttribute?.('data-debug-name')
        if (debugName) {
          const debugId = node.getAttribute('data-debug-id') ?? ''
          parts.unshift(debugId ? `${debugName}#${debugId}` : debugName)
          node = node.parentElement
          continue
        }

        const cls = typeof node.className === 'string' ? node.className : ''

        if (cls.includes('sprint-card') && !parts.some(p => p.includes('SprintCardItem'))) {
          const title = node.querySelector('.sprint-card-title')?.textContent?.trim()
          parts.unshift(`SprintCardItem#${title || node.getAttribute('data-debug-id') || '?'}`)
        } else if (cls.includes('period-cell') && !parts.some(p => p.includes('Cell'))) {
          const id = node.getAttribute('data-debug-id') || ''
          parts.unshift(id ? `PeriodView.Cell#${id}` : 'PeriodView.Cell')
        } else if (cls.includes('period-grid') && !parts.some(p => p.includes('PeriodView'))) {
          parts.unshift('PeriodView.Grid')
        } else if ((cls.includes('period-backlog') || cls.includes('hourly-backlog')) && !parts.some(p => p.includes('Backlog'))) {
          parts.unshift('PeriodView.Backlog')
        } else if (cls.includes('period-view') && !parts.some(p => p.includes('PeriodView'))) {
          parts.unshift('views/PeriodView')
        } else if ((cls.includes('hourly-view') || cls.includes('hourly-grid')) && !parts.some(p => p.includes('Hourly'))) {
          parts.unshift('views/HourlyView')
        } else if (cls.includes('planning-hub') && !parts.some(p => p.includes('HubPlanejamento'))) {
          parts.unshift('hubs/HubPlanejamento')
        } else if (cls.includes('planning-home') && !parts.some(p => p.includes('PlanningHome'))) {
          parts.unshift('planning/PlanningHomePage')
        } else if (cls.includes('planning-month') && !parts.some(p => p.includes('MonthView'))) {
          parts.unshift('views/MonthView')
        } else if (cls.includes('planning-timeline') && !parts.some(p => p.includes('Timeline'))) {
          parts.unshift('views/TimelineView')
        } else if (cls.includes('crm-hub') && !parts.some(p => p.includes('CRM'))) {
          parts.unshift('hubs/HubCRM')
        } else if (cls.includes('crm-pipeline') && !parts.some(p => p.includes('Pipeline'))) {
          parts.unshift('CRMPipeline')
        } else if (cls.includes('crm-contact-card') && !parts.some(p => p.includes('ContactCard'))) {
          const name = node.querySelector('.crm-contact-name')?.textContent?.trim()
          parts.unshift(`CRMContactCard#${name || '?'}`)
        } else if ((cls.includes('notes-view') || cls.includes('notes-')) && !parts.some(p => p.includes('Notes'))) {
          parts.unshift('NotesView')
        } else if (cls.includes('note-editor') && !parts.some(p => p.includes('Editor'))) {
          parts.unshift('WysiwygEditor')
        } else if (cls.includes('study-') && !parts.some(p => p.includes('Study'))) {
          parts.unshift('StudyView')
        } else if (cls.includes('canvas-') && !parts.some(p => p.includes('Canvas'))) {
          parts.unshift('canvas/CanvasView')
        } else if (cls.includes('settings-section') && !parts.some(p => p.includes('Section'))) {
          const heading = node.querySelector('h2, h3, [class*=title]')?.textContent?.trim()
          parts.unshift(`SettingsSection#${heading || '?'}`)
        } else if (cls.includes('settings-') && !parts.some(p => p.includes('Settings'))) {
          parts.unshift('settings/SettingsView')
        } else if (cls.includes('app-navbar') && !parts.some(p => p.includes('Navbar'))) {
          parts.unshift('Navbar')
        } else if (cls.includes('titlebar') && !parts.some(p => p.includes('Titlebar'))) {
          parts.unshift('Titlebar')
        } else if (cls.includes('app-view-toolbar') && !parts.some(p => p.includes('Toolbar'))) {
          parts.unshift('App.Toolbar')
        } else if (cls.includes('app-view-shell') && !parts.some(p => p.includes('App'))) {
          parts.unshift('App.Shell')
        }

        node = node.parentElement
      }

      if (parts.length === 0) {
        const tag = el.tagName?.toLowerCase() ?? ''
        const firstCls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : ''
        return firstCls ? `<${tag}.${firstCls}>` : `<${tag}>`
      }

      return parts.join(' > ')
    }

    const onMove = (ev: PointerEvent) => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        const label = pickLabel(ev.target)
        if (label === last) return
        last = label
        setDebugHover(label || null)
      })
    }

    const onContextMenu = (ev: MouseEvent) => {
      if (!ev.ctrlKey) return
      ev.preventDefault()
      const label = pickLabel(ev.target)
      if (label) {
        navigator.clipboard.writeText(label).then(() => {
          showDebugToast(label)
        }).catch(() => {})
      }
    }

    function showDebugToast(text: string) {
      const existing = document.querySelector('.debug-copy-toast')
      if (existing) existing.remove()
      const toast = document.createElement('div')
      toast.className = 'debug-copy-toast'
      toast.textContent = `Copiado: ${text}`
      document.body.appendChild(toast)
      setTimeout(() => toast.classList.add('is-visible'), 10)
      setTimeout(() => {
        toast.classList.remove('is-visible')
        setTimeout(() => toast.remove(), 200)
      }, 2000)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('contextmenu', onContextMenu)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('contextmenu', onContextMenu)
      if (raf) window.cancelAnimationFrame(raf)
    }
  }, [debugAnyEnabled, debugHoverEnabled])

  const debugScreen = debugScreenOverride ?? APP_VIEW_LABELS[activeView] ?? activeView
  const debugText = debugAnyEnabled
    ? `Tela: ${debugScreen}${debugHover ? ` · Hover: ${debugHover}` : ''}`
    : null

  return {
    debugTitlebarEnabled,
    debugInlineEnabled,
    debugText,
  }
}
