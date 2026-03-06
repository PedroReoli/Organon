import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Settings, ThemeName, RegisteredIDE, KeyboardShortcut, CalendarEvent } from '../types'
import { THEMES, THEME_LABELS, DEFAULT_SETTINGS } from '../types'
import { isElectron } from '../utils'
import { KeyboardShortcutCapture } from './KeyboardShortcutCapture'

interface SettingsViewProps {
  settings: Settings
  onUpdateSettings: (updates: Partial<Settings>) => void
  registeredIDEs: RegisteredIDE[]
  onAddRegisteredIDE: (input: { name: string; exePath: string; iconDataUrl?: string | null; args?: string }) => void
  onUpdateRegisteredIDE: (ideId: string, updates: Partial<Pick<RegisteredIDE, 'name' | 'exePath' | 'iconDataUrl' | 'args'>>) => void
  onRemoveRegisteredIDE: (ideId: string) => void
  onResetStore: () => Promise<void>
  onOpenHistory?: () => void
  onAddNote?: (title: string, folderId?: string | null) => any
  onAddCard?: (title: string, date?: string | null) => any
  onAddCalendarEvent?: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => any
  isSyncing?: boolean
  syncStatus?: 'idle' | 'pending' | 'syncing' | 'synced' | 'error'
  isConfigured?: boolean
}

interface ThemeCardProps {
  themeName: ThemeName
  isSelected: boolean
  onSelect: () => void
}

