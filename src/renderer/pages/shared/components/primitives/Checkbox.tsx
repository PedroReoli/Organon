import React, { forwardRef } from 'react'
import * as RadixCheckbox from '@radix-ui/react-checkbox'
import './primitives-radix.css'

/**
 * Checkbox wrapper sobre Radix Checkbox.
 *
 * Uso:
 *   <Checkbox checked={value} onCheckedChange={setValue} />
 *   <Checkbox checked="indeterminate" />
 *
 * Definido no upgrade 20.
 */
export const Checkbox = forwardRef<
  React.ElementRef<typeof RadixCheckbox.Root>,
  React.ComponentPropsWithoutRef<typeof RadixCheckbox.Root>
>(function Checkbox({ className = '', ...props }, ref) {
  return (
    <RadixCheckbox.Root ref={ref} className={`ds-checkbox ${className}`.trim()} {...props}>
      <RadixCheckbox.Indicator className="ds-checkbox-indicator">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  )
})
