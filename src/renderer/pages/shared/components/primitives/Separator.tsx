import React, { forwardRef } from 'react'
import * as RadixSeparator from '@radix-ui/react-separator'
import './primitives-radix.css'

/**
 * Separator wrapper sobre Radix Separator (mais semantico que Divider).
 *
 * Definido no upgrade 20. Use Divider quando precisar so do estilo,
 * use Separator quando quiser semantica ARIA correta.
 */
export const Separator = forwardRef<
  React.ElementRef<typeof RadixSeparator.Root>,
  React.ComponentPropsWithoutRef<typeof RadixSeparator.Root>
>(function Separator({ className = '', orientation = 'horizontal', decorative = true, ...props }, ref) {
  return (
    <RadixSeparator.Root
      ref={ref}
      orientation={orientation}
      decorative={decorative}
      className={`ds-separator ds-separator--${orientation} ${className}`.trim()}
      {...props}
    />
  )
})
