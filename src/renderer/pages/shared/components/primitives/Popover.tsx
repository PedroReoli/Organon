import React, { forwardRef } from 'react'
import * as RadixPopover from '@radix-ui/react-popover'
import './primitives-radix.css'

/**
 * Popover wrapper sobre Radix Popover.
 *
 * Uso:
 *   <Popover.Root>
 *     <Popover.Trigger asChild><IconButton aria-label="..."><Icon /></IconButton></Popover.Trigger>
 *     <Popover.Portal>
 *       <Popover.Content>...</Popover.Content>
 *     </Popover.Portal>
 *   </Popover.Root>
 *
 * Definido no upgrade 20.
 */

const Root = RadixPopover.Root
const Trigger = RadixPopover.Trigger
const Portal = RadixPopover.Portal
const Close = RadixPopover.Close
const Anchor = RadixPopover.Anchor

const Content = forwardRef<
  React.ElementRef<typeof RadixPopover.Content>,
  React.ComponentPropsWithoutRef<typeof RadixPopover.Content>
>(function PopoverContent({ className = '', sideOffset = 6, ...props }, ref) {
  return (
    <RadixPopover.Content
      ref={ref}
      sideOffset={sideOffset}
      className={`ds-popover-content ${className}`.trim()}
      {...props}
    />
  )
})

const Arrow = forwardRef<
  React.ElementRef<typeof RadixPopover.Arrow>,
  React.ComponentPropsWithoutRef<typeof RadixPopover.Arrow>
>(function PopoverArrow({ className = '', ...props }, ref) {
  return <RadixPopover.Arrow ref={ref} className={`ds-popover-arrow ${className}`.trim()} {...props} />
})

export const Popover = { Root, Trigger, Portal, Anchor, Content, Arrow, Close }
