import React, { forwardRef } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import './primitives-radix.css'

/**
 * Dialog (modal) wrapper sobre Radix Dialog.
 *
 * Uso:
 *   <Dialog.Root>
 *     <Dialog.Trigger asChild><Button>Abrir</Button></Dialog.Trigger>
 *     <Dialog.Portal>
 *       <Dialog.Overlay />
 *       <Dialog.Content>
 *         <Dialog.Title>Titulo</Dialog.Title>
 *         <Dialog.Description>Descricao</Dialog.Description>
 *         ...
 *         <Dialog.Close>Fechar</Dialog.Close>
 *       </Dialog.Content>
 *     </Dialog.Portal>
 *   </Dialog.Root>
 *
 * Definido no upgrade 20.
 */

const Root = RadixDialog.Root
const Trigger = RadixDialog.Trigger
const Portal = RadixDialog.Portal
const Close = RadixDialog.Close

const Overlay = forwardRef<
  React.ElementRef<typeof RadixDialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Overlay>
>(function DialogOverlay({ className = '', ...props }, ref) {
  return <RadixDialog.Overlay ref={ref} className={`ds-dialog-overlay ${className}`.trim()} {...props} />
})

const Content = forwardRef<
  React.ElementRef<typeof RadixDialog.Content>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Content>
>(function DialogContent({ className = '', children, ...props }, ref) {
  return (
    <RadixDialog.Content ref={ref} className={`ds-dialog-content ${className}`.trim()} {...props}>
      {children}
    </RadixDialog.Content>
  )
})

const Title = forwardRef<
  React.ElementRef<typeof RadixDialog.Title>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Title>
>(function DialogTitle({ className = '', ...props }, ref) {
  return <RadixDialog.Title ref={ref} className={`ds-dialog-title ${className}`.trim()} {...props} />
})

const Description = forwardRef<
  React.ElementRef<typeof RadixDialog.Description>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Description>
>(function DialogDescription({ className = '', ...props }, ref) {
  return <RadixDialog.Description ref={ref} className={`ds-dialog-description ${className}`.trim()} {...props} />
})

export const Dialog = { Root, Trigger, Portal, Overlay, Content, Title, Description, Close }
