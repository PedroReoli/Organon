import React, { useRef, useEffect } from 'react'
import {
  Type,
  Maximize2,
  Minimize2,
  Lock,
  Unlock,
  History,
  Download,
  Trash2,
  PanelTop,
} from 'lucide-react'

export type NoteFontFamily = 'sans' | 'serif' | 'mono'

interface PageCustomizationMenuProps {
  isOpen: boolean
  onClose: () => void
  fontFamily: NoteFontFamily
  onChangeFontFamily: (font: NoteFontFamily) => void
  isSmallText: boolean
  onToggleSmallText: () => void
  isFullWidth: boolean
  onToggleFullWidth: () => void
  showFixedToolbar?: boolean
  onToggleFixedToolbar?: () => void
  isLocked: boolean
  onToggleLock: () => void
  onOpenHistory: () => void
  onOpenExport: () => void
  onDelete: () => void
}

export const PageCustomizationMenu: React.FC<PageCustomizationMenuProps> = ({
  isOpen,
  onClose,
  fontFamily,
  onChangeFontFamily,
  isSmallText,
  onToggleSmallText,
  isFullWidth,
  onToggleFullWidth,
  showFixedToolbar = false,
  onToggleFixedToolbar,
  isLocked,
  onToggleLock,
  onOpenHistory,
  onOpenExport,
  onDelete,
}) => {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      style={{
        background: 'var(--color-surface, #181f33)',
        borderColor: 'var(--color-border, rgba(255,255,255,0.12))',
        boxShadow: '0 16px 36px -8px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
      }}
      className="absolute right-0 top-9 w-64 rounded-xl border p-2 text-xs z-50 animate-in fade-in zoom-in-95 duration-100 select-none text-[var(--color-text)]"
    >
      {/* 1. SEÇÃO DE TIPOGRAFIA (SANS, SERIF, MONO) */}
      <div className="px-2 py-1.5 text-[11px] font-bold tracking-wider uppercase text-[var(--color-text-muted)]">
        Estilo de Fonte
      </div>
      <div className="grid grid-cols-3 gap-1.5 p-1 mb-2 bg-white/[0.03] rounded-lg border border-white/5">
        {/* Sans */}
        <button
          type="button"
          onClick={() => onChangeFontFamily('sans')}
          className={`flex flex-col items-center py-2 px-1 rounded-md transition-all cursor-pointer ${
            fontFamily === 'sans'
              ? 'bg-[var(--color-primary)] text-white shadow-xs font-bold'
              : 'hover:bg-white/5 text-[var(--color-text-muted)] hover:text-white font-sans'
          }`}
        >
          <span className="text-base font-normal">Ag</span>
          <span className="text-[10px] mt-0.5">Padrão</span>
        </button>

        {/* Serif */}
        <button
          type="button"
          onClick={() => onChangeFontFamily('serif')}
          className={`flex flex-col items-center py-2 px-1 rounded-md transition-all cursor-pointer ${
            fontFamily === 'serif'
              ? 'bg-[var(--color-primary)] text-white shadow-xs font-bold'
              : 'hover:bg-white/5 text-[var(--color-text-muted)] hover:text-white'
          }`}
          style={{ fontFamily: 'Georgia, Cambria, serif' }}
        >
          <span className="text-base font-normal">Ag</span>
          <span className="text-[10px] mt-0.5">Serif</span>
        </button>

        {/* Mono */}
        <button
          type="button"
          onClick={() => onChangeFontFamily('mono')}
          className={`flex flex-col items-center py-2 px-1 rounded-md transition-all cursor-pointer ${
            fontFamily === 'mono'
              ? 'bg-[var(--color-primary)] text-white shadow-xs font-bold'
              : 'hover:bg-white/5 text-[var(--color-text-muted)] hover:text-white'
          }`}
          style={{ fontFamily: 'monospace' }}
        >
          <span className="text-base font-normal">Ag</span>
          <span className="text-[10px] mt-0.5">Mono</span>
        </button>
      </div>

      <div className="h-px bg-white/5 my-1.5" />

      {/* 2. TOGGLES: SMALL TEXT & FULL WIDTH */}
      <div className="space-y-0.5">
        <div
          onClick={onToggleSmallText}
          className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
        >
          <span className="font-medium flex items-center gap-2">
            <Type className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            Texto Pequeno
          </span>
          <div
            className={`w-7 h-4 rounded-full transition-colors relative ${
              isSmallText ? 'bg-[var(--color-primary)]' : 'bg-white/20'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white transition-transform absolute top-0.5 ${
                isSmallText ? 'left-3.5' : 'left-0.5'
              }`}
            />
          </div>
        </div>

        <div
          onClick={onToggleFullWidth}
          className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
        >
          <span className="font-medium flex items-center gap-2">
            {isFullWidth ? (
              <Minimize2 className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            )}
            Largura Total
          </span>
          <div
            className={`w-7 h-4 rounded-full transition-colors relative ${
              isFullWidth ? 'bg-[var(--color-primary)]' : 'bg-white/20'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white transition-transform absolute top-0.5 ${
                isFullWidth ? 'left-3.5' : 'left-0.5'
              }`}
            />
          </div>
        </div>

        {onToggleFixedToolbar && (
          <div
            onClick={onToggleFixedToolbar}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
          >
            <span className="font-medium flex items-center gap-2">
              <PanelTop className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              Barra Superior Fixa
            </span>
            <div
              className={`w-7 h-4 rounded-full transition-colors relative ${
                showFixedToolbar ? 'bg-[var(--color-primary)]' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-white transition-transform absolute top-0.5 ${
                  showFixedToolbar ? 'left-3.5' : 'left-0.5'
                }`}
              />
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-white/5 my-1.5" />

      {/* 3. AÇÕES RÁPIDAS */}
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => {
            onToggleLock()
            onClose()
          }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-left"
        >
          {isLocked ? (
            <>
              <Unlock className="w-3.5 h-3.5 text-amber-400" />
              <span>Destrancar Página</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <span>Trancar Página</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenHistory()
            onClose()
          }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-left"
        >
          <History className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          <span>Histórico de Revisões</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenExport()
            onClose()
          }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-left"
        >
          <Download className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
          <span>Exportar (.md, PDF)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onDelete()
            onClose()
          }}
          disabled={isLocked}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-left disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Mover para Lixeira</span>
        </button>
      </div>
    </div>
  )
}
