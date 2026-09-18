import React, { useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  placeholder?: string
  shortcut?: string
  isLoading?: boolean
  autoFocus?: boolean
  className?: string
  style?: React.CSSProperties
  disabled?: boolean
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Buscar...',
  shortcut,
  isLoading = false,
  autoFocus = false,
  className = '',
  style,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClear = () => {
    onChange('')
    onClear?.()
    inputRef.current?.focus()
  }

  return (
    <div
      className={`search-input-wrapper ${className}`}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '12px',
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
          color: 'var(--color-text-muted, #9ca3af)',
        }}
      >
        {isLoading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Search size={16} />
        )}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '8px 36px 8px 36px',
          fontSize: '13px',
          borderRadius: '8px',
          border: '1px solid var(--color-border, rgba(255, 255, 255, 0.1))',
          background: 'var(--color-surface, rgba(255, 255, 255, 0.04))',
          color: 'var(--color-text, #ffffff)',
          outline: 'none',
          transition: 'all 0.2s ease',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'var(--color-primary, #6366f1)'
          e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-primary-subtle, rgba(99, 102, 241, 0.2))'
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--color-border, rgba(255, 255, 255, 0.1))'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />

      <div
        style={{
          position: 'absolute',
          right: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-muted, #9ca3af)',
              cursor: 'pointer',
              padding: 0,
            }}
            aria-label="Limpar busca"
          >
            <X size={14} />
          </button>
        ) : shortcut ? (
          <kbd
            style={{
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 600,
              borderRadius: '4px',
              border: '1px solid var(--color-border, rgba(255, 255, 255, 0.15))',
              background: 'var(--color-background-tertiary, rgba(255, 255, 255, 0.06))',
              color: 'var(--color-text-muted, #9ca3af)',
              letterSpacing: '0.5px',
            }}
          >
            {shortcut}
          </kbd>
        ) : null}
      </div>
    </div>
  )
}