const ThemeCard = ({ themeName, isSelected, onSelect }: ThemeCardProps) => {
  const theme = THEMES[themeName]
  const label = THEME_LABELS[themeName]

  return (
    <button
      className={`theme-card ${isSelected ? 'theme-card-selected' : ''}`}
      onClick={onSelect}
      style={{
        '--preview-bg': theme.background,
        '--preview-surface': theme.surface,
        '--preview-primary': theme.primary,
        '--preview-text': theme.text,
      } as React.CSSProperties}
    >
      <div className="theme-card-preview">
        <div className="theme-preview-sidebar" />
        <div className="theme-preview-content">
          <div className="theme-preview-header" />
          <div className="theme-preview-cards">
            <div className="theme-preview-card" />
            <div className="theme-preview-card" />
          </div>
        </div>
      </div>
      <div className="theme-card-label">{label}</div>
      {isSelected && (
        <div className="theme-card-check">
          <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </button>
  )
}

export const SettingsView = ({ settings, onUpdateSettings, registeredIDEs, onAddRegisteredIDE, onUpdateRegisteredIDE, onRemoveRegisteredIDE, onResetStore, onOpenHistory, onAddNote, onAddCard, onAddCalendarEvent, syncStatus, isConfigured }: SettingsViewProps) => {
  const [dataDirInfo, setDataDirInfo] = useState<{ current: string; custom: string | null } | null>(null)
  const [dataDirLoading, setDataDirLoading] = useState(false)

  // Cloud ping state
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')

  const handlePing = async () => {
    setPingStatus('testing')
    try {
      const { organonApi } = await import('../../api/organon')
      const ok = await organonApi.ping()
      setPingStatus(ok ? 'ok' : 'error')
    } catch {
      setPingStatus('error')
    }
  }

  // IDE form state
  const [showIdeForm, setShowIdeForm] = useState(false)
  const [ideFormName, setIdeFormName] = useState('')
  const [ideFormExePath, setIdeFormExePath] = useState('')
  const [ideFormArgs, setIdeFormArgs] = useState('"{folder}"')
  const [ideFormIcon, setIdeFormIcon] = useState<string | null>(null)
  const [editingIdeId, setEditingIdeId] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(null)
  const themeCarouselRef = useRef<HTMLDivElement>(null)
  const [backups, setBackups] = useState<Array<{ name: string; path: string; date: string; size: number }>>([])
  const [backupLoading, setBackupLoading] = useState(false)
  const [backupPage, setBackupPage] = useState(0)
  const BACKUPS_PER_PAGE = 3
  const [mergeLoading, setMergeLoading] = useState(false)
  const [importMarkdownLoading, setImportMarkdownLoading] = useState(false)
  const [importPlanningLoading, setImportPlanningLoading] = useState(false)

  const scrollThemes = (direction: 'left' | 'right') => {
    if (!themeCarouselRef.current) return
    const cardWidth = 180 + 16 // width + gap
    const scrollAmount = cardWidth * 3 // Scroll 3 cards por vez
    const currentScroll = themeCarouselRef.current.scrollLeft
    
    if (direction === 'left') {
      themeCarouselRef.current.scrollTo({
        left: Math.max(0, currentScroll - scrollAmount),
        behavior: 'smooth'
      })
    } else {
      themeCarouselRef.current.scrollTo({
        left: currentScroll + scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  useEffect(() => {
    const loadDataDir = async () => {
      if (isElectron()) {
        const info = await window.electronAPI.getDataDir()
        setDataDirInfo(info)
      } else {
        setDataDirInfo({
          current: settings.dataDir ?? 'localStorage',
          custom: settings.dataDir ?? null,
        })
      }
    }

    loadDataDir().catch(() => {
      setDataDirInfo(null)
    })
  }, [settings.dataDir])

  const handleSelectTheme = (themeName: ThemeName) => {
    onUpdateSettings({ themeName })
  }

  const handleSelectDataDir = async () => {
    if (!isElectron()) return
    setDataDirLoading(true)
    try {
      const selected = await window.electronAPI.selectDataDir()
      if (!selected) return
      const ok = await window.electronAPI.setDataDir(selected)
      if (ok) {
        onUpdateSettings({ dataDir: selected })
        const info = await window.electronAPI.getDataDir()
        setDataDirInfo(info)
      }
    } finally {
      setDataDirLoading(false)
    }
  }

  const handleResetDataDir = async () => {
    if (!isElectron()) {
      onUpdateSettings({ dataDir: null })
      return
    }
    setDataDirLoading(true)
    try {
      const ok = await window.electronAPI.setDataDir(null)
      if (ok) {
        onUpdateSettings({ dataDir: null })
        const info = await window.electronAPI.getDataDir()
        setDataDirInfo(info)
      }
    } finally {
      setDataDirLoading(false)
    }
  }

  const resetIdeForm = () => {
    setIdeFormName('')
    setIdeFormExePath('')
    setIdeFormArgs('"{folder}"')
    setIdeFormIcon(null)
    setEditingIdeId(null)
    setShowIdeForm(false)
  }

  const handlePickIdeExe = async () => {
    if (!isElectron()) return
    try {
      const result = await window.electronAPI.selectExe()
      if (result) {
        setIdeFormExePath(result.exePath)
        if (result.iconDataUrl) setIdeFormIcon(result.iconDataUrl)
        if (!ideFormName.trim()) {
          const filename = result.exePath.replace(/\\/g, '/').split('/').pop() ?? ''
          setIdeFormName(filename.replace(/\.exe$/i, ''))
        }
      }
    } catch { /* noop */ }
  }

  const handleSaveIde = () => {
    if (!ideFormName.trim() || !ideFormExePath.trim()) return
    if (editingIdeId) {
      onUpdateRegisteredIDE(editingIdeId, {
        name: ideFormName.trim(),
        exePath: ideFormExePath.trim(),
        args: ideFormArgs.trim() || '"{folder}"',
        iconDataUrl: ideFormIcon,
      })
    } else {
      onAddRegisteredIDE({
        name: ideFormName.trim(),
        exePath: ideFormExePath.trim(),
        args: ideFormArgs.trim() || '"{folder}"',
        iconDataUrl: ideFormIcon,
      })
    }
    resetIdeForm()
  }

  const handleEditIde = (ide: RegisteredIDE) => {
    setEditingIdeId(ide.id)
    setIdeFormName(ide.name)
    setIdeFormExePath(ide.exePath)
    setIdeFormArgs(ide.args)
    setIdeFormIcon(ide.iconDataUrl)
    setShowIdeForm(true)
  }

  const shortcuts = useMemo(() => {
    const defaults = DEFAULT_SETTINGS.keyboardShortcuts || []
    const saved = settings.keyboardShortcuts || []
    const byId = new Map(saved.map(shortcut => [shortcut.id, shortcut]))

    return defaults.map(defaultShortcut => {
      const customShortcut = byId.get(defaultShortcut.id)
      return customShortcut
        ? { ...defaultShortcut, ...customShortcut, keys: customShortcut.keys }
        : defaultShortcut
    })
  }, [settings.keyboardShortcuts])

  const formatShortcut = (keys: KeyboardShortcut['keys']) => {
    const parts: string[] = []
    if (keys.ctrl) parts.push('Ctrl')
    if (keys.shift) parts.push('Shift')
    if (keys.alt) parts.push('Alt')
    if (keys.meta) parts.push('Cmd')
    
    const keyMap: Record<string, string> = {
      ' ': 'Space',
      'ArrowUp': 'â†‘',
      'ArrowDown': 'â†“',
      'ArrowLeft': 'â†',
      'ArrowRight': 'â†’',
      'Enter': 'Enter',
      'Escape': 'Esc',
      'Tab': 'Tab',
      'Backspace': 'Backspace',
      'Delete': 'Delete',
      'Meta': 'Cmd',
    }
    const keyDisplay = keyMap[keys.key] || keys.key.toUpperCase()
    parts.push(keyDisplay)
    return parts
  }

  const handleSaveShortcut = (shortcutId: string, newKeys: KeyboardShortcut['keys']) => {
    const updated = shortcuts.map(s =>
      s.id === shortcutId ? { ...s, keys: newKeys } : s
    )
    onUpdateSettings({ keyboardShortcuts: updated })
    setEditingShortcutId(null)
  }

  const handleResetShortcut = (shortcutId: string) => {
    const defaultShortcut = DEFAULT_SETTINGS.keyboardShortcuts?.find(s => s.id === shortcutId)
    if (!defaultShortcut) return
    handleSaveShortcut(shortcutId, defaultShortcut.keys)
  }

  // Backup handlers
  useEffect(() => {
    if (isElectron()) {
      const loadBackups = async () => {
        try {
          const list = await window.electronAPI.listBackups()
          setBackups(list)
        } catch {
          // Ignora erros
        }
      }
      loadBackups()
    }
  }, [])

  const handleCreateBackup = async () => {
    if (!isElectron()) return
    setBackupLoading(true)
    try {
      const result = await window.electronAPI.createBackup()
      if (result.success) {
        const list = await window.electronAPI.listBackups()
        setBackups(list)
        setBackupPage(0)
        alert('Backup criado com sucesso!')
      } else {
        alert(`Erro ao criar backup: ${result.error}`)
      }
    } catch (error) {
      alert(`Erro ao criar backup: ${error}`)
    } finally {
      setBackupLoading(false)
    }
  }

  const handleOpenBackupsFolder = async () => {
    if (!isElectron()) return
    try {
      const opened = await window.electronAPI.openBackupsFolder()
      if (!opened) {
        alert('Nao foi possivel abrir a pasta de backups.')
      }
    } catch (error) {
      alert(`Erro ao abrir pasta de backups: ${error}`)
    }
  }

  const handleRestoreBackup = async (backupPath: string) => {
    if (!isElectron()) return
    if (!confirm('Tem certeza que deseja restaurar este backup? O estado atual serÃ¡ substituÃ­do.')) {
      return
    }
    setBackupLoading(true)
    try {
      const result = await window.electronAPI.restoreBackup(backupPath)
      if (result.success) {
        alert('Backup restaurado com sucesso! A aplicaÃ§Ã£o serÃ¡ recarregada.')
        window.location.reload()
      } else {
        alert(`Erro ao restaurar backup: ${result.error}`)
      }
    } catch (error) {
      alert(`Erro ao restaurar backup: ${error}`)
    } finally {
      setBackupLoading(false)
    }
  }

  const handleMergeFromOldPath = async () => {
    if (!isElectron()) return
    setMergeLoading(true)
    try {
      const oldPath = await window.electronAPI.selectOldDataPath()
      if (!oldPath) {
        setMergeLoading(false)
        return
      }

      const result = await window.electronAPI.mergeDataFromOldPath(oldPath)
      if (result.success) {
        alert(`Dados mesclados com sucesso! ${result.merged} itens adicionados. A aplicaÃ§Ã£o serÃ¡ recarregada.`)
        window.location.reload()
      } else {
        alert(`Erro ao mesclar dados: ${result.error}`)
      }
    } catch (error) {
      alert(`Erro ao mesclar dados: ${error}`)
    } finally {
      setMergeLoading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleImportMarkdowns = async () => {
    if (!isElectron() || !onAddNote) return
    setImportMarkdownLoading(true)
    try {
      const sourceDir = await window.electronAPI.selectOldDataPath()
      if (!sourceDir) {
        setImportMarkdownLoading(false)
        return
      }

      const importMarkdownsFn = (window.electronAPI as any).importMarkdowns
      if (typeof importMarkdownsFn !== 'function') {
        alert('API de importacao de markdowns nao disponivel. Reinicie o app para atualizar o preload.')
        return
      }

      const result = await importMarkdownsFn(sourceDir)
      if (result.success && result.files.length > 0) {
        let imported = 0
        for (const file of result.files) {
          try {
            // Extrair tÃ­tulo do nome do arquivo ou primeira linha do conteÃºdo
            const title = file.name.replace(/\.md$/, '') || 'Nota Importada'
            const note = onAddNote(title, null)
            
            // Converter markdown para HTML (ou manter como estÃ¡ se jÃ¡ for HTML)
            let content = file.content.trim()
            
            // Se nÃ£o comeÃ§ar com <, assumir que Ã© markdown e converter
            if (!content.startsWith('<')) {
              // ConversÃ£o melhorada de markdown para HTML
              // Headers
              content = content
                .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
              
              // Listas nÃ£o ordenadas
              content = content.replace(/^[\*\-\+] (.+)$/gim, '<li>$1</li>')
              content = content.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
              
              // Listas ordenadas
              content = content.replace(/^\d+\. (.+)$/gim, '<li>$1</li>')
              
              // Links
              content = content.replace(/\[([^\]]+)\]\(([^\)]+)\)/gim, '<a href="$2">$1</a>')
              
              // FormataÃ§Ã£o
              content = content
                .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/gim, '<em>$1</em>')
                .replace(/`([^`]+)`/gim, '<code>$1</code>')
              
              // Quebras de linha e parÃ¡grafos
              const lines = content.split('\n')
              const processedLines: string[] = []
              let inList = false
              
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim()
                if (!line) {
                  if (inList) {
                    processedLines.push('</ul>')
                    inList = false
                  }
                  continue
                }
                
                if (line.startsWith('<li>')) {
                  if (!inList) {
                    processedLines.push('<ul>')
                    inList = true
                  }
                  processedLines.push(line)
                } else {
                  if (inList) {
                    processedLines.push('</ul>')
                    inList = false
                  }
                  if (line.startsWith('<h') || line.startsWith('<ul') || line.startsWith('</ul')) {
                    processedLines.push(line)
                  } else {
                    processedLines.push(`<p>${line}</p>`)
                  }
                }
              }
              
              if (inList) {
                processedLines.push('</ul>')
              }
              
              content = processedLines.join('\n')
              
              // Se nÃ£o tiver nenhum HTML vÃ¡lido, envolver em parÃ¡grafo
              if (!content.includes('<h') && !content.includes('<p') && !content.includes('<ul')) {
                content = `<p>${content.replace(/\n/g, '<br>')}</p>`
              }
            }

            if (isElectron()) {
              await window.electronAPI.writeNote(note.mdPath, content)
            }
            imported++
          } catch (error) {
            console.error(`Erro ao importar ${file.name}:`, error)
          }
        }
        alert(`${imported} notas importadas com sucesso!`)
      } else if (result.files.length === 0) {
        alert('Nenhum arquivo markdown encontrado na pasta selecionada.')
      } else {
        alert(`Erro ao importar markdowns: ${result.error}`)
      }
    } catch (error) {
      alert(`Erro ao importar markdowns: ${error}`)
    } finally {
      setImportMarkdownLoading(false)
    }
  }

  const handleImportPlanningData = async () => {
    if (!isElectron() || !onAddCard || !onAddCalendarEvent) return
    setImportPlanningLoading(true)
    try {
      const storeJsonPath = await window.electronAPI.selectJsonFile()
      if (!storeJsonPath) {
        setImportPlanningLoading(false)
        return
      }
      const importResult = await window.electronAPI.importPlanningData(storeJsonPath)
      
      if (importResult.success) {
        let cardsImported = 0
        let eventsImported = 0

        // Importar cards
        if (importResult.cardsData && Array.isArray(importResult.cardsData)) {
          for (const cardData of importResult.cardsData) {
            try {
              onAddCard(cardData.title || 'Card Importado', cardData.date || null)
              cardsImported++
            } catch (error) {
              console.error('Erro ao importar card:', error)
            }
          }
        }

        // Importar eventos
        if (importResult.eventsData && Array.isArray(importResult.eventsData)) {
          for (const eventData of importResult.eventsData) {
            try {
              if (onAddCalendarEvent) {
                onAddCalendarEvent({
                  title: eventData.title || 'Evento Importado',
                  date: eventData.date || new Date().toISOString().split('T')[0],
                  description: eventData.description || '',
                  color: eventData.color || '#6366f1',
                  time: eventData.time || null,
                  recurrence: eventData.recurrence || null,
                  reminder: eventData.reminder || null,
                })
                eventsImported++
              }
            } catch (error) {
              console.error('Erro ao importar evento:', error)
            }
          }
        }

        alert(`${cardsImported} cards e ${eventsImported} eventos importados com sucesso!`)
      } else {
        alert(`Erro ao importar dados de planejamento: ${importResult.error}`)
      }
    } catch (error) {
      alert(`Erro ao importar dados de planejamento: ${error}`)
    } finally {
      setImportPlanningLoading(false)
    }
  }


  const [activeSection, setActiveSection] = useState<string>('theme')

  const settingsNavItems: Array<{ id: string; label: string; icon: ReactNode; hidden?: boolean }> = [
    {
      id: 'theme',
      label: 'Tema',
      icon: (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
          <circle cx="8" cy="8" r="5.5" />
          <path d="M8 2.5v11M2.5 8h11" />
        </svg>
      ),
    },
    {
      id: 'data',
      label: 'Dados',
      icon: (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
          <ellipse cx="8" cy="5" rx="5.5" ry="2.5" />
          <path d="M2.5 5v6c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V5" />
          <path d="M2.5 8c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5" />
        </svg>
      ),
    },
    {
      id: 'ides',
      label: 'IDEs',
      icon: (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
          <polyline points="10.5 11.5 13.5 8 10.5 4.5" />
          <polyline points="5.5 4.5 2.5 8 5.5 11.5" />
        </svg>
      ),
    },
    {
      id: 'shortcuts',
      label: 'Atalhos',
      icon: (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
          <rect x="2" y="4" width="4" height="3" rx="1" />
          <rect x="7" y="4" width="2" height="3" rx="1" />
          <rect x="10" y="4" width="4" height="3" rx="1" />
          <rect x="2" y="9" width="12" height="3" rx="1" />
        </svg>
      ),
    },
    {
      id: 'backup',
      label: 'Backup',
      icon: (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
          <path d="M13 10a5 5 0 1 0-9.9-1H2.5A2.5 2.5 0 0 0 5 13.5h8a2 2 0 0 0 0-4H13z" />
        </svg>
      ),
      hidden: !isElectron(),
    },
    {
      id: 'cloud',
      label: 'Nuvem',
      icon: (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
          <path d="M13 10a5 5 0 1 0-9.9-1H2.5A2.5 2.5 0 0 0 5 13.5h8a2 2 0 0 0 0-4H13z" />
        </svg>
      ),
    },
    {
      id: 'account',
      label: 'Conta',
      icon: (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
          <circle cx="8" cy="5.5" r="2.5" />
          <path d="M2.5 13c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5" />
        </svg>
      ),
    },
  ]

  return (
    <div className="settings-layout">
      {/* Left sidebar nav */}
      <nav className="settings-nav">
        <div className="settings-nav-title">Config</div>
        {settingsNavItems.filter(item => !item.hidden).map(item => (
          <button
            key={item.id}
            className={`settings-nav-item ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => setActiveSection(item.id)}
          >
            <span className="settings-nav-item-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="settings-content">

      <section className={`settings-section ${activeSection !== 'theme' ? 'settings-section-hidden' : ''}`}>
        <div className="settings-section-header">
          <h3>Tema</h3>
        </div>

        <div className="theme-carousel-wrapper">
          <button
            className="theme-carousel-arrow theme-carousel-arrow-left"
            onClick={() => scrollThemes('left')}
            aria-label="Temas anteriores"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          
          <div 
            className="theme-carousel"
            ref={themeCarouselRef}
          >
            <div className="theme-carousel-track">
              {(Object.keys(THEMES) as ThemeName[]).map((themeName) => (
                <ThemeCard
                  key={themeName}
                  themeName={themeName}
                  isSelected={settings.themeName === themeName}
                  onSelect={() => handleSelectTheme(themeName)}
                />
              ))}
            </div>
          </div>

          <button
            className="theme-carousel-arrow theme-carousel-arrow-right"
            onClick={() => scrollThemes('right')}
            aria-label="PrÃ³ximos temas"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </section>

      <section className={`settings-section ${activeSection !== 'data' ? 'settings-section-hidden' : ''}`}>
        <div className="settings-section-header">
          <h3>Pasta de dados</h3>
        </div>

        <div className="settings-data">
          <div className="settings-data-path">
            <label className="form-label">Caminho atual</label>
            <input
              type="text"
              value={dataDirInfo?.current ?? ''}
              readOnly
              className="form-input"
            />
            <div className="settings-data-hint">
              {dataDirInfo?.custom ? 'Pasta personalizada' : 'Pasta padrao'}
            </div>
          </div>
          <div className="settings-data-actions">
            <button className="btn btn-primary" onClick={handleSelectDataDir} disabled={dataDirLoading || !isElectron()}>
              Selecionar pasta
            </button>
            <button className="btn btn-secondary" onClick={handleResetDataDir} disabled={dataDirLoading}>
              Usar padrao
            </button>
          </div>
        </div>
      </section>

      {/* IDEs Registradas */}
      <section className={`settings-section ${activeSection !== 'ides' ? 'settings-section-hidden' : ''}`}>
        <div className="settings-section-header">
          <h3>IDEs Registradas</h3>
          <button className="btn btn-primary settings-ide-add-btn" onClick={() => { resetIdeForm(); setShowIdeForm(true) }}>
            + Adicionar IDE
          </button>
        </div>

        {showIdeForm && (
          <div className="settings-ide-form">
            <h4>{editingIdeId ? 'Editar IDE' : 'Nova IDE'}</h4>
            <div className="settings-ide-form-fields">
              <div className="settings-ide-form-row">
                {ideFormIcon && (
                  <img src={ideFormIcon} alt="" className="settings-ide-form-icon" />
                )}
                <input
                  type="text"
                  value={ideFormName}
                  onChange={e => setIdeFormName(e.target.value)}
                  placeholder="Nome (ex: VS Code)"
                  className="form-input"
                  autoFocus
                />
              </div>
              <div className="settings-ide-form-row">
                <input
                  type="text"
                  value={ideFormExePath}
                  onChange={e => setIdeFormExePath(e.target.value)}
                  placeholder="Caminho do executavel"
                  className="form-input"
                  style={{ flex: 1 }}
                />
                <button className="btn btn-secondary" onClick={handlePickIdeExe} disabled={!isElectron()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M4 4h5l2 2h5a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                  </svg>
                </button>
              </div>
              <div className="settings-ide-form-row">
                <input
                  type="text"
                  value={ideFormArgs}
                  onChange={e => setIdeFormArgs(e.target.value)}
                  placeholder='Argumentos (ex: "{folder}")'
                  className="form-input"
                  style={{ flex: 1 }}
                />
              </div>
              <div className="settings-ide-form-hint">
                Use <code>{'{folder}'}</code> como placeholder para o caminho do projeto.
              </div>
              <div className="settings-ide-form-actions">
                <button className="btn btn-primary" onClick={handleSaveIde} disabled={!ideFormName.trim() || !ideFormExePath.trim()}>
                  {editingIdeId ? 'Atualizar' : 'Salvar'}
                </button>
                <button className="btn btn-secondary" onClick={resetIdeForm}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        <div className="settings-ide-list">
          {registeredIDEs.length === 0 && !showIdeForm && (
            <div className="settings-ide-empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24" style={{ opacity: 0.3 }}>
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              <p>Nenhuma IDE registrada. Adicione uma IDE para abrir projetos diretamente.</p>
            </div>
          )}
          {registeredIDEs.map(ide => (
            <div key={ide.id} className="settings-ide-item">
              {ide.iconDataUrl ? (
                <img src={ide.iconDataUrl} alt="" className="settings-ide-item-icon" />
              ) : (
                <div className="settings-ide-item-icon-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                </div>
              )}
              <div className="settings-ide-item-info">
                <span className="settings-ide-item-name">{ide.name}</span>
                <span className="settings-ide-item-path">{ide.exePath}</span>
                <span className="settings-ide-item-args">Args: {ide.args}</span>
              </div>
              <div className="settings-ide-item-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => handleEditIde(ide)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => onRemoveRegisteredIDE(ide.id)} style={{ color: 'var(--color-danger)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Atalhos de Teclado */}
      <section className={`settings-section ${activeSection !== 'shortcuts' ? 'settings-section-hidden' : ''}`}>
        <div className="settings-section-header">
          <h3>Atalhos de Teclado</h3>
        </div>

        {editingShortcutId && (
          <div className="keyboard-shortcut-capture-overlay">
            <KeyboardShortcutCapture
              shortcut={shortcuts.find(s => s.id === editingShortcutId)!}
              onSave={(keys) => handleSaveShortcut(editingShortcutId, keys)}
              onCancel={() => setEditingShortcutId(null)}
            />
          </div>
        )}

        <div className="settings-shortcuts">
          {shortcuts.map(shortcut => {
            const keyParts = formatShortcut(shortcut.keys)
            return (
              <div key={shortcut.id} className="settings-shortcut-item">
                <div className="settings-shortcut-keys">
                  {keyParts.map((part, idx) => (
                    <span key={idx}>
                      <kbd>{part}</kbd>
                      {idx < keyParts.length - 1 && <span>+</span>}
                    </span>
                  ))}
                </div>
                <div className="settings-shortcut-description">
                  <span className="settings-shortcut-action">{shortcut.action}</span>
                  <span className="settings-shortcut-hint">{shortcut.description}</span>
                </div>
                <div className="settings-shortcut-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditingShortcutId(shortcut.id)}
                    title="Editar atalho"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleResetShortcut(shortcut.id)}
                    title="Restaurar padrÃ£o"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Dados */}
      {isElectron() && (
        <section className={`settings-section ${activeSection !== 'backup' ? 'settings-section-hidden' : ''}`}>
          <div className="settings-section-header">
            <h3>Dados e Recuperacao</h3>
          </div>

          <div className="settings-data-grid">
            <div className="settings-data-card">
              <h4>Salvar Localmente</h4>
              <p className="settings-help-text" style={{ marginBottom: 10 }}>
                Salva um backup completo local: JSONs, notas, arquivos e audios. Os 50 mais recentes sao mantidos.
              </p>

              <div className="settings-backup-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleCreateBackup}
                  disabled={backupLoading}
                >
                  {backupLoading ? 'Salvando...' : 'Salvar Localmente'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleOpenBackupsFolder}
                >
                  Abrir Pasta de Backups
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleMergeFromOldPath}
                  disabled={mergeLoading}
                >
                  {mergeLoading ? 'Processando...' : 'Recuperar Dados de Pasta Antiga'}
                </button>
                {onOpenHistory && (
                  <button
                    className="btn btn-secondary"
                    onClick={onOpenHistory}
                  >
                    Abrir Historico
                  </button>
                )}
              </div>

              {backups.length > 0 && (() => {
                const totalPages = Math.ceil(backups.length / BACKUPS_PER_PAGE)
                const paginated = backups.slice(backupPage * BACKUPS_PER_PAGE, (backupPage + 1) * BACKUPS_PER_PAGE)
                return (
                  <div className="settings-backups-list">
                    <div className="settings-backups-header">
                      <h4>Backups Disponiveis</h4>
                      <span className="settings-backups-total">{backups.length} backup(s)</span>
                    </div>
                    <div className="settings-backups-items">
                      {paginated.map((backup) => (
                        <div key={backup.path} className="settings-backup-item">
                          <div className="settings-backup-item-info">
                            <div className="settings-backup-item-name">{backup.name}</div>
                            <div className="settings-backup-item-meta">
                              {formatDate(backup.date)} • {formatFileSize(backup.size)}
                            </div>
                          </div>
                          <button
                            className="btn btn-secondary btn-xs"
                            onClick={() => handleRestoreBackup(backup.path)}
                            disabled={backupLoading}
                          >
                            Restaurar
                          </button>
                        </div>
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div className="settings-backups-pagination">
                        <button
                          className="btn btn-secondary btn-xs"
                          onClick={() => setBackupPage(p => Math.max(0, p - 1))}
                          disabled={backupPage === 0}
                        >
                          ‹
                        </button>
                        <span className="settings-backups-page-info">
                          {backupPage + 1} / {totalPages}
                        </span>
                        <button
                          className="btn btn-secondary btn-xs"
                          onClick={() => setBackupPage(p => Math.min(totalPages - 1, p + 1))}
                          disabled={backupPage >= totalPages - 1}
                        >
                          ›
                        </button>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            <div className="settings-data-card">
              <h4>Importar Dados</h4>
              <p className="settings-help-text">
                Importe markdowns como notas ou dados de planejamento de um arquivo JSON (store/planning/calendar).
              </p>
              <div className="settings-backup-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleImportMarkdowns}
                  disabled={importMarkdownLoading || !onAddNote}
                >
                  {importMarkdownLoading ? 'Importando...' : 'Importar Markdowns como Notas'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleImportPlanningData}
                  disabled={importPlanningLoading || !onAddCard || !onAddCalendarEvent}
                >
                  {importPlanningLoading ? 'Importando...' : 'Importar Dados de Planejamento'}
                </button>
              </div>
            </div>

            <div className="settings-data-card">
              <h4>Resetar Dados</h4>
              <p className="settings-reset-warning">
                Esta acao ira apagar todos os dados do aplicativo (cards, eventos, notas, etc.) e nao pode ser desfeita.
              </p>
              {!showResetConfirm ? (
                <button
                  className="btn btn-secondary settings-reset-trigger"
                  onClick={() => setShowResetConfirm(true)}
                >
                  Resetar Dados
                </button>
              ) : (
                <div className="settings-reset-confirm">
                  <p className="settings-reset-confirm-text">Tem certeza que deseja resetar todos os dados?</p>
                  <div className="settings-reset-confirm-actions">
                    <button
                      className="btn btn-secondary settings-reset-trigger"
                      onClick={async () => {
                        await onResetStore()
                        setShowResetConfirm(false)
                      }}
                    >
                      Sim, Resetar
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setShowResetConfirm(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Nuvem */}
      <section className={`settings-section ${activeSection !== 'cloud' ? 'settings-section-hidden' : ''}`}>
        <div className="settings-section-header">
          <h3>Nuvem</h3>
        </div>

        <div className="settings-data-grid">
          <div className="settings-data-card">
            <h4>Conectividade</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{
                width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                background: !isConfigured ? '#6b7280' : pingStatus === 'ok' ? '#22c55e' : pingStatus === 'error' ? '#ef4444' : '#6b7280',
              }} />
              <span className="settings-help-text" style={{ margin: 0 }}>
                {!isConfigured
                  ? 'API não configurada (verifique o .env)'
                  : pingStatus === 'ok' ? 'Conectado à API Organon'
                  : pingStatus === 'error' ? 'Sem conexão com a API'
                  : pingStatus === 'testing' ? 'Testando...'
                  : 'Clique em "Testar" para verificar'}
              </span>
            </div>
            <p className="settings-help-text" style={{ marginBottom: 12 }}>
              API: {settings.apiBaseUrl || 'https://reolicodeapi.com'}
            </p>
            <button className="btn btn-secondary" onClick={handlePing} disabled={pingStatus === 'testing' || !isConfigured}>
              {pingStatus === 'testing' ? 'Testando...' : 'Testar conexão'}
            </button>
          </div>

          <div className="settings-data-card">
            <h4>Sincronização automática</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{
                width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                background: syncStatus === 'synced' ? '#22c55e' : syncStatus === 'error' ? '#ef4444' : syncStatus === 'syncing' || syncStatus === 'pending' ? '#f97316' : '#6b7280',
              }} />
              <span className="settings-help-text" style={{ margin: 0 }}>
                {syncStatus === 'idle' || !syncStatus ? (isConfigured ? 'Aguardando alterações' : 'Inativo') : ''}
                {syncStatus === 'pending' && 'Aguardando 10s para sincronizar...'}
                {syncStatus === 'syncing' && 'Sincronizando...'}
                {syncStatus === 'synced' && 'Sincronizado com sucesso'}
                {syncStatus === 'error' && 'Erro na última sincronização'}
              </span>
            </div>
            <p className="settings-help-text">
              Dados são enviados automaticamente 10 segundos após cada alteração.
            </p>
          </div>
        </div>
      </section>

      {/* Conta */}
      <section className={`settings-section ${activeSection !== 'account' ? 'settings-section-hidden' : ''}`}>
        <div className="settings-section-header">
          <h3>Conta</h3>
        </div>

        <div className="settings-data-grid">
          <div className="settings-data-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--color-primary, #6366f1)', opacity: 0.15,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="24" height="24" style={{ opacity: 0.6 }}>
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Organon Personal</div>
                <div className="settings-help-text" style={{ margin: 0 }}>Modo local + sincronização via API</div>
              </div>
            </div>

            <p className="settings-help-text" style={{ marginBottom: 14 }}>
              Login com conta Google e criação de perfil pessoal chegam em breve.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-secondary" disabled style={{ opacity: 0.45, cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M19.6 10.2c0-.7-.1-1.4-.2-2H10v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4"/><path d="M10 20c2.7 0 5-0.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H1.1v2.6A10 10 0 0 0 10 20z" fill="#34A853"/><path d="M4.4 12c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V5.4H1.1A10 10 0 0 0 0 10c0 1.6.4 3.2 1.1 4.6L4.4 12z" fill="#FBBC05"/><path d="M10 3.9c1.5 0 2.8.5 3.8 1.5L16.7 3C15 1.4 12.7.5 10 .5A10 10 0 0 0 1.1 5.5l3.3 2.5C5.2 5.6 7.4 3.9 10 3.9z" fill="#EA4335"/></svg>
                Entrar com Google
                <span style={{ fontSize: 10, background: 'var(--color-surface-2, rgba(255,255,255,.1))', padding: '1px 6px', borderRadius: 4 }}>Em breve</span>
              </button>
              <button className="btn btn-secondary" disabled style={{ opacity: 0.45, cursor: 'not-allowed' }}>
                Criar conta
                <span style={{ fontSize: 10, marginLeft: 6, background: 'var(--color-surface-2, rgba(255,255,255,.1))', padding: '1px 6px', borderRadius: 4 }}>Em breve</span>
              </button>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  )
}


