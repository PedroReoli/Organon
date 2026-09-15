import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import './inputs.css'

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string
  onChange?: (value: string) => void
  /** debounce em ms para o callback. 0 = sem debounce */
  debounceMs?: number
  /** mostrar botao de limpar quando ha texto */
  clearable?: boolean
  fullWidth?: boolean
  /** placeholder default em portugues */
  placeholder?: string
}

/**
 * Input de busca padronizado com debounce e botao de limpar.
 *
 * Definido no upgrade 19. Substitui inputs de busca custom em Notes,
 * CRM, Shortcuts, Clipboard, etc.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    value,
    onChange,
    debounceMs = 0,
    clearable = true,
    fullWidth = false,
    placeholder = 'Buscar...',
    className = '',
    ...rest
  },
  ref,
) {
  const [internal, setInternal] = useState<string>(value ?? '')
  const timerRef = useRef<number | null>(null)
  const innerRef = useRef<HTMLInputElement | null>(null)

  // sincroniza com prop externa
  useEffect(() => {
    if (value != null && value !== internal) setInternal(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const emit = useCallback(
    (next: string) => {
      if (debounceMs > 0) {
        if (timerRef.current) window.clearTimeout(timerRef.current)
        timerRef.current = window.setTimeout(() => onChange?.(next), debounceMs)
      } else {
        onChange?.(next)
      }
    },
    [debounceMs, onChange],
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternal(e.target.value)
    emit(e.target.value)
  }

  const handleClear = () => {
    setInternal('')
    emit('')
    innerRef.current?.focus()
  }

  const setRefs = (el: HTMLInputElement | null) => {
    innerRef.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el
  }

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
  }, [])

  const classes = ['ds-search', fullWidth ? 'ds-search--full' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      <span className="ds-search-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        ref={setRefs}
        type="text"
        className="ds-search-input"
        value={internal}
        onChange={handleChange}
        placeholder={placeholder}
        {...rest}
      />
      {clearable && internal && (
        <button
          type="button"
          className="ds-search-clear"
          onClick={handleClear}
          aria-label="Limpar busca"
        >
          ×
        </button>
      )}
    </div>
  )
})
