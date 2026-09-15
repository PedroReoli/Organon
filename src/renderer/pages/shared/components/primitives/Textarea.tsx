import React, { forwardRef } from 'react'
import './primitives.css'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
  fullWidth?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { error = false, fullWidth = false, className = '', ...rest },
  ref,
) {
  const classes = [
    'ds-textarea',
    error ? 'is-error' : '',
    fullWidth ? 'ds-textarea--full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <textarea ref={ref} className={classes} {...rest} />
})
