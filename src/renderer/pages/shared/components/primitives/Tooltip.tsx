import React, { forwardRef } from 'react'
import * as RadixTooltip from '@radix-ui/react-tooltip'
import './primitives-radix.css'

/**
 * Tooltip wrapper sobre Radix Tooltip.
 *
 * Uso simples (com componente combinado):
 *   <Tooltip label="Excluir">
 *     <IconButton aria-label="Excluir"><Icon /></IconButton>
 *   </Tooltip>
 *
 * Uso composto (controle total):
 *   <Tooltip.Provider>
 *     <Tooltip.Root>
 *       <Tooltip.Trigger>...</Tooltip.Trigger>
 *       <Tooltip.Portal>
 *         <Tooltip.Content>...</Tooltip.Content>
 *       </Tooltip.Portal>
 *     </Tooltip.Root>
 *   </Tooltip.Provider>
 *
 * Definido no upgrade 20.
 */

const Provider = RadixTooltip.Provider
const Root = RadixTooltip.Root
const Trigger = RadixTooltip.Trigger
const Portal = RadixTooltip.Portal

const Content = forwardRef<
  React.ElementRef<typeof RadixTooltip.Content>,
  React.ComponentPropsWithoutRef<typeof RadixTooltip.Content>
>(function TooltipContent({ className = '', sideOffset = 4, ...props }, ref) {
  return (
    <RadixTooltip.Content
      ref={ref}
      sideOffset={sideOffset}
      className={`ds-tooltip-content ${className}`.trim()}
      {...props}
    />
  )
})

const Arrow = forwardRef<
  React.ElementRef<typeof RadixTooltip.Arrow>,
  React.ComponentPropsWithoutRef<typeof RadixTooltip.Arrow>
>(function TooltipArrow({ className = '', ...props }, ref) {
  return <RadixTooltip.Arrow ref={ref} className={`ds-tooltip-arrow ${className}`.trim()} {...props} />
})

interface SimpleTooltipProps {
  label: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  delayDuration?: number
  children: React.ReactElement
}

/**
 * Wrapper simplificado: aceita filho unico + label.
 * Para casos complexos, use Tooltip.Root etc diretamente.
 */
function SimpleTooltip({ label, side = 'top', delayDuration = 400, children }: SimpleTooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={delayDuration}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content side={side} sideOffset={4} className="ds-tooltip-content">
            {label}
            <RadixTooltip.Arrow className="ds-tooltip-arrow" />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  )
}

export const Tooltip = Object.assign(SimpleTooltip, {
  Provider,
  Root,
  Trigger,
  Portal,
  Content,
  Arrow,
})
