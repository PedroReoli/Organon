import React, { forwardRef } from 'react'
import './primitives.css'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  fullWidth?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error = false, fullWidth = false, className = '', ...rest },
  ref,
) {
  const classes = [
    'ds-input',
    error ? 'is-error' : '',
    fullWidth ? 'ds-input--full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <input ref={ref} className={classes} {...rest} />
})
