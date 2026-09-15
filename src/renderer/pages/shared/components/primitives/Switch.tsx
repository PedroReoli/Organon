import React, { forwardRef } from 'react'
import * as RadixSwitch from '@radix-ui/react-switch'
import './primitives-radix.css'

/**
 * Switch wrapper sobre Radix Switch.
 *
 * Uso:
 *   <Switch checked={value} onCheckedChange={setValue} />
 *
 * Definido no upgrade 20.
 */
export const Switch = forwardRef<
  React.ElementRef<typeof RadixSwitch.Root>,
  React.ComponentPropsWithoutRef<typeof RadixSwitch.Root>
>(function Switch({ className = '', ...props }, ref) {
  return (
    <RadixSwitch.Root ref={ref} className={`ds-switch ${className}`.trim()} {...props}>
      <RadixSwitch.Thumb className="ds-switch-thumb" />
    </RadixSwitch.Root>
  )
})
